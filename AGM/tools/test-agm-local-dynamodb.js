"use strict";

const assert = require("node:assert/strict");
const {
  AGM_LOCAL_CONFIG,
  applyAgmLocalEnvironment,
  createAgmLocalClient,
  ensureAgmTables
} = require("./agm-dynamodb-local");

applyAgmLocalEnvironment();

const repository = require("../backend/lib/repository");
const { questionsFor } = require("../backend/lib/scoring");
const { createCreateAssessmentHandler } = require("../backend/createAssessment");
const { createListAssessmentsHandler } = require("../backend/listAssessments");
const { createGetAssessmentHandler } = require("../backend/getAssessment");
const { createSaveAssessmentHandler } = require("../backend/saveAssessment");
const { createSubmitAssessmentHandler } = require("../backend/submitAssessment");
const { createReviewAssessmentHandler } = require("../backend/reviewAssessment");
const { createReopenAssessmentHandler } = require("../backend/reopenAssessment");
const { createGetAssessmentHistoryHandler } = require("../backend/getAssessmentHistory");

function claims(role) {
  if (role === "reviewer") {
    return {
      sub: "agm-local-hod",
      name: "AGM HOD Reviewer",
      "custom:department_id": "corp-monitoring",
      "cognito:groups": ["agm-app-users", "agm-reviewers"]
    };
  }
  return {
    sub: "agm-local-assessor",
    name: "Corporate Monitoring Assessor",
    "custom:department_id": "corp-monitoring",
    "cognito:groups": ["agm-app-users", "agm-assessors"]
  };
}

function event(role, { body, id } = {}) {
  return {
    requestContext: { authorizer: { jwt: { claims: claims(role) } } },
    pathParameters: id ? { assessmentId: id } : {},
    body: body === undefined ? undefined : JSON.stringify(body)
  };
}

function payload(company) {
  const answers = Object.fromEntries(questionsFor("Virtual").map(question => [
    question.key,
    question.type === "points" ? "2" : "Y"
  ]));
  return {
    fields: {
      company,
      fye: "2025-12-31",
      type: "AGM",
      date: "2026-08-28",
      time: "10:00",
      mode: "Virtual",
      hybrid: "No",
      venue: "Kuala Lumpur broadcast venue",
      notice: "2026-07-20",
      attendees: "120",
      ended: "12:00",
      analyst: "Corporate Monitoring Assessor",
      voting: "Virtual poll",
      mswg: "Test question",
      governance: "Test governance note",
      remarks: "Created by the real DynamoDB integration test."
    },
    answers,
    comments: {}
  };
}

function bodyOf(response) {
  return JSON.parse(response.body);
}

function expect(response, status, label) {
  assert.equal(response.statusCode, status, `${label}: ${response.body}`);
  return bodyOf(response);
}

async function main() {
  const setupClient = createAgmLocalClient();
  try {
    await ensureAgmTables(setupClient);
  } finally {
    setupClient.destroy();
  }
  repository.resetForTests();

  const id = `AGM-LOCAL-${Date.now().toString(36)}`;
  const create = createCreateAssessmentHandler({ repository, randomUUID: () => id, now: () => new Date("2026-08-28T02:00:00.000Z") });
  const list = createListAssessmentsHandler({ repository });
  const get = createGetAssessmentHandler({ repository });
  const save = createSaveAssessmentHandler({ repository, now: () => new Date("2026-08-28T02:05:00.000Z") });
  const submit = createSubmitAssessmentHandler({ repository, now: () => new Date("2026-08-28T02:10:00.000Z") });
  const review = createReviewAssessmentHandler({ repository, now: () => new Date("2026-08-28T02:15:00.000Z") });
  const reopen = createReopenAssessmentHandler({ repository, now: () => new Date("2026-08-28T02:20:00.000Z") });
  const history = createGetAssessmentHistoryHandler({ repository });

  let result = expect(await create(event("assessor", { body: payload(`AGM Integration ${id}`) })), 201, "create");
  assert.equal(result.item.status, "DRAFT");
  assert.equal(result.item.scores.percentage, 96);
  console.log(`PASS create draft: ${id}`);

  result = expect(await list(event("assessor")), 200, "list");
  assert.ok(result.items.some(item => item.assessment_id === id));
  console.log("PASS list/retrieve records");

  const editedPayload = payload(`AGM Integration ${id}`);
  editedPayload.fields.remarks = "Saved correction before submission.";
  result = expect(await save(event("assessor", { id, body: { ...editedPayload, record_version: 1 } })), 200, "save");
  assert.equal(result.item.record_version, 2);
  console.log("PASS save draft with optimistic version");

  result = expect(await submit(event("assessor", { id, body: { record_version: 2 } })), 200, "submit");
  assert.equal(result.item.status, "SUBMITTED");
  console.log("PASS submit and lock assessor editing");

  const locked = await save(event("assessor", { id, body: { ...editedPayload, record_version: 3 } }));
  assert.equal(locked.statusCode, 409);

  result = expect(await review(event("reviewer", { id, body: { record_version: 3, decision: "approve", comment: "Approved for record." } })), 200, "approve");
  assert.equal(result.item.status, "APPROVED");
  assert.equal(result.item.approved_snapshot.scores.percentage, 96);
  console.log("PASS HOD approval, lock, and report snapshot");

  result = expect(await reopen(event("reviewer", { id, body: { record_version: 4, reason: "Correct the attendance figure." } })), 200, "reopen");
  assert.equal(result.item.status, "RETURNED");
  assert.equal(result.item.revision, 2);
  assert.ok(result.item.approved_snapshot);
  console.log("PASS reopen as a new revision without losing the approved snapshot");

  result = expect(await get(event("assessor", { id })), 200, "get");
  assert.equal(result.permissions.can_edit, true);
  result = expect(await history(event("reviewer", { id })), 200, "history");
  assert.deepEqual(result.items.map(item => item.event_type), ["CREATED", "SAVED", "SUBMITTED", "APPROVED", "REOPENED"]);
  console.log("PASS immutable workflow history");

  console.log(`SUCCESS real AGM DynamoDB workflow at ${AGM_LOCAL_CONFIG.endpoint}`);
  console.log(`Assessment ID: ${id}`);
  console.log(`Tables: ${AGM_LOCAL_CONFIG.assessmentTableName}, ${AGM_LOCAL_CONFIG.historyTableName}`);
}

main().catch(error => {
  console.error("FAIL real AGM DynamoDB integration:", error);
  process.exitCode = 1;
});
