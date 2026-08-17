const { handler } = require("./updateRisk");

// Before running this, run testCreateRisk.js first and copy the risk_id
// it prints in the output, paste it below.
const RISK_ID = "88184e8c-9ad2-4ffd-92f4-581234ba1400";

async function run() {
  console.log("--- Test 1: minor edit, no rating change, no history expected ---");
  const minorEdit = await handler({
    dept_id: "finance-admin",
    risk_id: RISK_ID,
    requested_by: "user-test-001",
    title: "Late submission of quarterly financial report (corrected typo)"
  });
  console.log("Status:", minorEdit.statusCode);
  console.log("Body:", JSON.parse(minorEdit.body));

  console.log("\n--- Test 2: rating change, history record expected ---");
  const ratingChange = await handler({
    dept_id: "finance-admin",
    risk_id: RISK_ID,
    requested_by: "user-test-001",
    residual_rating: "Low"
  });
  console.log("Status:", ratingChange.statusCode);
  console.log("Body:", JSON.parse(ratingChange.body));

  console.log("\n--- Test 3: wrong user tries to edit, should be rejected ---");
  const wrongUser = await handler({
    dept_id: "finance-admin",
    risk_id: RISK_ID,
    requested_by: "someone-else",
    title: "Trying to edit someone else's risk"
  });
  console.log("Status:", wrongUser.statusCode);
  console.log("Body:", JSON.parse(wrongUser.body));
}

run();