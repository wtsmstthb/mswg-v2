const { handler } = require("./getRiskHistory");

// Reuse the same risk_id you used for testUpdateRisk.js, so there's
// an actual history record to fetch. Paste it below.
const RISK_ID = "88184e8c-9ad2-4ffd-92f4-581234ba1400";

async function run() {
  const result = await handler({ risk_id: RISK_ID });
  console.log("Status:", result.statusCode);
  console.log("Body:", JSON.parse(result.body));
}

run();
