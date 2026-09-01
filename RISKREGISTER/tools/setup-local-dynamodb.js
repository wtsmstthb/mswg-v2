"use strict";

const { LOCAL_CONFIG, createLocalClient, ensureTables } = require("./dynamodb-local");

async function main() {
  const client = createLocalClient();
  try {
    const result = await ensureTables(client);
    console.log(`Connected to ${LOCAL_CONFIG.endpoint}`);
    console.log(result.created.length ? `Created: ${result.created.join(", ")}` : "Tables already existed; nothing recreated.");
    for (const table of result.tables) {
      console.log(`${table.name} | ${table.status} | ${table.keys}`);
    }
  } finally {
    client.destroy();
  }
}

main().catch(error => {
  console.error("Local DynamoDB setup failed:", error.message);
  process.exitCode = 1;
});
