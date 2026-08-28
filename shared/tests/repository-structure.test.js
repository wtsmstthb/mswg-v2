"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

test("platforms and shared components have separate top-level ownership", () => {
  const required = [
    "RISKREGISTER/frontend",
    "RISKREGISTER/backend",
    "RISKREGISTER/tests",
    "RISKREGISTER/tools",
    "AGM/frontend",
    "AGM/backend",
    "AGM/tests",
    "AGM/tools",
    "shared/portal",
    "shared/infrastructure"
  ];
  required.forEach(directory => assert.equal(exists(directory), true, `${directory} is missing`));

  const retiredRoots = ["Frontend", "lambdas", "tests", "tools", "infrastructure", ".md", ".JSON", "risk-register", "agm-conduct"];
  retiredRoots.forEach(directory => assert.equal(exists(directory), false, `${directory} should not remain at the repository root`));
});

test("cross-platform navigation points to existing files", () => {
  const targets = [
    "shared/portal/index.html",
    "RISKREGISTER/frontend/dashboard.html",
    "RISKREGISTER/frontend/login.html",
    "AGM/frontend/landingpage.html",
    "AGM/frontend/records.html"
  ];
  targets.forEach(file => assert.equal(exists(file), true, `${file} is missing`));

  const portal = fs.readFileSync(path.join(root, "shared", "portal", "index.html"), "utf8");
  assert.match(portal, /\.\.\/\.\.\/RISKREGISTER\/frontend\/dashboard\.html/);
  assert.match(portal, /\.\.\/\.\.\/AGM\/frontend\/landingpage\.html/);

  const riskSidebar = fs.readFileSync(path.join(root, "RISKREGISTER", "frontend", "sidebar.js"), "utf8");
  const agmLanding = fs.readFileSync(path.join(root, "AGM", "frontend", "landingpage.html"), "utf8");
  assert.match(riskSidebar, /\.\.\/\.\.\/AGM\/frontend\/landingpage\.html/);
  assert.match(agmLanding, /\.\.\/\.\.\/RISKREGISTER\/frontend\/dashboard\.html/);
});

test("shared SAM code paths resolve to both platform backends", () => {
  const infrastructureDirectory = path.join(root, "shared", "infrastructure");
  const template = fs.readFileSync(path.join(infrastructureDirectory, "template.yaml"), "utf8");
  const codeUris = [...template.matchAll(/^\s+CodeUri:\s+(.+)$/gm)].map(match => match[1].trim());
  assert.ok(codeUris.length > 0);
  codeUris.forEach(codeUri => {
    assert.equal(fs.existsSync(path.resolve(infrastructureDirectory, codeUri)), true, `Missing CodeUri ${codeUri}`);
  });
});
