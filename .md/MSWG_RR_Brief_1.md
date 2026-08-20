# MSWG RR — Project Brief

Paste this at the start of a new chat to bring it up to speed without re-explaining everything.

## What this is

MSWG RR is a department-scoped risk register dashboard for MSWG (Minority Shareholder Watchdog Group), a small organization with 28 people total. Each department logs in and sees only its own risk register: a filterable table, a risk matrix (impact vs likelihood), a residual-rating chart, and a "Register risk" form. The CEO is the one role with visibility across every department, plus a comparison view across all of them.

## Who's building this

One person (final-year student, working solo, studying toward AWS SAA-C03, so the AWS stack doubles as exam-relevant experience). New to Docker and AWS CLI at the start of this project; learning hands-on, one guided step at a time, pasting terminal output back for review before proceeding.

## Local environment (confirmed working)

- Node v24.19.0, npm 11.17.0, Docker 29.6.2, Git 2.55.0, AWS CLI 2.36.15, CDK 2.1135.0
- Project folder: `C:\Projects\RR`
- npm initialized, `.gitignore` set up, `@aws-sdk/client-dynamodb` and `@aws-sdk/lib-dynamodb` installed, git commit made

## DynamoDB Local setup (working, persistent)

Running in Docker, with data persisted to disk and a shared database across all local tools (CLI, Node scripts):

```
docker run -d -p 8000:8000 --name dynamodb-local -v C:\Projects\RR\dynamodb-data:/home/dynamodblocal/data amazon/dynamodb-local -jar DynamoDBLocal.jar -sharedDb -dbPath /home/dynamodblocal/data
```

Important lesson learned: without `-sharedDb` and a mounted volume, DynamoDB Local stores data only in memory and partitions it separately per credentials/region combo used in each request. This caused a "table not found" error the first time a Node script queried data written via the CLI. Fixed by rebuilding the container with `-sharedDb` (shares one DB regardless of credentials used) and a volume mount (persists data across restarts). **Do not `docker rm dynamodb-local` again** — stop/start is fine, removing deletes all local data.

Dummy local credentials (DynamoDB Local ignores these but the CLI/SDK require something present):
```
AWS Access Key ID: fakeMyKeyId
AWS Secret Access Key: fakeSecretAccessKey
Region: ap-southeast-1
Profile name used: local
```

## DynamoDB table (created, working)

- Table name: `mswg-risk-register`
- Partition key: `dept_id` (String)
- Sort key: `risk_id` (String)
- Billing mode: PAY_PER_REQUEST
- Other attributes (title, quarter, likelihood/impact, residual_rating, etc.) are added per-item, not declared at table creation

Confirmed working via both AWS CLI (`put-item`/`get-item`, using `file://` JSON files — inline escaped JSON breaks in PowerShell) and the Node AWS SDK (`@aws-sdk/lib-dynamodb`, `DynamoDBDocumentClient`).

Current test data in the table:
- `RISK-002` — `dept_id: legal` (placeholder dept used before real department list was provided) — "Contract renewal delay"
- Note: an earlier `RISK-001` (`dept_id: finance`) was lost when the original non-persistent container was deleted during the persistence fix — expected, not a concern.

## Lambda functions (local Node testing, not yet deployed to real AWS)

Folder: `C:\Projects\RR\lambdas`

- `getRisksByDept.js` — **done, tested, working.** Takes `{ dept_id }`, runs a DynamoDB `QueryCommand` scoped to that partition key only, returns matching items. Confirmed it correctly returns only the querying department's data (structural isolation, not just client-side trust). Uses the standard AWS Lambda handler shape (`exports.handler = async (event) => {...}`) so the function itself won't need to change when deployed to real Lambda behind API Gateway.
- `testGetRisks.js` — local test harness that calls the handler directly with a hardcoded `dept_id`, used to verify behavior without deploying anything.
- Pattern established: any new Lambda gets a matching `test*.js` file for local verification before real deployment.

Still to build:
- `createRisk` — backend for the "Register risk" form
- `updateRisk` — editing existing risk entries
- `getAllRisksForExec` — CEO cross-department view (scans/queries across all `dept_id`s)
- Cognito-based auth wiring so `dept_id` comes from the login token rather than being passed directly (current approach is for local testing only)

## Real department list (confirmed, replaces placeholders)

From MSWG's actual org chart. 8 departments, each maps to a `dept_id`:

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

**CEO Office** (Dr. Ismet Yusoff, SR Executive, Driver) is treated separately — not a 9th `dept_id` owning its own risk partition, but the Executive Cognito group with cross-department read access, per the brief's original access model.

**Open question, not yet resolved:** does the CEO Office ever log its own risks, or is its role purely oversight of the other 8 departments? This determines whether a 9th `dept_id` (e.g. `ceo-office`) is needed.

Rough headcount check against the org chart: 1 CEO + 2 CEO Office support staff + 8 heads/managers + ~16 managers/executives/admin under them ≈ 28 people, consistent with the brief.

## Access model (unchanged from original plan)

- Two roles: Department (flat access within own department) and Executive (CEO, sees everything + cross-department summary)
- No existing company identity provider — accounts created manually for all 28 people in Cognito
- Department membership = one Cognito group per department, carried in the login token, enforced server-side on every request

## Architecture (unchanged from original plan)

Serverless AWS stack: S3 + CloudFront (hosting), Cognito (auth), API Gateway (routing + token validation), Lambda (business logic), DynamoDB (data, `dept_id` partition key), Route 53 + ACM optional for `risk.mswg.org.my`.

Build order: **Cognito → DynamoDB → Lambda + API Gateway → S3 + CloudFront**, developed locally first (DynamoDB Local via Docker, Lambda logic tested as plain Node scripts), then deployed to real AWS once proven.

## Budget

Realistic: $1–$5/month. Hard ceiling: $30/month. AWS Budgets alert recommended at $10.

## Timeline

Original estimate: 8–11 weeks part-time (10–15 hrs/week), 2–3 months elapsed. Local dev setup + first working Lambda completed within this session.

## Open items

- CEO Office's own risk-logging status (see above)
- Full list of which of the 28 individuals belongs to which department group (have org chart, not yet formalized into a Cognito-ready list)
- Original prototype HTML dashboard file has not yet been shared/uploaded — still needed for frontend integration phase
- Whether the CEO summary view needs more than a raw combined table

## Working style notes for continuity

- Guided, step-by-step: one command or small step at a time, output pasted back before proceeding
- Local-first for everything: prove logic works locally (Docker, plain Node scripts) before touching real AWS, to avoid cost and reduce debugging complexity
- User is new to Docker/CLI tooling — plain-language explanations of *why* each step matters are part of the working pattern, not just *what* to run
- File creation via GUI (File Explorer) makes empty files — actual code must be pasted in via an editor (Notepad used so far) and saved
- PowerShell path commands are relative to current directory — reusing old commands via up-arrow after `cd`-ing elsewhere is a common source of path errors
