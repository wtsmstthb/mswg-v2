"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createVerifier, verifyRequest } = require("../auth/verify-request");
const { isPublicFile } = require("../auth/public-files");
const { getIdentity, requireAssessor } = require("../../AGM/backend/lib/auth");
const root = path.resolve(__dirname, "../..");
const read = name => fs.readFileSync(path.join(root, name), "utf8");
const pool = "ap-southeast-1_TestPool";
const client = "test-client";
const issuer = `https://cognito-idp.ap-southeast-1.amazonaws.com/${pool}`;
const key = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicJwk = { ...key.publicKey.export({ format: "jwk" }), kid: "test-key", use: "sig", alg: "RS256" };
const payload = extra => ({ sub: "test-employee", iss: issuer, token_use: "access", client_id: client,
  exp: Math.floor(Date.now() / 1000) + 300, "cognito:groups": ["rr-app-users"], ...extra });
function sign(claims, privateKey = key.privateKey) {
  const encoded = value => Buffer.from(JSON.stringify(value)).toString("base64url");
  const data = `${encoded({ alg: "RS256", kid: "test-key" })}.${encoded(claims)}`;
  return `${data}.${crypto.sign("RSA-SHA256", Buffer.from(data), privateKey).toString("base64url")}`;
}

test("local API authentication rejects missing credentials and unconfigured sign-in", async () => {
  await assert.rejects(verifyRequest(undefined), { status: 401 });
  await assert.rejects(verifyRequest("hod"), { status: 401 });
  const oldPool = process.env.COGNITO_USER_POOL_ID;
  const oldClient = process.env.COGNITO_CLIENT_ID;
  delete process.env.COGNITO_USER_POOL_ID;
  delete process.env.COGNITO_CLIENT_ID;
  try { await assert.rejects(verifyRequest(`Bearer ${sign(payload())}`), { status: 503 }); }
  finally {
    if (oldPool !== undefined) process.env.COGNITO_USER_POOL_ID = oldPool;
    if (oldClient !== undefined) process.env.COGNITO_CLIENT_ID = oldClient;
  }
});

test("Cognito verification accepts valid signatures and rejects tampering, expiry, issuer, client and ID tokens", async () => {
  const verifier = createVerifier(pool, client);
  verifier.cacheJwks({ keys: [publicJwk] });
  assert.equal((await verifier.verify(sign(payload()))).sub, "test-employee");
  for (const bad of [
    { exp: 1 }, { iss: "https://attacker.invalid" }, { client_id: "other-client" },
    { token_use: "id", aud: client }
  ]) await assert.rejects(verifier.verify(sign(payload(bad))));
  const otherKey = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  await assert.rejects(verifier.verify(sign(payload(), otherKey.privateKey)));
});

test("local static hosting allows pages and rejects databases, backends, legacy and configuration examples", () => {
  for (const file of ["PRE-VOTING/frontend/index.html", "AGM/frontend/records.html", "shared/auth/session.js"])
    assert.equal(isPublicFile(file), true, file);
  for (const file of ["PRE-VOTING/testing/mswg_test.db", "dynamodb-data/shared-local-instance.db",
    "RISKREGISTER/backend/createRisk.js", "shared/auth/verify-request.js", ".git/config",
    "AGM/frontend/../../backend/saveAssessment.js", "RISKREGISTER/frontend/legacy/frontend-HOD/role-config.js",
    "AGM/frontend/agm-config.prod.example.js"])
    assert.equal(isPublicFile(file), false, file);
});

test("AGM accepts department groups from access tokens and rejects conflicting assignments", () => {
  const claims = { sub: "assessor", "cognito:groups": ["agm-app-users", "agm-assessors", "rr-dept-corp-monitoring"] };
  const event = value => ({ requestContext: { authorizer: { jwt: { claims: value } } } });
  assert.doesNotThrow(() => requireAssessor(getIdentity(event(claims))));
  assert.throws(() => getIdentity(event({ ...claims, "custom:department_id": "it-training" })), { statusCode: 403 });
});

function sessionSandbox(tokens = {}) {
  const storage = { getItem: key => tokens[key] || null };
  const sandbox = { atob, console, sessionStorage: storage, localStorage: storage };
  sandbox.window = sandbox;
  sandbox.APP_CONFIG = { environment: "local", awsRegion: "ap-southeast-1", cognito: { userPoolId: pool, clientId: client } };
  vm.createContext(sandbox);
  vm.runInContext(read("shared/auth/session.js"), sandbox);
  return sandbox;
}

test("browser ignores old mock identities and rejects expired or mismatched sessions", () => {
  const mock = sessionSandbox({ mswg_rr_mock_claims: JSON.stringify({ sub: "admin" }), mswg_rr_local_role: "viewer" });
  assert.equal(mock.MSWG_SESSION.readClaims(), null);
  const tokens = {
    mswg_rr_id_token: sign(payload({ token_use: "id", aud: client })),
    mswg_rr_access_token: sign(payload())
  };
  assert.equal(sessionSandbox(tokens).MSWG_SESSION.readClaims().sub, "test-employee");
  assert.equal(sessionSandbox({ ...tokens, mswg_rr_access_token: sign(payload({ exp: 1 })) }).MSWG_SESSION.readClaims(), null);
  assert.equal(sessionSandbox({ ...tokens, mswg_rr_id_token: sign(payload({ token_use: "id", aud: "wrong" })) }).MSWG_SESSION.readClaims(), null);
});

test("Pre-Voting API failure displays an error and never invents history", async () => {
  const elements = new Map();
  const element = id => { if (!elements.has(id)) elements.set(id, { innerHTML: "", textContent: "", addEventListener() {} }); return elements.get(id); };
  const sandbox = { console: { error() {} }, URLSearchParams,
    document: { getElementById: element, addEventListener() {}, querySelectorAll: () => [] },
    location: { search: "" }, PREVOTING_CONFIG: { apiBaseUrl: "http://localhost:8000" },
    preVotingFetch: async () => { throw new Error("offline"); } };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read("PRE-VOTING/frontend/history.js"), sandbox);
  await vm.runInContext("loadHistory()", sandbox);
  assert.match(element("historyTableBody").innerHTML, /Unable to load saved submissions/);
  assert.equal(element("totalSubmissions").textContent, "—");
  assert.equal(vm.runInContext("historyRecords.length", sandbox), 0);
});

test("active platform HTML has valid scripts and all relative script, stylesheet and page links resolve", () => {
  for (const folder of ["RISKREGISTER/frontend", "AGM/frontend", "PRE-VOTING/frontend", "shared/portal"]) {
    for (const name of fs.readdirSync(path.join(root, folder)).filter(name => name.endsWith(".html") && name !== "land2.html")) {
      const source = read(`${folder}/${name}`);
      for (const match of source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))
        assert.doesNotThrow(() => new vm.Script(match[1], { filename: `${folder}/${name}` }));
      for (const match of source.matchAll(/(?:src|href)="([^"#]+)"/g)) {
        const reference = match[1].split(/[?#]/)[0];
        if (/^(https?:|mailto:|javascript:|data:)/.test(reference) || reference.includes("${")) continue;
        assert.equal(fs.existsSync(path.resolve(root, folder, reference)), true, `${folder}/${name}: ${reference}`);
      }
    }
  }
  assert.match(read("RISKREGISTER/frontend/sidebar.js"), /href: "\.\.\/\.\.\/PRE-VOTING\/frontend\/index.html"[^\n]+available: true/);
});
