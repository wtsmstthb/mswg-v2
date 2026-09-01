"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const appDirectory = path.join(__dirname, "..", "frontend");

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
}

function loadRoleContext({ claims, currentPage = "dashboard.html" } = {}) {
  const localStorage = createStorage(
    claims ? { mswg_rr_mock_claims: JSON.stringify(claims) } : {}
  );
  const redirects = [];
  const sandbox = {
    console,
    atob,
    localStorage,
    sessionStorage: createStorage(),
    location: { replace: destination => redirects.push(destination) }
  };
  sandbox.window = sandbox;
  sandbox.CURRENT_PAGE = currentPage;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(appDirectory, "config.js"), "utf8"), sandbox);
  vm.runInContext(fs.readFileSync(path.join(appDirectory, "role-config.js"), "utf8"), sandbox);
  return { context: sandbox.APP_CONTEXT, redirects };
}

test("every consolidated HTML page references existing local assets and has valid inline JavaScript", () => {
  const htmlFiles = fs.readdirSync(appDirectory).filter(file => file.endsWith(".html"));
  assert.ok(htmlFiles.length >= 7);

  for (const file of htmlFiles) {
    const source = fs.readFileSync(path.join(appDirectory, file), "utf8");
    const sourceReferences = [...source.matchAll(/<script\s+src="([^"]+)"/g)].map(match => match[1]);
    for (const reference of sourceReferences) {
      if (/^https?:/.test(reference)) continue;
      assert.ok(fs.existsSync(path.join(appDirectory, reference)), `${file} references missing ${reference}`);
    }

    const inlineScripts = [...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
      .map(match => match[1])
      .filter(script => script.trim());
    for (const [index, script] of inlineScripts.entries()) {
      assert.doesNotThrow(
        () => new vm.Script(script, { filename: `${file}:inline-${index + 1}` }),
        `${file} contains invalid inline JavaScript`
      );
    }

    if (!["access-denied.html", "login.html", "callback.html"].includes(file)) {
      assert.ok(source.includes('src="config.js"'), `${file} must load environment configuration`);
      assert.ok(source.includes('src="role-config.js"'), `${file} must load permission configuration`);
    }
  }
});

test("the local full-visibility mock receives organization and archive permissions", () => {
  const { context, redirects } = loadRoleContext();
  assert.equal(context.departmentId, "corp-resources");
  assert.equal(context.canViewAll, true);
  assert.equal(context.canArchive, true);
  assert.equal(context.canRestore, false);
  assert.deepEqual(redirects, []);
});

test("a department head sees department features but is redirected away from privileged pages", () => {
  const claims = {
    sub: "padma-devi",
    name: "Padma Devi",
    "custom:department_id": "it-training",
    "cognito:groups": ["rr-app-users", "rr-department-heads", "rr-dept-it-training"]
  };
  const normalPage = loadRoleContext({ claims });
  assert.equal(normalPage.context.canCreate, true);
  assert.equal(normalPage.context.canViewAll, false);
  assert.equal(normalPage.context.canArchive, false);
  assert.deepEqual(normalPage.redirects, []);

  const privilegedPage = loadRoleContext({ claims, currentPage: "archived.html" });
  assert.deepEqual(privilegedPage.redirects, ["dashboard.html"]);
});

test("an identity without RR entitlement is sent to the access-required page", () => {
  const result = loadRoleContext({ claims: {
    sub: "employee-without-rr",
    name: "Employee",
    "custom:department_id": "it-training",
    "cognito:groups": ["shared-company-users"]
  } });
  assert.equal(result.context.hasAppAccess, false);
  assert.deepEqual(result.redirects, ["access-denied.html"]);
});
