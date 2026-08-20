# MSWG Risk Register

MSWG RR is a department-scoped risk-register application with creator-only editing, permanent update history, privileged cross-department visibility, and soft archiving.

## Current local deliverables

- `Frontend/risk-register` — consolidated permission-aware Risk Register frontend
- `Frontend/portal`, `Frontend/pre-voting`, and `Frontend/agm-conduct` — reserved application folders
- `lambdas/risk-register` — Risk Register API handlers using verified Cognito authorizer claims
- `lambdas/pre-voting` and `lambdas/agm-conduct` — reserved backend folders
- `tests` — automated authorization, validation, configuration, and frontend tests
- `infrastructure/template.yaml` — repeatable SAM/CloudFormation infrastructure
- `docs` — access, deployment, IAM, local-development, and acceptance records
- `outputs/rr-local-readiness/MSWG_RR_User_Accounts.xlsx` — password-free provisioning roster
- `MSWG_RR_Super_Brief.md` — authoritative project continuity brief

## Verify locally

```powershell
npm test
```

The automated suite does not require Docker or AWS. DynamoDB Local is used only for manual integration checks.

## Current constraints

- The company-owned AWS account and approved deployment role are not yet available.
- SAM CLI is not installed on this workstation, so `sam validate --lint` and `sam build` are pending.
- Company emails and named owner/administrator confirmations are still required.
- The consolidated frontend has the authenticated API client and login flow, but its prototype pages still use localStorage until deployed API integration is completed.

Read `docs/local-readiness-status.md` before continuing implementation.
