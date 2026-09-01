"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const workflow = require("../backend/lib/workflow");
const { questionsFor } = require("../backend/lib/scoring");
const { createCreateAssessmentHandler } = require("../backend/createAssessment");

function identity(role = "assessor", userId = "assessor-1") {
  return {
    userId,
    username: role === "reviewer" ? "HOD Reviewer" : "CM Assessor",
    departmentId: "corp-monitoring",
    canAssess: role === "assessor",
    canReview: role === "reviewer"
  };
}

function claims(role = "assessor") {
  return {
    sub: role === "reviewer" ? "hod-1" : "assessor-1",
    name: role === "reviewer" ? "HOD Reviewer" : "CM Assessor",
    "custom:department_id": "corp-monitoring",
    "cognito:groups": role === "reviewer"
      ? ["agm-app-users", "agm-reviewers"]
      : ["agm-app-users", "agm-assessors"]
  };
}

function payload({ complete = true, mode = "Physical" } = {}) {
  const answers = complete ? Object.fromEntries(questionsFor(mode).map(question => [
    question.key,
    question.type === "points" ? "3" : "Y"
  ])) : {};
  return {
    fields: {
      company: "Test Berhad",
      fye: "2025-12-31",
      type: "AGM",
      date: "2026-05-30",
      time: "10:00",
      mode,
      hybrid: "No",
      venue: "Kuala Lumpur",
      notice: "2026-04-20",
      attendees: "100",
      analyst: "CM Assessor",
      remarks: "Test"
    },
    answers,
    comments: {}
  };
}

test("AGM create requires verified app claims and persists server-controlled identity/status", async () => {
  let saved;
  const handler = createCreateAssessmentHandler({
    repository: { createAssessment: async item => { saved = item; } },
    randomUUID: () => "AGM-001",
    now: () => new Date("2026-08-28T00:00:00.000Z")
  });
  const denied = await handler({ body: JSON.stringify(payload()) });
  assert.equal(denied.statusCode, 401);

  const response = await handler({
    requestContext: { authorizer: { jwt: { claims: claims() } } },
    body: JSON.stringify({ ...payload(), status: "APPROVED", created_by: "forged" })
  });
  assert.equal(response.statusCode, 201);
  assert.equal(saved.assessment_id, "AGM-001");
  assert.equal(saved.status, "DRAFT");
  assert.equal(saved.created_by, "assessor-1");
  assert.equal(saved.scores.percentage, 100);
});

test("an incomplete AGM draft cannot be submitted", () => {
  const created = workflow.createAssessment({
    body: payload({ complete: false }), identity: identity(), at: "2026-08-28T00:00:00.000Z", assessmentId: "AGM-002"
  }).item;
  assert.throws(() => workflow.submitAssessment({
    existing: created,
    body: { record_version: 1 },
    identity: identity(),
    at: "2026-08-28T00:05:00.000Z"
  }), error => error.code === "INCOMPLETE_ASSESSMENT");
});

test("only the original assessor can edit or submit a draft", () => {
  const created = workflow.createAssessment({
    body: payload(), identity: identity(), at: "2026-08-28T00:00:00.000Z", assessmentId: "AGM-003"
  }).item;
  assert.throws(() => workflow.saveAssessment({
    existing: created,
    body: { ...payload(), record_version: 1 },
    identity: identity("assessor", "assessor-2"),
    at: "2026-08-28T00:05:00.000Z"
  }), error => error.code === "CREATOR_REQUIRED");
});

test("submission locks editing and HOD approval creates a report snapshot", () => {
  const created = workflow.createAssessment({
    body: payload(), identity: identity(), at: "2026-08-28T00:00:00.000Z", assessmentId: "AGM-004"
  }).item;
  const submitted = workflow.submitAssessment({
    existing: created, body: { record_version: 1 }, identity: identity(), at: "2026-08-28T00:05:00.000Z"
  }).item;
  assert.equal(submitted.status, "SUBMITTED");
  assert.throws(() => workflow.saveAssessment({
    existing: submitted,
    body: { ...payload(), record_version: 2 },
    identity: identity(),
    at: "2026-08-28T00:06:00.000Z"
  }), error => error.code === "ASSESSMENT_LOCKED");

  const approved = workflow.reviewAssessment({
    existing: submitted,
    body: { record_version: 2, decision: "approve", comment: "Approved" },
    identity: identity("reviewer", "hod-1"),
    at: "2026-08-28T00:10:00.000Z"
  }).item;
  assert.equal(approved.status, "APPROVED");
  assert.equal(approved.approved_snapshot.scores.percentage, 100);
  assert.equal(approved.approved_snapshot.approved_by, "hod-1");
});

test("reopening preserves the approved snapshot and starts a new revision", () => {
  const created = workflow.createAssessment({
    body: payload(), identity: identity(), at: "2026-08-28T00:00:00.000Z", assessmentId: "AGM-005"
  }).item;
  const submitted = workflow.submitAssessment({ existing: created, body: { record_version: 1 }, identity: identity(), at: "2026-08-28T00:05:00.000Z" }).item;
  const approved = workflow.reviewAssessment({ existing: submitted, body: { record_version: 2, decision: "approve", comment: "Approved" }, identity: identity("reviewer"), at: "2026-08-28T00:10:00.000Z" }).item;
  const reopened = workflow.reopenAssessment({ existing: approved, body: { record_version: 3, reason: "Correction required" }, identity: identity("reviewer"), at: "2026-08-28T00:15:00.000Z" }).item;
  assert.equal(reopened.status, "RETURNED");
  assert.equal(reopened.revision, 2);
  assert.equal(reopened.approved_snapshot.revision, 1);
  assert.equal(reopened.approved_snapshot.status, "APPROVED");
});

test("AGM frontend includes persistence and record retrieval assets", () => {
  const root = path.join(__dirname, "..", "frontend");
  for (const file of ["agm-config.js", "agm-api-client.js", "assessment-persistence.js", "records.html", "records.js"]) {
    assert.equal(fs.existsSync(path.join(root, file)), true, `${file} is missing`);
  }
  const landing = fs.readFileSync(path.join(root, "landingpage.html"), "utf8");
  assert.match(landing, /assessment-persistence\.js/);
  assert.match(landing, /records\.html/);
});
