"use strict";

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  ScanCommand,
  TransactWriteCommand
} = require("@aws-sdk/lib-dynamodb");
const { loadConfig } = require("./config");

let cached;

function context() {
  if (cached) return cached;
  const config = loadConfig();
  const options = { region: config.region };
  if (config.dynamoDbEndpoint) options.endpoint = config.dynamoDbEndpoint;
  const client = new DynamoDBClient(options);
  cached = {
    config,
    documentClient: DynamoDBDocumentClient.from(client, {
      marshallOptions: { removeUndefinedValues: true }
    })
  };
  return cached;
}

async function createAssessment(item, historyEvent) {
  const { config, documentClient } = context();
  await documentClient.send(new TransactWriteCommand({
    TransactItems: [
      {
        Put: {
          TableName: config.assessmentTableName,
          Item: item,
          ConditionExpression: "attribute_not_exists(assessment_id)"
        }
      },
      {
        Put: {
          TableName: config.historyTableName,
          Item: historyEvent,
          ConditionExpression: "attribute_not_exists(event_at)"
        }
      }
    ]
  }));
  return item;
}

async function replaceAssessment(item, historyEvent, expectedRecordVersion) {
  const { config, documentClient } = context();
  await documentClient.send(new TransactWriteCommand({
    TransactItems: [
      {
        Put: {
          TableName: config.assessmentTableName,
          Item: item,
          ConditionExpression: "record_version = :expectedVersion",
          ExpressionAttributeValues: { ":expectedVersion": expectedRecordVersion }
        }
      },
      {
        Put: {
          TableName: config.historyTableName,
          Item: historyEvent,
          ConditionExpression: "attribute_not_exists(event_at)"
        }
      }
    ]
  }));
  return item;
}

async function getAssessment(assessmentId) {
  const { config, documentClient } = context();
  const result = await documentClient.send(new GetCommand({
    TableName: config.assessmentTableName,
    Key: { assessment_id: assessmentId },
    ConsistentRead: true
  }));
  return result.Item;
}

async function listAssessments() {
  const { config, documentClient } = context();
  const items = [];
  let ExclusiveStartKey;
  do {
    const result = await documentClient.send(new ScanCommand({
      TableName: config.assessmentTableName,
      ExclusiveStartKey
    }));
    items.push(...(result.Items || []));
    ExclusiveStartKey = result.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items.sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
}

async function listHistory(assessmentId) {
  const { config, documentClient } = context();
  const items = [];
  let ExclusiveStartKey;
  do {
    const result = await documentClient.send(new QueryCommand({
      TableName: config.historyTableName,
      KeyConditionExpression: "assessment_id = :assessmentId",
      ExpressionAttributeValues: { ":assessmentId": assessmentId },
      ExclusiveStartKey,
      ScanIndexForward: true
    }));
    items.push(...(result.Items || []));
    ExclusiveStartKey = result.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

function resetForTests() {
  cached = undefined;
}

module.exports = {
  createAssessment,
  getAssessment,
  listAssessments,
  listHistory,
  replaceAssessment,
  resetForTests
};
