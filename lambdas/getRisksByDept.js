const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({
  endpoint: "http://localhost:8000",
  region: "ap-southeast-1",
  credentials: {
    accessKeyId: "fakeMyKeyId",
    secretAccessKey: "fakeSecretAccessKey",
  },
});

const docClient = DynamoDBDocumentClient.from(client);

// This is the actual Lambda handler shape AWS expects: (event) => response
exports.handler = async (event) => {
  const deptId = event.dept_id;
  const includeArchived = event.includeArchived === true || event.includeArchived === "true";

  if (!deptId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "dept_id is required" }),
    };
  }

  const result = await docClient.send(new QueryCommand({
    TableName: "mswg-risk-register",
    KeyConditionExpression: "dept_id = :d",
    ExpressionAttributeValues: {
      ":d": deptId,
    },
  }));

  const items = includeArchived
    ? result.Items
    : result.Items.filter(item => item.status !== "archived");

  return {
    statusCode: 200,
    body: JSON.stringify(items),
  };
};