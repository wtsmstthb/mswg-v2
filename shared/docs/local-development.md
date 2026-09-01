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

Stopping and starting the container is safe. Removing the container is also safe only while the mounted `dynamodb-data` folder is retained. Deleting that folder deletes the local database.

## Automated tests

The automated suite uses dependency-injected repositories and mocked API Gateway JWT claims, so Docker and AWS are not required:

```powershell
node --test .\RISKREGISTER\tests\*.test.js .\AGM\tests\*.test.js .\shared\tests\*.test.js
```

These tests are separate from `node RISKREGISTER\tools\test-local-dynamodb.js`. The standard suite proves application and authorization behaviour; the Docker integration script proves actual DynamoDB reads, writes, transactions, queries, and persistence.

The old `RISKREGISTER/backend/test*.js` files are historical manual harnesses from the initial prototype. They are not part of the automated suite and should not be used as authorization evidence.

## Consolidated frontend

Use `RISKREGISTER/frontend`. `config.js` contains local environment values and mock claims only. A deployment must replace it with the selected stack outputs; `config.prod.example.js` shows the required shape.

To test a different local identity, set `mswg_rr_mock_claims` in localStorage to a JSON claim object. This controls UI display only. Backend tests and deployed API authorization always use verified authorizer claims.
