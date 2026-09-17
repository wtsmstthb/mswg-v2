# MSWG Internal Platforms

This repository contains Risk Register, Conduct of AGM and Pre-Voting behind a shared portal. The current AWS template covers RR and AGM; Pre-Voting deployment remains separate work.

Authentication cleanup: real Cognito sign-in is now required, including on local web servers. Install the verifier with `npm ci --prefix shared/auth`, then configure the pool/client and frontend sign-in settings. The previous role selectors and fabricated history fallback have been removed. See [the cleanup and configuration report](shared/docs/hardcoded-cleanup.md) before following older local/demo instructions.

```text
RR/
├── RISKREGISTER/
│   ├── frontend/
│   ├── backend/
│   ├── tests/
│   ├── tools/
│   └── docs/
├── AGM/
│   ├── frontend/
│   ├── backend/
│   ├── tests/
│   ├── tools/
│   └── docs/
├── PRE-VOTING/
│   ├── frontend/
│   ├── backend/
│   └── testing/
├── shared/
│   ├── portal/
│   ├── auth/
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
node RISKREGISTER\tools\serve-risk-local.js
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

The local Risk Register opens at `http://localhost:3200/RISKREGISTER/frontend/dashboard.html`.
The local AGM application opens at `http://localhost:3100/AGM/frontend/records.html`.

## Shared components

- `shared/portal` contains the platform-selection page.
- `shared/infrastructure/template.yaml` deploys the shared Cognito, API, hosting, RR, and AGM resources.
- `dynamodb-data` remains at the root because the existing `rr-dynamodb` container mounts this exact folder.

Read `shared/docs/local-readiness-status.md` before deployment work.
