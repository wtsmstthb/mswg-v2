"use strict";

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} before running this manual database check.`);
  return value;
}

const clientOptions = { region: required("AWS_REGION") };
if (process.env.DDB_ENDPOINT) clientOptions.endpoint = process.env.DDB_ENDPOINT;
const docClient = DynamoDBDocumentClient.from(new DynamoDBClient(clientOptions));

async function main() {
  const tableName = required("RISK_TABLE_NAME");
  const departmentId = required("TEST_DEPARTMENT_ID");
  const riskId = `LOCAL-CHECK-${Date.now()}`;
  const item = {
    dept_id: departmentId,
    risk_id: riskId,
    title: "Environment-configured database check",
    quarter: "Q3",
    year: 2026,
    residual_rating: "Medium Low",
    status: "active"
  };

  await docClient.send(new PutCommand({ TableName: tableName, Item: item }));
  const result = await docClient.send(new GetCommand({
    TableName: tableName,
    Key: { dept_id: departmentId, risk_id: riskId }
  }));
  console.log("Item read back:", result.Item);
}

main().catch(error => {
  console.error("Database check failed:", error.message);
  process.exitCode = 1;
});
