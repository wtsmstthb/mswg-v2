# MSWG RR — Project Brief

Paste this at the start of a new chat to bring it up to speed without re-explaining everything.

## What this is

MSWG RR is a department-scoped risk register dashboard for MSWG (Minority Shareholder Watchdog Group), a small organization with 28 people total. Each department logs in and sees only its own risk register: a filterable table, a risk matrix (impact vs likelihood), a residual-rating chart, and a "Register risk" form.

## Who's building this

One person (final-year student, working solo, studying toward AWS SAA-C03, so the AWS stack doubles as exam-relevant experience). Working hands-on, one guided step at a time, pasting terminal output back for review before proceeding. Switched from Notepad to VS Code (Open Folder on `C:\Projects\RR`, autosave on) this session after repeated save/paste mismatches.

## Local environment (confirmed working)

- Node v24.19.0, npm 11.17.0, Docker 29.6.2, Git 2.55.0, AWS CLI 2.36.15, CDK 2.1135.0
- Project folder: `C:\Projects\RR`
- Editing now done in VS Code (Open Folder, autosave on), not Notepad

## DynamoDB Local setup (working, persistent)

```
docker run -d -p 8000:8000 --name dynamodb-local -v C:\Projects\RR\dynamodb-data:/home/dynamodblocal/data amazon/dynamodb-local -jar DynamoDBLocal.jar -sharedDb -dbPath /home/dynamodblocal/data
```

Do not `docker rm dynamodb-local` — stop/start is fine, removing deletes all local data.

Dummy local credentials (DynamoDB Local ignores these but CLI/SDK require something present):
```
AWS Access Key ID: fakeMyKeyId
AWS Secret Access Key: fakeSecretAccessKey
Region: ap-southeast-1
Profile name used: local
```

Important: the Node SDK does NOT pick up the `local` CLI profile automatically. Every Lambda's `DynamoDBClient` setup must include an explicit `credentials` block with the same dummy values, or it fails with "Could not load credentials from any providers." This caused significant debugging time this session — now fixed in all Lambda files.

## DynamoDB tables (both created, both working)

