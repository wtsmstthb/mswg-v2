const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({
  region: "ap-southeast-1",
  endpoint: "http://localhost:8000", // local DynamoDB, remove this line when deploying to real AWS
  credentials: {
    // dummy credentials, DynamoDB Local ignores these but the SDK requires something present
    // remove this whole credentials block when deploying to real AWS (real Lambda gets credentials automatically via IAM role)
    accessKeyId: "fakeMyKeyId",
    asecretAccessKey: "fakeSecretAccessKey"
  }
});
const docClient = DynamoDBDocumentClient.from(client);

// Same 3 people authorized to view all risks are also the only ones who can archive.
// Once Cognito is wired in, this will check membership in the "risk-viewers-all" group instead.
const AUTHORIZED_ADMINS = ["dr-ismet", "phua-jing-wei", "lini-hazlinda"];

exports.handler = async (event) => {
  try {
    const { dept_id, risk_id, requested_by } = event;

    if (!dept_id || !risk_id || !requested_by) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required fields: dept_id, risk_id, requested_by" })
      };
    }

    if (!AUTHORIZED_ADMINS.includes(requested_by)) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: "Only CEO, Phua Jing Wei, or Lini Hazlinda can archive a risk" })
      };
    }

    const existing = await docClient.send(new GetCommand({
      TableName: "mswg-risk-register",
      Key: { dept_id, risk_id }
    }));

    if (!existing.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Risk not found" })
      };
    }

    if (existing.Item.status === "archived") {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Risk is already archived" })
      };
    }

    // Soft delete only: item stays in the table permanently for historical comparison,
    // just flagged as archived. Nothing is removed.
    const result = await docClient.send(new UpdateCommand({
      TableName: "mswg-risk-register",
      Key: { dept_id, risk_id },
      UpdateExpression: "SET #status = :archived, archived_by = :archived_by, archived_at = :archived_at",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":archived": "archived",
        ":archived_by": requested_by,
        ":archived_at": new Date().toISOString()
      },
      ReturnValues: "ALL_NEW"
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Risk archived", item: result.Attributes })
    };
  } catch (err) {
    console.error("archiveRisk error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to archive risk", details: err.message })
    };
  }
};
