"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");

test("the current Risk Register has no browser-local risk database or seeded register", () => {
  const common = read("frontend/common.js");
  assert.equal(common.includes("mswg_rr_added_risks"), false);
  assert.equal(common.includes("const DATA ="), false);
  assert.match(common, /RISK_API\.listMine/);
  assert.match(common, /RISK_API\.create/);
  assert.match(common, /RISK_API\.update/);
  assert.match(common, /RISK_API\.history/);
  assert.match(common, /RISK_API\.archive/);
});

test("all persistent browser workflows call the API-backed model", () => {
  const dashboard = read("frontend/dashboard.html");
  const register = read("frontend/register.html");
  const history = read("frontend/history.html");
  const archive = read("frontend/archived.html");
  const overview = read("frontend/org-overview.html");

  assert.match(dashboard, /await loadDepartmentRisks\(\)/);
  assert.match(dashboard, /expected_version/);
  assert.match(register, /await addRisk\(riskPayloadFromForm\(\)\)/);
  assert.match(history, /await getRiskHistory/);
  assert.match(archive, /await archiveRisk/);
  assert.match(overview, /await loadOrganizationRisks\(\)/);
});

test("risk registration offers editable reuse and defaults to the calendar quarter", () => {
  const register = read("frontend/register.html");
  const dashboard = read("frontend/dashboard.html");
  assert.match(register, /id="fTemplate"/);
  assert.match(register, /await loadDepartmentRisks\(\)/);
  assert.match(register, /value="__custom__"/);
  assert.match(register, /id="fQuarter" class="locked-quarter" required disabled/);
  assert.match(register, /Math\.floor\(date\.getMonth\(\) \/ 3\) \+ 1/);
  assert.match(register, /document\.getElementById\("fQuarter"\)\.value = currentQuarter/);
  assert.match(dashboard, /value="__custom__"/);
  assert.match(dashboard, /id="fQuarter" class="locked-quarter" required disabled/);
  assert.match(dashboard, /currentCalendarQuarter\(\)/);
});

test("the local server exposes the same six routes as the deployed HTTP API", () => {
  const server = read("tools/serve-risk-local.js");
  for (const route of [
    'pathname === "/api/risks"',
    'pathname === "/api/risks/all"',
    '/history$',
    '/archive$',
    'method === "PATCH"'
  ]) {
    assert.ok(server.includes(route), `missing local route evidence: ${route}`);
  }
  assert.match(server, /ensureTables/);
  assert.match(server, /requestContext: \{ authorizer: \{ jwt: \{ claims:/);
});

test("the complete form schema and version protection are enforced by the backend", () => {
  const validation = read("backend/lib/validation.js");
  const update = read("backend/updateRisk.js");
  const repository = read("backend/lib/repository.js");
  for (const field of [
    "inherent_impact", "inherent_likelihood", "control_methods",
    "addressed_root_cause", "control_documented", "applied_consistently",
    "control_effectiveness", "risk_trend", "residual_impact", "residual_likelihood"
  ]) assert.ok(validation.includes(`"${field}"`), `schema omits ${field}`);
  assert.match(update, /VERSION_CONFLICT/);
  assert.match(repository, /record_version/);
  assert.match(repository, /change_type: "archive"/);
});