### `mswg-risk-register` (main table, current state only)
- Partition key: `dept_id` (String)
- Sort key: `risk_id` (String)
- Billing mode: PAY_PER_REQUEST
- Holds current state of each risk: title, description, likelihood, impact, residual_rating, quarter, year, created_by, created_at, updated_at
- New fields added this session: `created_by` (creator's user ID, links risk to who submitted it), `status` (set to `"archived"` when soft-deleted, plus `archived_by` and `archived_at`)
- Updated in place on edit — this table does NOT hold historical versions, see history table below

### `mswg-risk-history` (new this session — tracks rating changes only)
- Partition key: `risk_id` (String)
- Sort key: `changed_at` (String, ISO timestamp — sorts chronologically)
- Billing mode: PAY_PER_REQUEST
- Written only when `residual_rating` changes value on an update — NOT for minor edits like typo fixes
- Attributes: `dept_id`, `old_rating`, `new_rating`, `quarter`, `year`, `changed_by`
- Powers quarter-to-quarter and year-to-year comparison

Created via:
```
aws dynamodb create-table `
  --table-name mswg-risk-history `
  --attribute-definitions AttributeName=risk_id,AttributeType=S AttributeName=changed_at,AttributeType=S `
  --key-schema AttributeName=risk_id,KeyType=HASH AttributeName=changed_at,KeyType=RANGE `
  --billing-mode PAY_PER_REQUEST `
  --endpoint-url http://localhost:8000 `
  --profile local
```

## Real department list (confirmed)

8 departments, each maps to a `dept_id`:

| Department | `dept_id` |
|---|---|
| Corporate Monitoring I | `corp-monitoring-1` |
| Corporate Monitoring II | `corp-monitoring-2` |
| Corporate Governance | `corp-governance` |
| Corporate Resources | `corp-resources` |
| Finance & Admin | `finance-admin` |
| IT & Training | `it-training` |
| Creative Communications | `creative-comms` |
| Professional Development | `prof-development` |

**Plus a 9th `dept_id`: `ceo-office`** — confirmed needed this session. CEO Office has 3 staff (Dr Ismet Yusoff plus 2 others) who can log their own risks under this partition, same as any other department.

## Access model (finalized this session — significant change from original plan)

This replaced the original single-"Executive"-role idea. Access is now split into two independent layers:

**1. Department membership (controls where a created risk lands)**
- One Cognito group per department (9 groups total, including `ceo-office`)
- Every user, regardless of seniority, creates risks under their own department's `dept_id` — derived server-side from their group membership, never passed manually in the request
- Carried in the login token, enforced server-side on every request

**2. Full-visibility access (controls who can view/archive across all departments)**
- NOT tied to department or job title — tied to 3 specific named individuals: **Dr Ismet Yusoff (CEO), Phua Jing Wei (CEO Office), Lini Hazlina (Corporate Resources)**
- Lini's home department is Corporate Resources — she still creates risks there, but also has full cross-department view
- Planned as a separate Cognito group, e.g. `risk-viewers-all`, granted to these 3 people independent of their department group
- Same 3 people are also the only ones authorized to archive (soft-delete) any risk

**Edit access** is enforced separately again: strictly creator-only, checked via `created_by` match on the risk record. Department membership and viewer-group membership do NOT grant edit rights on other people's risks.

## CRUD model (fully designed and implemented locally this session)

- **Create**: anyone, into their own `dept_id` only. `risk_id` is a generated UUID (`crypto.randomUUID()`), collision-safe without needing a counter. `quarter`/`year` auto-derived from server date at creation — no manual input allowed.
- **Read (own dept)**: existing `getRisksByDept.js`, unchanged.
- **Read (all depts)**: new `getAllRisksForExec.js` — returns all risks, or one department's risks if `dept_id` param passed. Gated to the 3 named viewers.
- **Update**: new `updateRisk.js` — strictly creator-only (hard match on `created_by`, not department-based). If `residual_rating` changes, a record is written to `mswg-risk-history` before the update. Minor edits (e.g. typo fixes) do not touch history.
- **Delete**: implemented as **soft delete only** — new `archiveRisk.js`. Sets `status: "archived"`, `archived_by`, `archived_at` on the existing item. Nothing is ever removed from either table. Gated to the same 3 named admins. Risk data must remain permanently stored for historical comparison, so hard delete was intentionally not built.
- **History**: new `getRiskHistory.js` — queries `mswg-risk-history` by `risk_id`, returns full chronological list of rating changes for a given risk.

## Lambda functions — status

Folder: `C:\Projects\RR\RISKREGISTER\backend`

All of the following are **done, tested, and working** against DynamoDB Local (hardcoded input values standing in for what will come from Cognito tokens later):

- `getRisksByDept.js` + `testGetRisks.js` — from earlier session, unchanged
- `createRisk.js` + `testCreateRisk.js` — done, tested this session
- `updateRisk.js` + `testUpdateRisk.js` — done, tested this session (creator-only enforcement + conditional history write both verified)
- `getAllRisksForExec.js` + `testGetAllRisksForExec.js` — done, tested this session (all-departments scan, single-department filter, and unauthorized rejection all verified)
- `getRiskHistory.js` + `testGetRiskHistory.js` — done, tested this session
- `archiveRisk.js` + `testArchiveRisk.js` — done, tested this session (unauthorized rejection, successful archive, and double-archive rejection all verified)

Pattern maintained: every Lambda has a matching `test*.js` file for local verification before real deployment. Same standard handler shape (`exports.handler = async (event) => {...}`) throughout, so no Lambda logic changes when moved behind API Gateway later — only the hardcoded auth-related fields (`dept_id`, `created_by`, `requested_by`) get replaced by values extracted from the verified Cognito token.

**Still to build:** Cognito-based auth wiring itself — this is the next phase, not yet started.

## Known open item (not yet decided)

Now that risks can be archived (`status: "archived"`), none of the existing read Lambdas (`getRisksByDept.js`, `getAllRisksForExec.js`) filter by status yet — they return archived and active risks mixed together. Needs a decision: should archived risks be hidden by default and only shown on request, or always shown with a visible "archived" tag in the UI? Not urgent, but should be resolved before frontend integration.

## Architecture (unchanged)

Serverless AWS stack: S3 + CloudFront (hosting), Cognito (auth), API Gateway (routing + token validation), Lambda (business logic), DynamoDB (data), Route 53 + ACM optional for `risk.mswg.org.my`.

Build order: Cognito → DynamoDB → Lambda + API Gateway → S3 + CloudFront, developed locally first, then deployed to real AWS once proven. (In practice, DynamoDB + Lambda logic got built and proven first since local-first development doesn't require Cognito — Cognito is next.)

## Budget

Realistic: $1–$5/month. Hard ceiling: $30/month. AWS Budgets alert recommended at $10.

## Timeline

Original estimate: 8–11 weeks part-time (10–15 hrs/week), 2–3 months elapsed. Local DynamoDB setup, all 6 core Lambdas, and their test harnesses all completed and verified across earlier session + this session.

## Open items carried forward

- Archived-risk visibility/filtering decision (see above)
- Full list of which of the 28 individuals belongs to which department group (have org chart, not yet formalized into a Cognito-ready list)
- Original prototype HTML dashboard file has not yet been shared/uploaded — still needed for frontend integration phase
- Whether the CEO/exec summary view needs more than a raw combined table

## Working style notes for continuity

- Guided, step-by-step: one command or small step at a time, output pasted back before proceeding
- Local-first for everything: prove logic works locally (Docker, plain Node scripts) before touching real AWS
- Now using VS Code (Open Folder on `C:\Projects\RR`, autosave on) instead of Notepad — fixes the save/paste mismatch issues that came up this session
- Always double-check a file's actual saved content with `type filename.js` in PowerShell if test output looks unexpected — this caught two mixed-up files this session
- Remember: local DynamoDB SDK calls need an explicit `credentials` block in code (dummy values), separate from the CLI's `--profile local` flag
- PowerShell path commands are relative to current directory — reusing old commands via up-arrow after `cd`-ing elsewhere is a common source of path errors
