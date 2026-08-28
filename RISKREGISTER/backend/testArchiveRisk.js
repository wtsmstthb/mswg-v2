const { handler } = require("./archiveRisk");

// Reuse the same risk_id from your earlier tests. Paste it below.
const RISK_ID = "88184e8c-9ad2-4ffd-92f4-581234ba1400";

async function run() {
  console.log("--- Test 1: unauthorized user tries to archive, should be rejected ---");
  const unauthorized = await handler({
    dept_id: "finance-admin",
    risk_id: RISK_ID,
    requested_by: "random-user"
  });
  console.log("Status:", unauthorized.statusCode);
  console.log("Body:", JSON.parse(unauthorized.body));

  console.log("\n--- Test 2: authorized admin archives the risk ---");
  const archived = await handler({
    dept_id: "finance-admin",
    risk_id: RISK_ID,
    requested_by: "lini-hazlinda"
  });
  console.log("Status:", archived.statusCode);
  console.log("Body:", JSON.parse(archived.body));

  console.log("\n--- Test 3: trying to archive an already-archived risk, should be rejected ---");
  const alreadyArchived = await handler({
    dept_id: "finance-admin",
    risk_id: RISK_ID,
    requested_by: "dr-ismet"
  });
  console.log("Status:", alreadyArchived.statusCode);
  console.log("Body:", JSON.parse(alreadyArchived.body));
}

run();
