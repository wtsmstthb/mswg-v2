# Local Development

## Backend configuration

Copy the values from `.env.example` into the current PowerShell session or your approved local runner. The application intentionally does not auto-load a committed `.env` file.

Required variables:

- `AWS_REGION`
- `RISK_TABLE_NAME`
- `HISTORY_TABLE_NAME`

Local-only variables:

- `DDB_ENDPOINT=http://localhost:8000`
- Dummy `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`, required by the SDK only when using DynamoDB Local

AWS Lambda supplies region and IAM credentials automatically. Deployed environments omit `DDB_ENDPOINT` and receive table names from the SAM stack.

## DynamoDB Local

The local database runs in Docker; PostgreSQL and MongoDB are not required.

Current container:

- Name: `rr-dynamodb`
- Image: `amazon/dynamodb-local`
- Address: `http://localhost:8000`
- Host data folder: `C:\Projects\RR\dynamodb-data`
- Options: `-sharedDb -dbPath /home/dynamodblocal/data`

Start the existing container:

```powershell
docker start rr-dynamodb
```

Confirm that it is running:

```powershell
docker ps --filter "name=rr-dynamodb"
```

Create or verify the two current tables:

```powershell
node RISKREGISTER\tools\setup-local-dynamodb.js
```

The setup is idempotent: it creates a missing table but does not replace or delete an existing table.

Run the real database lifecycle test:

```powershell
node RISKREGISTER\tools\test-local-dynamodb.js
```

The integration test covers create, department isolation, full-visibility denial, transactional update, audit history, privileged soft archive, and archived-record filtering. It leaves the archived local test record in the persistent database as evidence.

Run the Risk Register browser and its local API adapter:

```powershell
node RISKREGISTER\tools\serve-risk-local.js
```

Open `http://localhost:3200/RISKREGISTER/frontend/dashboard.html`. The server creates missing tables, serves the existing frontend, converts local test roles into verified authorizer claims, and invokes the same six handlers used by the AWS HTTP API.

Stopping and starting the container is safe. Removing the container is also safe only while the mounted `dynamodb-data` folder is retained. Deleting that folder deletes the local database.

## Automated tests

The automated suite uses dependency-injected repositories and mocked API Gateway JWT claims, so Docker and AWS are not required:

```powershell
node --test .\RISKREGISTER\tests\*.test.js .\AGM\tests\*.test.js .\shared\tests\*.test.js
```

These tests are separate from `node RISKREGISTER\tools\test-local-dynamodb.js`. The standard suite proves application and authorization behaviour; the Docker integration script proves actual DynamoDB reads, writes, transactions, queries, and persistence.

The old `RISKREGISTER/backend/test*.js` files are historical manual harnesses from the initial prototype. They are not part of the automated suite and should not be used as authorization evidence.

## Consolidated Risk Register frontend

Use `RISKREGISTER/frontend`. Its risk records are API-backed; browser localStorage is used only for non-record preferences such as the collapsed sidebar and selected local test role. A deployment must replace local `config.js` values with the selected stack outputs; `config.prod.example.js` shows the required shape.

Use the **Test as** selector to exercise a full-visibility user, an IT HOD, or a Corporate Monitoring HOD. The local API adapter applies the matching verified claims server-side; production always uses Cognito/API Gateway claims.
