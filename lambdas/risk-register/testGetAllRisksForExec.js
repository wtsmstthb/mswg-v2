const { handler } = require("./getAllRisksForExec");

async function runTests() {
  console.log("Test 1: unauthorized viewer should be rejected");
  const unauthorized = await handler({ requested_by: "not-a-real-viewer" });
  console.log(unauthorized);

  console.log("\nTest 2: authorized viewer, all departments, archived hidden by default");
  const allDepts = await handler({ requested_by: "dr-ismet" });
  console.log(allDepts);

  console.log("\nTest 3: authorized viewer, single department filter");
  const singleDept = await handler({ requested_by: "phua-jing-wei", dept_id: "finance-admin" });
  console.log(singleDept);

  console.log("\nTest 4: authorized viewer, includeArchived true, should show archived risks too");
  const withArchived = await handler({ requested_by: "lini-hazlina", includeArchived: true });
  console.log(withArchived);
}

runTests();