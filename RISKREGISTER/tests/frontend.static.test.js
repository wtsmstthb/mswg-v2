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
  const token = kind => `header.${Buffer.from(JSON.stringify({
    ...claims, token_use: kind, exp: Math.floor(Date.now() / 1000) + 300,
    iss: "https://cognito-idp.ap-southeast-1.amazonaws.com/ap-southeast-1_TestPool",
    ...(kind === "id" ? { aud: "test-client" } : { client_id: "test-client" })
  })).toString("base64url")}.test-signature`;
  const localStorage = createStorage(claims ? {
    mswg_rr_id_token: token("id"), mswg_rr_access_token: token("access")
  } : {});
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
  sandbox.APP_CONFIG = { ...sandbox.APP_CONFIG, cognito: { userPoolId: "ap-southeast-1_TestPool", clientId: "test-client" } };
  vm.runInContext(fs.readFileSync(path.join(appDirectory, "../../shared/auth/session.js"), "utf8"), sandbox);
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

    if (!["access-denied.html", "login.html", "callback.html", "signup.html", "forgot-password.html"].includes(file)) {
      assert.ok(source.includes('src="config.js"'), `${file} must load environment configuration`);
      assert.ok(source.includes('src="role-config.js"'), `${file} must load permission configuration`);
    }
  }
});

test("a visitor without a session receives no permissions even in local mode", () => {
  const { context, redirects } = loadRoleContext();
  assert.equal(context.departmentId, "");
  assert.equal(context.canViewAll, false);
  assert.equal(context.canArchive, false);
  assert.equal(context.isAuthenticated, false);
  assert.equal(context.canRestore, false);
  assert.deepEqual(redirects, ["login.html"]);
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
