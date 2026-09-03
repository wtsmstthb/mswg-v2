# Risk Register

- `frontend` — permission-aware browser application using the Risk Register API
- `backend` — six DynamoDB Lambda handlers with creator-only edits, version protection, and audit history
- `tests` — authorization, configuration, static frontend, and persistence-wiring tests
- `tools` — DynamoDB Local setup, real lifecycle test, and local browser/API server
- `docs` — RR decisions, access matrix, and acceptance records
- `legacy` — retained historical prototypes and manual database checks

## Run the complete application locally

You do not need PostgreSQL, MongoDB, or an AWS account. The existing Docker container supplies DynamoDB Local.

1. Start the database:

   ```powershell
   docker start rr-dynamodb
   ```

2. Start the Risk Register web/API server from `C:\Projects\RR`:

   ```powershell
   node RISKREGISTER\tools\serve-risk-local.js
   ```

3. Open `http://localhost:3200/RISKREGISTER/frontend/dashboard.html`.

4. Use **Test as** in the top bar to switch between Full visibility, IT HOD, and CM HOD. Each selection changes both the page permissions and the verified claims sent to the local handlers.

5. Register a risk, reload the page, edit it, open **History**, and use **Archived** as the full-visibility user. Those operations read and write the two persistent local DynamoDB tables.

## Evidence checks

```powershell
node --test RISKREGISTER\tests\*.test.js
node RISKREGISTER\tools\test-local-dynamodb.js
```

The second command creates a uniquely named test record, verifies department isolation and versioned editing, checks update and archive history, soft-archives it, and leaves that archived record in the local database as inspectable evidence.
