"use strict";

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { applyAgmLocalEnvironment, createAgmLocalClient, ensureAgmTables } = require("./agm-dynamodb-local");

applyAgmLocalEnvironment();

const { handler: createAssessment } = require("../backend/createAssessment");
const { handler: listAssessments } = require("../backend/listAssessments");
const { handler: getAssessment } = require("../backend/getAssessment");
const { handler: saveAssessment } = require("../backend/saveAssessment");
const { handler: submitAssessment } = require("../backend/submitAssessment");
const { handler: reviewAssessment } = require("../backend/reviewAssessment");
const { handler: reopenAssessment } = require("../backend/reopenAssessment");
const { handler: getHistory } = require("../backend/getAssessmentHistory");

const PORT = Number(process.env.AGM_LOCAL_PORT || 3100);
const REPOSITORY_ROOT = path.resolve(__dirname, "..", "..");

function localClaims(role) {
  if (role === "hod") {
    return {
      sub: "agm-local-hod",
      name: "Rita Foo",
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

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function apiRoute(method, pathname) {
  if (method === "POST" && pathname === "/api/agm/assessments") return { handler: createAssessment };
  if (method === "GET" && pathname === "/api/agm/assessments") return { handler: listAssessments };
  const match = pathname.match(/^\/api\/agm\/assessments\/([^/]+)(?:\/(submit|review|reopen|history))?$/);
  if (!match) return null;
  const [, assessmentId, action] = match;
  if (method === "GET" && !action) return { handler: getAssessment, assessmentId };
  if (method === "PATCH" && !action) return { handler: saveAssessment, assessmentId };
  if (method === "POST" && action === "submit") return { handler: submitAssessment, assessmentId };
  if (method === "POST" && action === "review") return { handler: reviewAssessment, assessmentId };
  if (method === "POST" && action === "reopen") return { handler: reopenAssessment, assessmentId };
  if (method === "GET" && action === "history") return { handler: getHistory, assessmentId };
  return null;
}

function contentType(file) {
  return ({ ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json" })[path.extname(file)] || "application/octet-stream";
}

async function serveApi(request, response, route, url) {
  const role = request.headers["x-local-role"] === "hod" ? "hod" : "analyst";
  const result = await route.handler({
    requestContext: { authorizer: { jwt: { claims: localClaims(role) } } },
    pathParameters: route.assessmentId ? { assessmentId: decodeURIComponent(route.assessmentId) } : {},
    queryStringParameters: Object.fromEntries(url.searchParams),
    body: await readBody(request)
  });
  response.writeHead(result.statusCode, result.headers);
  response.end(result.body);
}

function serveFile(request, response, pathname) {
  const requested = pathname === "/" ? "/AGM/frontend/records.html" : pathname;
  const file = path.resolve(REPOSITORY_ROOT, `.${decodeURIComponent(requested)}`);
  if (!file.startsWith(`${REPOSITORY_ROOT}${path.sep}`)) {
    response.writeHead(403); response.end("Forbidden"); return;
  }
  fs.readFile(file, (error, data) => {
    if (error) { response.writeHead(404); response.end("Not found"); return; }
    response.writeHead(200, { "content-type": contentType(file), "cache-control": "no-store" });
    response.end(data);
  });
}

async function main() {
  const client = createAgmLocalClient();
  try { await ensureAgmTables(client); } finally { client.destroy(); }
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const route = apiRoute(request.method, url.pathname);
      if (route) return await serveApi(request, response, route, url);
      serveFile(request, response, url.pathname);
    } catch (error) {
      console.error(error);
      response.writeHead(500, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "Local server error" }));
    }
  });
  server.listen(PORT, "127.0.0.1", () => {
    console.log(`AGM local application: http://localhost:${PORT}/AGM/frontend/records.html`);
    console.log("Use the page role selector to switch between Corporate Monitoring and HOD review.");
  });
}

main().catch(error => {
  console.error("AGM local server failed:", error);
  process.exitCode = 1;
});
