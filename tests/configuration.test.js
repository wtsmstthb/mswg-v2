"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(fullPath);
    return entry.name.endsWith(".js") ? [fullPath] : [];
  });
}

test("production Lambda source contains no local endpoint, table name, or dummy credential", () => {
  const lambdaDirectory = path.join(__dirname, "..", "lambdas", "risk-register");
  const productionFiles = sourceFiles(lambdaDirectory).filter(file => !path.basename(file).startsWith("test"));
  const forbidden = [
    "http://localhost:8000",
    "mswg-risk-register",
    "mswg-risk-history",
    "fakeMyKeyId",
    "fakeSecretAccessKey"
  ];

  for (const file of productionFiles) {
    const source = fs.readFileSync(file, "utf8");
    for (const value of forbidden) {
      assert.equal(source.includes(value), false, `${path.basename(file)} contains hard-coded ${value}`);
    }
  }
});

test("frontend application logic obtains deployment identifiers only from config.js", () => {
  const appDirectory = path.join(__dirname, "..", "Frontend", "risk-register");
  const applicationFiles = sourceFiles(appDirectory).filter(file => path.basename(file) !== "config.js");
  for (const file of applicationFiles) {
    const source = fs.readFileSync(file, "utf8");
    assert.equal(/https:\/\/[^"']+execute-api/.test(source), false, `${path.basename(file)} embeds an API URL`);
    assert.equal(/\b[a-z]{2}-[a-z]+-\d_[A-Za-z0-9]+\b/.test(source), false, `${path.basename(file)} embeds a user pool ID`);
  }
});
