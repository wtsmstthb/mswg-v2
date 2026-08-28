"use strict";

function required(name) {
  const value = process.env[name];
  if (!value || !value.trim()) throw new Error(`Missing required environment variable: ${name}`);
  return value.trim();
}

function loadConfig() {
  return Object.freeze({
    region: required("AWS_REGION"),
    assessmentTableName: required("AGM_ASSESSMENT_TABLE_NAME"),
    historyTableName: required("AGM_HISTORY_TABLE_NAME"),
    dynamoDbEndpoint: process.env.DDB_ENDPOINT?.trim() || undefined
  });
}

module.exports = { loadConfig, required };
