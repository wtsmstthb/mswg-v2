"use strict";

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  TransactWriteCommand,
  UpdateCommand
} = require("@aws-sdk/lib-dynamodb");
const { loadConfig } = require("./config");

let cached;

function getContext() {
  if (cached) return cached;

  const config = loadConfig();
  const clientOptions = { region: config.region };
  if (config.dynamoDbEndpoint) clientOptions.endpoint = config.dynamoDbEndpoint;

  const client = new DynamoDBClient(clientOptions);
  cached = {
    config,
    documentClient: DynamoDBDocumentClient.from(client, {
      marshallOptions: { removeUndefinedValues: true }
    })
  };
  return cached;
}

async function collectPages(commandFactory) {
  const items = [];
  let exclusiveStartKey;
  do {
    const result = await getContext().documentClient.send(commandFactory(exclusiveStartKey));
    items.push(...(result.Items || []));
    exclusiveStartKey = result.LastEvaluatedKey;
  } while (exclusiveStartKey);
  return items;
}

async function createRisk(item) {
  const { config, documentClient } = getContext();
  await documentClient.send(new PutCommand({
    TableName: config.riskTableName,
    Item: item,
    ConditionExpression: "attribute_not_exists(risk_id)"
  }));
  return item;
}

async function getRisk(departmentId, riskId) {
  const { config, documentClient } = getContext();
  const result = await documentClient.send(new GetCommand({
    TableName: config.riskTableName,
    Key: { dept_id: departmentId, risk_id: riskId },
    ConsistentRead: true
  }));
  return result.Item;
}

async function listDepartmentRisks(departmentId) {
  const { config } = getContext();
  return collectPages(exclusiveStartKey => new QueryCommand({
    TableName: config.riskTableName,
    KeyConditionExpression: "dept_id = :departmentId",
    ExpressionAttributeValues: { ":departmentId": departmentId },
    ExclusiveStartKey: exclusiveStartKey
  }));
}

async function listAllRisks(departmentId) {
  const { config } = getContext();
  if (departmentId) return listDepartmentRisks(departmentId);
  return collectPages(exclusiveStartKey => new ScanCommand({
    TableName: config.riskTableName,
    ExclusiveStartKey: exclusiveStartKey
  }));
}

async function listRiskHistory(riskId) {
  const { config } = getContext();
  return collectPages(exclusiveStartKey => new QueryCommand({
    TableName: config.historyTableName,
    KeyConditionExpression: "risk_id = :riskId",
    ExpressionAttributeValues: { ":riskId": riskId },
    ExclusiveStartKey: exclusiveStartKey,
    ScanIndexForward: true
  }));
}

async function updateRiskWithHistory({ existing, changes, userId, changedAt }) {
  const { config, documentClient } = getContext();
  const updatedAt = changedAt;
  const updateValues = { ...changes, updated_at: updatedAt };
  const names = {};
  const values = { ":expectedCreator": userId, ":archived": "archived" };
  const assignments = [];

  for (const [field, value] of Object.entries(updateValues)) {
    const nameKey = `#field${assignments.length}`;
    const valueKey = `:value${assignments.length}`;
    names[nameKey] = field;
    values[valueKey] = value;
    assignments.push(`${nameKey} = ${valueKey}`);
  }
  names["#status"] = "status";

  const nextItem = { ...existing, ...changes, updated_at: updatedAt };
  const changedFields = Object.keys(changes);
  const changedDate = new Date(changedAt);
  const historyItem = {
    risk_id: existing.risk_id,
    changed_at: changedAt,
    dept_id: existing.dept_id,
    change_type: "update",
    changed_by: userId,
    quarter: `Q${Math.floor(changedDate.getUTCMonth() / 3) + 1}`,
    year: changedDate.getUTCFullYear(),
    changed_fields: changedFields,
    old_rating: existing.residual_rating,
    new_rating: nextItem.residual_rating,
    before: Object.fromEntries(changedFields.map(field => [field, existing[field] ?? null])),
    after: Object.fromEntries(changedFields.map(field => [field, nextItem[field] ?? null]))
  };

  await documentClient.send(new TransactWriteCommand({
    TransactItems: [
      {
        Put: {
          TableName: config.historyTableName,
          Item: historyItem,
          ConditionExpression: "attribute_not_exists(changed_at)"
        }
      },
      {
        Update: {
          TableName: config.riskTableName,
          Key: { dept_id: existing.dept_id, risk_id: existing.risk_id },
          UpdateExpression: `SET ${assignments.join(", ")}`,
          ConditionExpression: "created_by = :expectedCreator AND (#status <> :archived OR attribute_not_exists(#status))",
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values
        }
      }
    ]
  }));

  return { item: nextItem, historyItem };
}

async function archiveRisk({ departmentId, riskId, userId, archivedAt }) {
  const { config, documentClient } = getContext();
  const result = await documentClient.send(new UpdateCommand({
    TableName: config.riskTableName,
    Key: { dept_id: departmentId, risk_id: riskId },
    UpdateExpression: "SET #status = :archived, archived_by = :userId, archived_at = :archivedAt, updated_at = :archivedAt",
    ConditionExpression: "attribute_exists(risk_id) AND (#status <> :archived OR attribute_not_exists(#status))",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: {
      ":archived": "archived",
      ":userId": userId,
      ":archivedAt": archivedAt
    },
    ReturnValues: "ALL_NEW"
  }));
  return result.Attributes;
}

function resetForTests() {
  cached = undefined;
}

module.exports = {
  archiveRisk,
  createRisk,
  getRisk,
  listAllRisks,
  listDepartmentRisks,
  listRiskHistory,
  resetForTests,
  updateRiskWithHistory
};
