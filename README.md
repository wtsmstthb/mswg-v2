# MSWG Internal Platforms

This repository contains two separate applications with a shared portal, AWS stack, and local DynamoDB data.

```text
RR/
├── RISKREGISTER/
│   ├── frontend/
│   ├── backend/
│   ├── tests/
│   ├── tools/
│   ├── docs/
│   └── legacy/
├── AGM/
│   ├── frontend/
│   ├── backend/
│   ├── tests/
│   ├── tools/
│   ├── docs/
│   └── archive/
├── shared/
│   ├── portal/
│   ├── infrastructure/
│   ├── docs/
│   ├── licenses/
│   └── design-assets/
└── dynamodb-data/
```

## Risk Register

```powershell
node --test .\RISKREGISTER\tests\*.test.js
node RISKREGISTER\tools\setup-local-dynamodb.js
node RISKREGISTER\tools\test-local-dynamodb.js
```

## Conduct of AGM

```powershell
node --test .\AGM\tests\*.test.js
node AGM\tools\setup-agm-local-dynamodb.js
node AGM\tools\test-agm-local-dynamodb.js
node AGM\tools\serve-agm-local.js
```

Run every platform and repository-structure test together:

```powershell
node --test .\RISKREGISTER\tests\*.test.js .\AGM\tests\*.test.js .\shared\tests\*.test.js
```

The local AGM application opens at `http://localhost:3100/AGM/frontend/records.html`.

## Shared components

- `shared/portal` contains the platform-selection page.
- `shared/infrastructure/template.yaml` deploys the shared Cognito, API, hosting, RR, and AGM resources.
- `dynamodb-data` remains at the root because the existing `rr-dynamodb` container mounts this exact folder.

Read `shared/docs/local-readiness-status.md` before deployment work.
