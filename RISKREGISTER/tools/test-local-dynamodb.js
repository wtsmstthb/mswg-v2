"use strict";

const assert = require("node:assert/strict");
const {
  LOCAL_CONFIG,
  applyLocalEnvironment,
  createLocalClient,
  ensureTables
} = require("./dynamodb-local");

applyLocalEnvironment();

const repository = require("../backend/lib/repository");
const { createCreateRiskHandler } = require("../backend/createRisk");
const { createGetRisksByDeptHandler } = require("../backend/getRisksByDept");
const { createGetAllRisksForExecHandler } = require("../backend/getAllRisksForExec");
const { createUpdateRiskHandler } = require("../backend/updateRisk");
const { createGetRiskHistoryHandler } = require("../backend/getRiskHistory");
const { createArchiveRiskHandler } = require("../backend/archiveRisk");

function claimsFor({
  sub,
  departmentId,
  groups = ["rr-app-users", "rr-department-heads"]
}) {
  return {
    sub,
    "cognito:username": sub,
    "custom:department_id": departmentId,
    "custom:application_role": groups.includes("rr-viewers-all") ? "full-visibility" : "department-head",
    "cognito:groups": groups
  };
}

function apiEvent({ claims, body, path = {}, query = {} } = {}) {
  return {
    requestContext: { authorizer: { jwt: { claims } } },
    pathParameters: path,
    queryStringParameters: query,
    body: body === undefined ? undefined : JSON.stringify(body)
  };
}

function bodyOf(response) {
  return JSON.parse(response.body);
}

function requireStatus(response, expected, step) {
  assert.equal(response.statusCode, expected, `${step}: ${response.body}`);
  return bodyOf(response);
}

async function main() {
  const setupClient = createLocalClient();
  try {
    await ensureTables(setupClient);
  } finally {
    setupClient.destroy();
  }

  repository.resetForTests();

  const runId = Date.now().toString(36);
  const riskId = `LOCAL-${runId}`;
  const creator = claimsFor({ sub: `creator-${runId}`, departmentId: "it-training" });
  const otherDepartment = claimsFor({ sub: `other-${runId}`, departmentId: "finance-admin" });
  const fullViewer = claimsFor({
    sub: `viewer-${runId}`,
    departmentId: "corp-resources",
    groups: ["rr-app-users", "rr-viewers-all"]
  });

  const create = createCreateRiskHandler({
    repository,
    randomUUID: () => riskId,
    now: () => new Date("2026-08-28T01:00:00.000Z")
  });
  const getDepartment = createGetRisksByDeptHandler({ repository });
  const getAll = createGetAllRisksForExecHandler({ repository });
  const update = createUpdateRiskHandler({
    repository,
    now: () => new Date("2026-08-28T01:05:00.000Z")
  });
  const getHistory = createGetRiskHistoryHandler({ repository });
  const archive = createArchiveRiskHandler({
    repository,
    now: () => new Date("2026-08-28T01:10:00.000Z")
  });

  const created = requireStatus(await create(apiEvent({
    claims: creator,
    body: {
      title: "Local DynamoDB integration risk",
      description: "Created by the repeatable Docker integration test.",
      likelihood: "Medium Low",
      impact: "High",
      residual_rating: "Medium High"
    }
  })), 201, "create risk");
  assert.equal(created.item.risk_id, riskId);
  assert.equal(created.item.dept_id, "it-training");
  console.log(`PASS create: ${riskId}`);

  const ownList = requireStatus(await getDepartment(apiEvent({ claims: creator })), 200, "own-department read");
  assert.ok(ownList.items.some(item => item.risk_id === riskId));
  console.log("PASS own-department read");

  const otherList = requireStatus(await getDepartment(apiEvent({ claims: otherDepartment })), 200, "other-department scoped read");
  assert.ok(!otherList.items.some(item => item.risk_id === riskId));
  const deniedAll = requireStatus(await getAll(apiEvent({ claims: creator })), 403, "ordinary all-department denial");
  assert.equal(deniedAll.code, "FULL_VISIBILITY_REQUIRED");
  console.log("PASS department isolation and full-view denial");

  const updated = requireStatus(await update(apiEvent({
    claims: creator,
    path: { riskId },
    body: {
      title: "Updated local DynamoDB integration risk",
      residual_rating: "Low"
    }
  })), 200, "update risk");
  assert.equal(updated.item.residual_rating, "Low");
  console.log("PASS transactional update");

  const history = requireStatus(await getHistory(apiEvent({
    claims: creator,
    path: { riskId }
  })), 200, "history read");
  assert.equal(history.count, 1);
  assert.deepEqual(history.items[0].changed_fields.sort(), ["residual_rating", "title"]);
  console.log("PASS audit-history write/read");

  const archived = requireStatus(await archive(apiEvent({
    claims: fullViewer,
    path: { departmentId: "it-training", riskId }
  })), 200, "archive risk");
  assert.equal(archived.item.status, "archived");
  assert.equal(archived.item.archived_by, fullViewer.sub);
  console.log("PASS privileged soft archive");

  const activeAfterArchive = requireStatus(await getDepartment(apiEvent({ claims: creator })), 200, "archived filtering");
  assert.ok(!activeAfterArchive.items.some(item => item.risk_id === riskId));
  const allWithArchived = requireStatus(await getAll(apiEvent({
    claims: fullViewer,
    query: { includeArchived: "true" }
  })), 200, "full-view archived read");
  assert.ok(allWithArchived.items.some(item => item.risk_id === riskId && item.status === "archived"));
  console.log("PASS archived filtering and full-view retrieval");

  console.log(`SUCCESS real DynamoDB workflow at ${LOCAL_CONFIG.endpoint}`);
  console.log(`Tables: ${LOCAL_CONFIG.riskTableName}, ${LOCAL_CONFIG.historyTableName}`);
}

main().catch(error => {
  console.error("FAIL real DynamoDB integration:", error);
  process.exitCode = 1;
});
