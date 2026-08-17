const { handler } = require("./createRisk");

async function run() {
  const testEvent = {
    dept_id: "finance-admin",
    created_by: "user-test-001",
    title: "Late submission of quarterly financial report",
    description: "Risk of missing regulatory filing deadline",
    likelihood: "Medium",
    impact: "High",
    residual_rating: "Medium High"
  };

  const result = await handler(testEvent);
  console.log("Status:", result.statusCode);
  console.log("Body:", JSON.parse(result.body));
}

run();