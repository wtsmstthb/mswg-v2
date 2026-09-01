"use strict";

function requireEnvironmentVariable(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function loadConfig() {
  return Object.freeze({
    region: requireEnvironmentVariable("AWS_REGION"),
    riskTableName: requireEnvironmentVariable("RISK_TABLE_NAME"),
    historyTableName: requireEnvironmentVariable("HISTORY_TABLE_NAME"),
    dynamoDbEndpoint: process.env.DDB_ENDPOINT?.trim() || undefined
  });
}

module.exports = { loadConfig, requireEnvironmentVariable };

