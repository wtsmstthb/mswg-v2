"use strict";

const {
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
  ListTablesCommand,
  waitUntilTableExists
} = require("@aws-sdk/client-dynamodb");

const LOCAL_CONFIG = Object.freeze({
  endpoint: process.env.DDB_ENDPOINT || "http://localhost:8000",
  region: process.env.AWS_REGION || "ap-southeast-1",
  riskTableName: process.env.RISK_TABLE_NAME || "mswg-rr-local-risks",
  historyTableName: process.env.HISTORY_TABLE_NAME || "mswg-rr-local-history"
});

function createLocalClient() {
  return new DynamoDBClient({
    endpoint: LOCAL_CONFIG.endpoint,
    region: LOCAL_CONFIG.region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "local",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "local"
    }
  });
}

const TABLES = Object.freeze([
  {
    TableName: LOCAL_CONFIG.riskTableName,
    BillingMode: "PAY_PER_REQUEST",
    AttributeDefinitions: [
      { AttributeName: "dept_id", AttributeType: "S" },
      { AttributeName: "risk_id", AttributeType: "S" }
    ],
    KeySchema: [
      { AttributeName: "dept_id", KeyType: "HASH" },
      { AttributeName: "risk_id", KeyType: "RANGE" }
    ]
  },
  {
    TableName: LOCAL_CONFIG.historyTableName,
    BillingMode: "PAY_PER_REQUEST",
    AttributeDefinitions: [
      { AttributeName: "risk_id", AttributeType: "S" },
      { AttributeName: "changed_at", AttributeType: "S" }
    ],
    KeySchema: [
      { AttributeName: "risk_id", KeyType: "HASH" },
      { AttributeName: "changed_at", KeyType: "RANGE" }
    ]
  }
]);

async function ensureTables(client = createLocalClient()) {
  const existing = new Set((await client.send(new ListTablesCommand({}))).TableNames || []);
  const created = [];

  for (const definition of TABLES) {
    if (!existing.has(definition.TableName)) {
      await client.send(new CreateTableCommand(definition));
      await waitUntilTableExists(
        { client, maxWaitTime: 20, minDelay: 1, maxDelay: 2 },
        { TableName: definition.TableName }
      );
      created.push(definition.TableName);
    }
  }

  const tables = [];
  for (const definition of TABLES) {
    const result = await client.send(new DescribeTableCommand({ TableName: definition.TableName }));
    tables.push({
      name: result.Table.TableName,
      status: result.Table.TableStatus,
      keys: result.Table.KeySchema.map(key => `${key.AttributeName}:${key.KeyType}`).join(", ")
    });
  }

  return { created, tables };
}

function applyLocalEnvironment() {
  process.env.AWS_REGION = LOCAL_CONFIG.region;
  process.env.AWS_ACCESS_KEY_ID ||= "local";
  process.env.AWS_SECRET_ACCESS_KEY ||= "local";
  process.env.DDB_ENDPOINT = LOCAL_CONFIG.endpoint;
  process.env.RISK_TABLE_NAME = LOCAL_CONFIG.riskTableName;
  process.env.HISTORY_TABLE_NAME = LOCAL_CONFIG.historyTableName;
  process.env.DEPARTMENT_GROUP_PREFIX ||= "rr-dept-";
}

module.exports = {
  LOCAL_CONFIG,
  TABLES,
  applyLocalEnvironment,
  createLocalClient,
  ensureTables
};
