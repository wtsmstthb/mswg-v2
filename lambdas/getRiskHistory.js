const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({
  region: "ap-southeast-1",
  endpoint: "http://localhost:8000", // local DynamoDB, remove this line when deploying to real AWS
  credentials: {
    // dummy credentials, DynamoDB Local ignores these but the SDK requires something present
    // remove this whole credentials block when deploying to real AWS (real Lambda gets credentials automatically via IAM role)
    accessKeyId: "fakeMyKeyId",
    secretAccessKey: "fakeSecretAccessKey"
  }
});
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  try {
    const { risk_id } = event;

    if (!risk_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required field: risk_id" })
      };
    }

    // Query all historical rating changes for this risk, sorted chronologically
    // since changed_at is the sort key and stored as an ISO timestamp
    const result = await docClient.send(new QueryCommand({
      TableName: "mswg-risk-history",
      KeyConditionExpression: "risk_id = :risk_id",
      ExpressionAttributeValues: { ":risk_id": risk_id }
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ count: result.Items.length, items: result.Items })
    };
  } catch (err) {
    console.error("getRiskHistory error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch risk history", details: err.message })
    };
  }
};
