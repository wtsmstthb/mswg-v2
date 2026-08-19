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

Use the existing persistent `dynamodb-local` container. Stop/start is safe; do not remove it unless local data loss is intentional.

## Automated tests

The automated suite uses dependency-injected repositories and mocked API Gateway JWT claims, so Docker and AWS are not required:

```powershell
npm test
```

The old `lambdas/risk-register/test*.js` files are historical manual harnesses from the initial prototype. They are not part of the automated suite and should not be used as authorization evidence.

## Consolidated frontend

Use `Frontend/risk-register`. `config.js` contains local environment values and mock claims only. A deployment must replace it with the selected stack outputs; `config.prod.example.js` shows the required shape.

To test a different local identity, set `mswg_rr_mock_claims` in localStorage to a JSON claim object. This controls UI display only. Backend tests and deployed API authorization always use verified authorizer claims.
