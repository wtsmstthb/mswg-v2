const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");

// Point at DynamoDB Local, not real AWS
const client = new DynamoDBClient({
  endpoint: "http://localhost:8000",
  region: "ap-southeast-1",
  credentials: {
    accessKeyId: "fakeMyKeyId",
    secretAccessKey: "fakeSecretAccessKey",
  },
});

const docClient = DynamoDBDocumentClient.from(client);

async function main() {
  // Write a test item
  await docClient.send(new PutCommand({
    TableName: "mswg-risk-register",
    Item: {
      dept_id: "legal",
      risk_id: "RISK-002",
      title: "Contract renewal delay",
      quarter: "Q3-2026",
      residual_rating: "Medium Low",
    },
  }));
  console.log("Item written.");

  // Read it back
  const result = await docClient.send(new GetCommand({
    TableName: "mswg-risk-register",
    Key: {
      dept_id: "legal",
      risk_id: "RISK-002",
    },
  }));
  console.log("Item read back:", result.Item);
}

main().catch((err) => console.error("Error:", err));