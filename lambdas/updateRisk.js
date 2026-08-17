const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

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
  const month = now.getMonth();
  const quarter = Math.floor(month / 3) + 1;
  return { quarter: `Q${quarter}`, year };
}

exports.handler = async (event) => {
  try {
    const {
      dept_id,
      risk_id,
      requested_by, // will come from Cognito user identity once auth is wired in, hardcoded for local testing
      title,
      description,
      likelihood,
      impact,
      residual_rating
    } = event;

    if (!dept_id || !risk_id || !requested_by) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required fields: dept_id, risk_id, requested_by" })
      };
    }

    // Fetch the existing item to check ownership and compare rating
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

    // Strict creator-only match, per confirmed requirement
    if (existing.Item.created_by !== requested_by) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: "Only the creator of this risk can edit it" })
      };
    }

    const ratingChanged =
      residual_rating !== undefined && residual_rating !== existing.Item.residual_rating;

    // If the rating changed, write a historical record before updating the main item
    if (ratingChanged) {
      const { quarter, year } = getCurrentQuarterAndYear();
      await docClient.send(new PutCommand({
        TableName: "mswg-risk-history",
        Item: {
          risk_id,
          changed_at: new Date().toISOString(),
          dept_id,
          old_rating: existing.Item.residual_rating,
          new_rating: residual_rating,
          quarter,
          year,
          changed_by: requested_by
        }
      }));
    }

    // Build the update expression dynamically based on which fields were provided
    const updates = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (likelihood !== undefined) updates.likelihood = likelihood;
    if (impact !== undefined) updates.impact = impact;
    if (residual_rating !== undefined) updates.residual_rating = residual_rating;

    const updateExpressionParts = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    for (const [key, value] of Object.entries(updates)) {
      updateExpressionParts.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = value;
    }

    const result = await docClient.send(new UpdateCommand({
      TableName: "mswg-risk-register",
      Key: { dept_id, risk_id },
      UpdateExpression: `SET ${updateExpressionParts.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW"
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: ratingChanged ? "Risk updated, rating change recorded in history" : "Risk updated",
        item: result.Attributes
      })
    };
  } catch (err) {
    console.error("updateRisk error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to update risk", details: err.message })
    };
  }
};
