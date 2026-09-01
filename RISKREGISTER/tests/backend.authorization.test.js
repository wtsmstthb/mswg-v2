"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { createCreateRiskHandler } = require("../backend/createRisk");
const { createGetRisksByDeptHandler } = require("../backend/getRisksByDept");
const { createGetAllRisksForExecHandler } = require("../backend/getAllRisksForExec");
const { createUpdateRiskHandler } = require("../backend/updateRisk");
const { createArchiveRiskHandler } = require("../backend/archiveRisk");
const { createGetRiskHistoryHandler } = require("../backend/getRiskHistory");

function claimsFor({
  sub = "user-123",
  departmentId = "it-training",
  groups = ["rr-app-users"]
} = {}) {
  return {
    sub,
    "cognito:username": sub,
    "custom:department_id": departmentId,
    "custom:application_role": groups.includes("rr-viewers-all") ? "full-visibility" : "department-user",
    "cognito:groups": groups
  };
}

function apiEvent({ claims = claimsFor(), body, path = {}, query = {}, extra = {} } = {}) {
  return {
    requestContext: { authorizer: { jwt: { claims } } },
    pathParameters: path,
    queryStringParameters: query,
    body: body === undefined ? undefined : JSON.stringify(body),
    ...extra
  };
}

function responseBody(response) {
  return JSON.parse(response.body);
}

test("requests without verified authorizer claims are rejected even if identity fields are supplied", async () => {
  const handler = createCreateRiskHandler({
    repository: { createRisk: async () => assert.fail("repository must not be called") }
  });
  const response = await handler({
    dept_id: "it-training",
    created_by: "forged-user",
    body: JSON.stringify({
      title: "Forged request",
      likelihood: "Low",
      impact: "Low",
      residual_rating: "Low"
    })
  });

  assert.equal(response.statusCode, 401);
  assert.equal(responseBody(response).code, "UNAUTHENTICATED");
});

test("a department user can only query the department in verified claims", async () => {
  let queriedDepartment;
  const handler = createGetRisksByDeptHandler({
    repository: {
      listDepartmentRisks: async departmentId => {
        queriedDepartment = departmentId;
        return [
          { risk_id: "active", status: "active" },
          { risk_id: "archived", status: "archived" }
        ];
      }
    }
  });

  const response = await handler(apiEvent({
    claims: claimsFor({ departmentId: "it-training" }),
    body: { dept_id: "finance-admin" },
    query: { departmentId: "finance-admin", includeArchived: "true" },
    extra: { dept_id: "finance-admin" }
  }));

  assert.equal(response.statusCode, 200);
  assert.equal(queriedDepartment, "it-training");
  assert.deepEqual(responseBody(response).items.map(item => item.risk_id), ["active"]);
});

test("create ignores forged department and creator fields", async () => {
  let savedItem;
  const handler = createCreateRiskHandler({
    repository: { createRisk: async item => { savedItem = item; } },
    randomUUID: () => "risk-001",
    now: () => new Date("2026-08-13T01:02:03.000Z")
  });

  const response = await handler(apiEvent({
    claims: claimsFor({ sub: "verified-user", departmentId: "it-training" }),
    body: {
      dept_id: "finance-admin",
      created_by: "impersonated-user",
      requested_by: "impersonated-user",
      title: "Valid risk title",
      description: "Description",
      likelihood: "Medium Low",
      impact: "High",
      residual_rating: "Medium High"
    }
  }));

  assert.equal(response.statusCode, 201);
  assert.equal(savedItem.dept_id, "it-training");
  assert.equal(savedItem.created_by, "verified-user");
  assert.equal(savedItem.risk_id, "risk-001");
  assert.equal(savedItem.quarter, "Q3");
});

test("only a full-visibility user can list all departments", async () => {
  let calls = 0;
  const repository = {
    listAllRisks: async () => { calls += 1; return [{ risk_id: "risk-001", status: "active" }]; }
  };
  const handler = createGetAllRisksForExecHandler({ repository });

  const denied = await handler(apiEvent());
  assert.equal(denied.statusCode, 403);
  assert.equal(calls, 0);

  const allowed = await handler(apiEvent({
    claims: claimsFor({ groups: ["rr-app-users", "rr-viewers-all"] })
  }));
  assert.equal(allowed.statusCode, 200);
  assert.equal(calls, 1);
});

