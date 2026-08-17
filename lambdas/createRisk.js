const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const crypto = require("crypto");

const client = new DynamoDBClient({
  region: "ap-southeast-1",
  endpoint: "http://localhost:8000",
  credentials: {
    accessKeyId: "fakeMyKeyId",
    secretAccessKey: "fakeSecretAccessKey"
  }
});
const docClient = DynamoDBDocumentClient.from(client);

function getCurrentQuarterAndYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const quarter = Math.floor(month / 3) + 1;
  return { quarter: `Q${quarter}`, year };
}

exports.handler = async (event) => {
  try {
    const {
      dept_id,      // will come from Cognito group membership once auth is wired in, hardcoded for local testing
      created_by,   // will come from Cognito user identity once auth is wired in, hardcoded for local testing
      title,
      description,
      likelihood,
      impact,
      residual_rating
    } = event;

    // Basic required-field check, real validation can be expanded later
    if (!dept_id || !created_by || !title || !residual_rating) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required fields: dept_id, created_by, title, residual_rating" })
      };
    }

    const risk_id = crypto.randomUUID();
    const { quarter, year } = getCurrentQuarterAndYear();
    const now = new Date().toISOString();

    const item = {
      dept_id,
      risk_id,
      created_by,
      title,
      description: description || "",
      likelihood: likelihood || null,
      impact: impact || null,
      residual_rating,
      quarter,
      year,
      created_at: now,
      updated_at: now
    };

    await docClient.send(new PutCommand({
      TableName: "mswg-risk-register",
      Item: item,
      // Extra safety: this also prevents an accidental overwrite of an existing risk_id,
      // though a UUID collision is effectively impossible
      ConditionExpression: "attribute_not_exists(risk_id)"
    }));

    return {
      statusCode: 201,
      body: JSON.stringify({ message: "Risk created", item })
    };
  } catch (err) {
    console.error("createRisk error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to create risk", details: err.message })
    };
  }
};
