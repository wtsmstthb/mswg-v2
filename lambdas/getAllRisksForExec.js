const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");

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

// Once Cognito is wired in, this list check will be replaced by checking membership
// in the "risk-viewers-all" Cognito group carried in the login token.
const AUTHORIZED_VIEWERS = ["dr-ismet", "phua-jing-wei", "lini-hazlina"];

exports.handler = async (event) => {
  try {
    const { requested_by, dept_id } = event;
    const includeArchived = event.includeArchived === true || event.includeArchived === "true";

    if (!requested_by) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required field: requested_by" })
      };
    }

    // Hardcoded permission check for local testing, replaced by Cognito group check later
    if (!AUTHORIZED_VIEWERS.includes(requested_by)) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: "You are not authorized to view all risks" })
      };
    }

    let items;

    if (dept_id) {
      // Filtered to a single department
      const result = await docClient.send(new QueryCommand({
        TableName: "mswg-risk-register",
        KeyConditionExpression: "dept_id = :dept_id",
        ExpressionAttributeValues: { ":dept_id": dept_id }
      }));
      items = result.Items;
    } else {
      // No filter, return every risk across every department
      const result = await docClient.send(new ScanCommand({
        TableName: "mswg-risk-register"
      }));
      items = result.Items;
    }
    if (!includeArchived) {
  items = items.filter(item => item.status !== "archived");
}

    return {
      statusCode: 200,
      body: JSON.stringify({ count: items.length, items })
    };
  } catch (err) {
    console.error("getAllRisksForExec error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch risks", details: err.message })
    };
  }
};
