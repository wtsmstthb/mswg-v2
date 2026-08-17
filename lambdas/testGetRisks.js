const { handler } = require("./getRisksByDept");

async function run() {
  const response = await handler({ dept_id: "legal" });
  console.log("Status:", response.statusCode);
  console.log("Body:", JSON.parse(response.body));
}

run();