test("full-visibility reads exclude archived risks unless explicitly requested", async () => {
  const handler = createGetAllRisksForExecHandler({
    repository: {
      listAllRisks: async () => [
        { risk_id: "active", status: "active" },
        { risk_id: "archived", status: "archived" }
      ]
    }
  });
  const viewerClaims = claimsFor({ groups: ["rr-app-users", "rr-viewers-all"] });

  const defaultResponse = await handler(apiEvent({ claims: viewerClaims }));
  assert.deepEqual(responseBody(defaultResponse).items.map(item => item.risk_id), ["active"]);

  const archivedResponse = await handler(apiEvent({
    claims: viewerClaims,
    query: { includeArchived: "true" }
  }));
  assert.deepEqual(responseBody(archivedResponse).items.map(item => item.risk_id), ["active", "archived"]);
});

test("only a privileged user can archive and archived_by comes from verified claims", async () => {
  let archiveRequest;
  const repository = {
    getRisk: async () => ({ risk_id: "risk-001", dept_id: "finance-admin", status: "active" }),
    archiveRisk: async request => {
      archiveRequest = request;
      return { risk_id: request.riskId, dept_id: request.departmentId, status: "archived" };
    }
  };
  const handler = createArchiveRiskHandler({
    repository,
    now: () => new Date("2026-08-13T02:00:00.000Z")
  });
  const path = { departmentId: "finance-admin", riskId: "risk-001" };

  const denied = await handler(apiEvent({ path }));
  assert.equal(denied.statusCode, 403);
  assert.equal(archiveRequest, undefined);

  const allowed = await handler(apiEvent({
    claims: claimsFor({
      sub: "verified-viewer",
      departmentId: "corp-resources",
      groups: ["rr-app-users", "rr-viewers-all"]
    }),
    path,
    body: { requested_by: "dr-ismet", archived_by: "dr-ismet" },
    extra: { requested_by: "dr-ismet" }
  }));

  assert.equal(allowed.statusCode, 200);
  assert.equal(archiveRequest.userId, "verified-viewer");
  assert.equal(archiveRequest.departmentId, "finance-admin");
});

test("every successful update records an audit-history entry", async () => {
  let historyWrites = 0;
  let updateRequest;
  const existing = {
    dept_id: "it-training",
    risk_id: "risk-001",
    created_by: "creator-1",
    title: "Original title",
    residual_rating: "Medium Low",
    status: "active"
  };
  const repository = {
    getRisk: async () => existing,
    updateRiskWithHistory: async request => {
      historyWrites += 1;
      updateRequest = request;
      return { item: { ...existing, ...request.changes } };
    }
  };
  const handler = createUpdateRiskHandler({
    repository,
    now: () => new Date("2026-08-13T03:00:00.000Z")
  });

  const response = await handler(apiEvent({
    claims: claimsFor({ sub: "creator-1", departmentId: "it-training" }),
    path: { riskId: "risk-001" },
    body: { title: "Corrected title only", requested_by: "someone-else", dept_id: "finance-admin" }
  }));

  assert.equal(response.statusCode, 200);
  assert.equal(historyWrites, 1);
  assert.equal(updateRequest.userId, "creator-1");
  assert.deepEqual(updateRequest.changes, { title: "Corrected title only" });
});

test("a user cannot update a risk created by someone else", async () => {
  const repository = {
    getRisk: async () => ({
      dept_id: "it-training",
      risk_id: "risk-001",
      created_by: "different-user",
      status: "active"
    }),
    updateRiskWithHistory: async () => assert.fail("history/update transaction must not run")
  };
  const handler = createUpdateRiskHandler({ repository });
  const response = await handler(apiEvent({
    path: { riskId: "risk-001" },
    body: { title: "Unauthorized edit" }
  }));

  assert.equal(response.statusCode, 403);
  assert.equal(responseBody(response).code, "CREATOR_REQUIRED");
});

test("missing required fields and invalid risk ratings are rejected", async () => {
  let writes = 0;
  const handler = createCreateRiskHandler({
    repository: { createRisk: async () => { writes += 1; } }
  });

  const missing = await handler(apiEvent({ body: { title: "Only a title" } }));
  assert.equal(missing.statusCode, 400);

  const invalid = await handler(apiEvent({ body: {
    title: "Invalid rating risk",
    likelihood: "Almost certain",
    impact: "High",
    residual_rating: "Critical"
  } }));
  assert.equal(invalid.statusCode, 400);
  assert.equal(responseBody(invalid).code, "VALIDATION_ERROR");
  assert.equal(writes, 0);
});

test("department users cannot see another department's history", async () => {
  const handler = createGetRiskHistoryHandler({
    repository: {
      listRiskHistory: async () => [{
        risk_id: "risk-001",
        dept_id: "finance-admin",
        changed_at: "2026-08-13T00:00:00.000Z"
      }]
    }
  });
  const response = await handler(apiEvent({ path: { riskId: "risk-001" } }));
  assert.equal(response.statusCode, 404);
  assert.equal(responseBody(response).code, "HISTORY_NOT_FOUND");
});
