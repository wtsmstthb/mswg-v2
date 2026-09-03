"use strict";

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { applyLocalEnvironment, createLocalClient, ensureTables } = require("./dynamodb-local");

applyLocalEnvironment();

const { handler: createRisk } = require("../backend/createRisk");
const { handler: getDepartmentRisks } = require("../backend/getRisksByDept");
const { handler: getAllRisks } = require("../backend/getAllRisksForExec");
const { handler: updateRisk } = require("../backend/updateRisk");
const { handler: getRiskHistory } = require("../backend/getRiskHistory");
const { handler: archiveRisk } = require("../backend/archiveRisk");

const PORT = Number(process.env.RR_LOCAL_PORT || 3200);
const REPOSITORY_ROOT = path.resolve(__dirname, "..", "..");

function localClaims(role) {
  if (role === "hod") {
    return {
      sub: "rr-local-hod",
      name: "Padma Devi",
      "custom:department_id": "it-training",
      "custom:application_role": "department-head",
      "cognito:groups": ["rr-app-users", "rr-department-heads", "rr-dept-it-training"]
    };
  }
  if (role === "cm-hod") {
    return {
      sub: "rr-local-cm-hod",
      name: "Rita Foo",
      "custom:department_id": "corp-monitoring",
      "custom:application_role": "department-head",
      "cognito:groups": ["rr-app-users", "rr-department-heads", "rr-dept-corp-monitoring"]
    };
  }
  return {
    sub: "rr-local-viewer",
    name: "Lini Hazlinda",
    "custom:department_id": "corp-resources",
    "custom:application_role": "department-head-full-visibility",
    "cognito:groups": ["rr-app-users", "rr-department-heads", "rr-viewers-all", "rr-dept-corp-resources"]
  };
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function apiRoute(method, pathname) {
  if (method === "POST" && pathname === "/api/risks") return { handler: createRisk };
  if (method === "GET" && pathname === "/api/risks") return { handler: getDepartmentRisks };
  if (method === "GET" && pathname === "/api/risks/all") return { handler: getAllRisks };

  let match = pathname.match(/^\/api\/risks\/([^/]+)\/history$/);
  if (method === "GET" && match) return { handler: getRiskHistory, pathParameters: { riskId: match[1] } };
  match = pathname.match(/^\/api\/risks\/([^/]+)\/([^/]+)\/archive$/);
  if (method === "POST" && match) {
    return { handler: archiveRisk, pathParameters: { departmentId: match[1], riskId: match[2] } };
  }
  match = pathname.match(/^\/api\/risks\/([^/]+)$/);
  if (method === "PATCH" && match) return { handler: updateRisk, pathParameters: { riskId: match[1] } };
  return null;
}

function contentType(file) {
  return ({
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png"
  })[path.extname(file).toLowerCase()] || "application/octet-stream";
}

async function serveApi(request, response, route, url) {
  const requestedRole = request.headers["x-local-role"];
  const role = ["viewer", "hod", "cm-hod"].includes(requestedRole) ? requestedRole : "viewer";
  const result = await route.handler({
    requestContext: { authorizer: { jwt: { claims: localClaims(role) } } },
    pathParameters: Object.fromEntries(
      Object.entries(route.pathParameters || {}).map(([key, value]) => [key, decodeURIComponent(value)])
    ),
    queryStringParameters: Object.fromEntries(url.searchParams),
    body: await readBody(request)
  });
  response.writeHead(result.statusCode, result.headers);
  response.end(result.body);
}

function serveFile(response, pathname) {
  const requested = pathname === "/" ? "/RISKREGISTER/frontend/dashboard.html" : pathname;
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
  const client = createLocalClient();
  try { await ensureTables(client); } finally { client.destroy(); }

  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const route = apiRoute(request.method, url.pathname);
      if (route) return await serveApi(request, response, route, url);
      if (url.pathname.startsWith("/api/")) {
        response.writeHead(404, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: "API route not found", code: "NOT_FOUND" }));
        return;
      }
      serveFile(response, url.pathname);
    } catch (error) {
      console.error(error);
      response.writeHead(500, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "Local server error", code: "LOCAL_SERVER_ERROR" }));
    }
  });

  server.listen(PORT, "127.0.0.1", () => {
    console.log(`Risk Register local application: http://localhost:${PORT}/RISKREGISTER/frontend/dashboard.html`);
    console.log("Use the page role selector to switch among Full visibility, IT HOD, and Corporate Monitoring HOD.");
  });
}

main().catch(error => {
  console.error("Risk Register local server failed:", error);
  process.exitCode = 1;
});
