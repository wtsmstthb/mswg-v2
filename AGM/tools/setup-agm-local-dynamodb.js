"use strict";

const { AGM_LOCAL_CONFIG, createAgmLocalClient, ensureAgmTables } = require("./agm-dynamodb-local");

async function main() {
  const client = createAgmLocalClient();
  try {
    const result = await ensureAgmTables(client);
    console.log(`Connected to ${AGM_LOCAL_CONFIG.endpoint}`);
    console.log(result.created.length ? `Created: ${result.created.join(", ")}` : "AGM tables already existed; nothing recreated.");
    result.tables.forEach(table => console.log(`${table.name} | ${table.status} | ${table.keys}`));
  } finally {
    client.destroy();
  }
}

main().catch(error => {
  console.error("AGM local DynamoDB setup failed:", error.message);
  process.exitCode = 1;
});
