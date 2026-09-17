"use strict";

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { verifyRequest } = require("../../shared/auth/verify-request");
const { isPublicFile } = require("../../shared/auth/public-files");
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
  let claims;
  try { claims = await verifyRequest(request.headers.authorization); }
  catch (error) {
    response.writeHead(error.status || 401, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: error.message, code: "SIGN_IN_REQUIRED" }));
    return;
  }
  const result = await route.handler({
    requestContext: { authorizer: { jwt: { claims } } },
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
  if (!file.startsWith(`${REPOSITORY_ROOT}${path.sep}`) || !isPublicFile(path.relative(REPOSITORY_ROOT, file))) {
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
    console.log("Record access requires a verified Cognito access token. Configure COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID.");
  });
}

main().catch(error => {
  console.error("Risk Register local server failed:", error);
  process.exitCode = 1;
});
