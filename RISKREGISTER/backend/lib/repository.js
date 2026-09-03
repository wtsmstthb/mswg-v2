"use strict";

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  TransactWriteCommand
} = require("@aws-sdk/lib-dynamodb");
const { loadConfig } = require("./config");
const { HttpError } = require("./http");

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

async function updateRiskWithHistory({ existing, changes, expectedVersion, userId, changedAt }) {
  const { config, documentClient } = getContext();
  const updatedAt = changedAt;
  const nextVersion = expectedVersion + 1;
  const updateValues = { ...changes, updated_at: updatedAt, record_version: nextVersion };
  const names = {};
  const values = {
    ":expectedCreator": userId,
    ":archived": "archived",
    ":expectedVersion": expectedVersion
  };
  const assignments = [];

  for (const [field, value] of Object.entries(updateValues)) {
    const nameKey = `#field${assignments.length}`;
    const valueKey = `:value${assignments.length}`;
    names[nameKey] = field;
    values[valueKey] = value;
    assignments.push(`${nameKey} = ${valueKey}`);
  }
  names["#status"] = "status";
  names["#recordVersion"] = "record_version";

  const nextItem = { ...existing, ...changes, updated_at: updatedAt, record_version: nextVersion };
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

  try {
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
          ConditionExpression: "created_by = :expectedCreator AND (#status <> :archived OR attribute_not_exists(#status)) AND (#recordVersion = :expectedVersion OR attribute_not_exists(#recordVersion))",
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values
        }
        }
      ]
    }));
  } catch (error) {
    if (error?.name === "TransactionCanceledException" || error?.name === "ConditionalCheckFailedException") {
      throw new HttpError(409, "This risk was changed by another request. Reload before saving.", "VERSION_CONFLICT");
    }
    throw error;
  }

  return { item: nextItem, historyItem };
}

async function archiveRisk({ existing, departmentId, riskId, userId, archivedAt }) {
  const { config, documentClient } = getContext();
  const expectedVersion = existing.record_version || 1;
  const nextVersion = expectedVersion + 1;
  const changedDate = new Date(archivedAt);
  const historyItem = {
    risk_id: riskId,
    changed_at: archivedAt,
    dept_id: departmentId,
    change_type: "archive",
    changed_by: userId,
    quarter: `Q${Math.floor(changedDate.getUTCMonth() / 3) + 1}`,
    year: changedDate.getUTCFullYear(),
    changed_fields: ["status"],
    before: { status: existing.status || "active" },
    after: { status: "archived" }
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
          Key: { dept_id: departmentId, risk_id: riskId },
          UpdateExpression: "SET #status = :archived, archived_by = :userId, archived_at = :archivedAt, updated_at = :archivedAt, record_version = :nextVersion",
          ConditionExpression: "attribute_exists(risk_id) AND (#status <> :archived OR attribute_not_exists(#status)) AND (#recordVersion = :expectedVersion OR attribute_not_exists(#recordVersion))",
          ExpressionAttributeNames: { "#status": "status", "#recordVersion": "record_version" },
          ExpressionAttributeValues: {
            ":archived": "archived",
            ":userId": userId,
            ":archivedAt": archivedAt,
            ":expectedVersion": expectedVersion,
            ":nextVersion": nextVersion
          }
        }
      }
    ]
  })).catch(error => {
    if (error?.name === "TransactionCanceledException" || error?.name === "ConditionalCheckFailedException") {
      throw new HttpError(409, "This risk changed before it could be archived. Reload and try again.", "VERSION_CONFLICT");
    }
    throw error;
  });
  return {
    ...existing,
    status: "archived",
    archived_by: userId,
    archived_at: archivedAt,
    updated_at: archivedAt,
    record_version: nextVersion
  };
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
