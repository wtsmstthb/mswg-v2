"use strict";

const { DynamoDBDocumentClient, GetCommand, QueryCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const {
  AGM_LOCAL_CONFIG,
  applyAgmLocalEnvironment,
  createAgmLocalClient,
  ensureAgmTables
} = require("./agm-dynamodb-local");

applyAgmLocalEnvironment();

async function main() {
  const lowLevelClient = createAgmLocalClient();
  try {
    await ensureAgmTables(lowLevelClient);
    const documentClient = DynamoDBDocumentClient.from(lowLevelClient);
    const assessmentId = process.argv[2];
    if (!assessmentId) {
      const result = await documentClient.send(new ScanCommand({ TableName: AGM_LOCAL_CONFIG.assessmentTableName }));
      const rows = (result.Items || []).sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at))).map(item => ({
        assessment_id: item.assessment_id,
        company: item.fields?.company || "",
        status: item.status,
        revision: item.revision,
        score: item.scores?.percentage ?? "—",
        updated_at: item.updated_at
      }));
      console.table(rows);
      console.log(`${rows.length} assessment record(s). Pass an assessment ID to inspect its data and history.`);
      return;
    }

    const assessment = await documentClient.send(new GetCommand({
      TableName: AGM_LOCAL_CONFIG.assessmentTableName,
      Key: { assessment_id: assessmentId },
      ConsistentRead: true
    }));
    if (!assessment.Item) throw new Error(`Assessment not found: ${assessmentId}`);
    const history = await documentClient.send(new QueryCommand({
      TableName: AGM_LOCAL_CONFIG.historyTableName,
      KeyConditionExpression: "assessment_id = :assessmentId",
      ExpressionAttributeValues: { ":assessmentId": assessmentId },
      ScanIndexForward: true
    }));

    console.log("ASSESSMENT");
    console.dir(assessment.Item, { depth: 5, colors: true });
    console.log("HISTORY");
    console.table((history.Items || []).map(event => ({
      event_type: event.event_type,
      revision: event.revision,
      status: event.status,
      actor: event.actor_name,
      event_at: String(event.event_at).split("#")[0]
    })));
  } finally {
    lowLevelClient.destroy();
  }
}

main().catch(error => {
  console.error("AGM database inspection failed:", error.message);
  process.exitCode = 1;
});
