"use strict";

const {
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
  ListTablesCommand,
  waitUntilTableExists
} = require("@aws-sdk/client-dynamodb");

const AGM_LOCAL_CONFIG = Object.freeze({
  endpoint: process.env.DDB_ENDPOINT || "http://localhost:8000",
  region: process.env.AWS_REGION || "ap-southeast-1",
  assessmentTableName: process.env.AGM_ASSESSMENT_TABLE_NAME || "mswg-agm-local-assessments",
  historyTableName: process.env.AGM_HISTORY_TABLE_NAME || "mswg-agm-local-history"
});

const AGM_TABLES = Object.freeze([
  {
    TableName: AGM_LOCAL_CONFIG.assessmentTableName,
    BillingMode: "PAY_PER_REQUEST",
    AttributeDefinitions: [{ AttributeName: "assessment_id", AttributeType: "S" }],
    KeySchema: [{ AttributeName: "assessment_id", KeyType: "HASH" }]
  },
  {
    TableName: AGM_LOCAL_CONFIG.historyTableName,
    BillingMode: "PAY_PER_REQUEST",
    AttributeDefinitions: [
      { AttributeName: "assessment_id", AttributeType: "S" },
      { AttributeName: "event_at", AttributeType: "S" }
    ],
    KeySchema: [
      { AttributeName: "assessment_id", KeyType: "HASH" },
      { AttributeName: "event_at", KeyType: "RANGE" }
    ]
  }
]);

function createAgmLocalClient() {
  return new DynamoDBClient({
    endpoint: AGM_LOCAL_CONFIG.endpoint,
    region: AGM_LOCAL_CONFIG.region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "local",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "local"
    }
  });
}

function applyAgmLocalEnvironment() {
  process.env.AWS_REGION = AGM_LOCAL_CONFIG.region;
  process.env.AWS_ACCESS_KEY_ID ||= "local";
  process.env.AWS_SECRET_ACCESS_KEY ||= "local";
  process.env.DDB_ENDPOINT = AGM_LOCAL_CONFIG.endpoint;
  process.env.AGM_ASSESSMENT_TABLE_NAME = AGM_LOCAL_CONFIG.assessmentTableName;
  process.env.AGM_HISTORY_TABLE_NAME = AGM_LOCAL_CONFIG.historyTableName;
}

async function ensureAgmTables(client = createAgmLocalClient()) {
  const existing = new Set((await client.send(new ListTablesCommand({}))).TableNames || []);
  const created = [];
  for (const definition of AGM_TABLES) {
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
  for (const definition of AGM_TABLES) {
    const result = await client.send(new DescribeTableCommand({ TableName: definition.TableName }));
    tables.push({
      name: result.Table.TableName,
      status: result.Table.TableStatus,
      keys: result.Table.KeySchema.map(key => `${key.AttributeName}:${key.KeyType}`).join(", ")
    });
  }
  return { created, tables };
}

module.exports = {
  AGM_LOCAL_CONFIG,
  AGM_TABLES,
  applyAgmLocalEnvironment,
  createAgmLocalClient,
  ensureAgmTables
};
