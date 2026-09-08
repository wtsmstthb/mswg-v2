# MSWG Internal Platforms — Consolidated Project Brief

**As at:** 7 September 2026  
**Workspace:** `C:\Projects\RR`  
**Scope:** Shared Portal, Risk Register, Conduct of AGM, Pre‑Voting, shared infrastructure, testing, security, cost control, and next actions.

## 1. Executive summary

MSWG is developing three internal platforms for a user population of no more than approximately 30 people:

1. **Risk Register (RR)** — departmental risk registration, monitoring, editing, history, organisation oversight, and soft archive.
2. **Conduct of AGM** — AGM observations, Physical/Virtual questionnaires, calculated scoring, HOD review, history, and printable reporting.
3. **Pre‑Voting** — Bursa announcement retrieval, resolution-level voting recommendations, submission history, and printable records.

The intended user journey is one MSWG-owned login followed by a shared portal that shows only the platforms the user is entitled to access. Each platform remains a separate application area even when authentication and hosting are shared.

The current delivery state is mixed:

| Area | Current state | Main limitation |
|---|---|---|
| Shared Portal | Functional navigation prototype | Cards are not filtered by entitlement; no backend enforcement |
| Risk Register | Mature local application using API handlers and persistent DynamoDB Local | Not deployed to AWS or tested with real Cognito/IAM |
| Conduct of AGM | Mature local assessment workflow using API handlers and persistent DynamoDB Local | Business sign-off and AWS deployment remain pending |
| Pre‑Voting | Functional local prototype using FastAPI, Playwright, SQLAlchemy, and SQLite | No authentication/authorisation, incomplete draft/workflow, hardcoded local URLs, no AWS design |
| Shared AWS infrastructure | Intended serverless design is documented | **Current `template.yaml` is incomplete and unusable; it contains only the SAM Transform line** |

Nothing in this workspace is currently proven as an AWS production deployment. Local tests are implementation evidence, not AWS billing or production-security evidence.

## 2. Repository structure

```text
C:\Projects\RR
├── shared
│   ├── portal
│   ├── infrastructure
│   └── docs
├── RISKREGISTER
│   ├── frontend
│   ├── backend
│   ├── tests
│   ├── tools
│   └── docs
├── AGM
│   ├── frontend
│   ├── backend
│   ├── tests
│   ├── tools
│   └── docs
├── PRE-VOTING
│   ├── frontend
│   ├── backend
│   └── testing
└── dynamodb-data
```

`VOTING` is presently empty and is not an active application area. The current Pre‑Voting implementation is under `PRE-VOTING`.

## 3. Intended access model

| User category | Risk Register | Pre‑Voting | Conduct of AGM |
|---|---:|---:|---:|
| Full-visibility / SUPER user | Yes | Yes | Yes |
| HOD, including Corporate Monitoring HOD | Yes | Yes | Yes |
| Ordinary Corporate Monitoring user | No | Yes | Yes |
| Other staff without entitlement | No | No | No |

These are business rules. Their enforcement is not equally mature across the platforms:

- RR enforces department, creator, full-view, and archive permissions in its backend handlers.
- AGM enforces assessor and reviewer permissions in its backend handlers.
- Pre‑Voting currently has no authenticated user or role enforcement in its FastAPI backend.
- The portal currently displays all three cards rather than filtering them from entitlement claims.

Hiding a card or button is not security. Every deployed API must reject unauthorised calls using verified Cognito/API Gateway claims.

## 4. Shared Portal

### Implemented

- A single landing page under `shared/portal/index.html`.
- Cards linking to Risk Register, Pre‑Voting, and Conduct of AGM.
- Shared visual styling aligned with the Horizon-inspired internal-platform design.
- User name and department display using a token or local RR mock claims.
- Sign-out routing through Cognito when production configuration exists.

### Current limitations

- All platform cards are visible to every signed-in/local mock user.
- It imports the Risk Register configuration directly rather than using a neutral shared configuration package.
- It does not have a backend entitlement check.
- Local navigation does not provide one unified API server for all three platforms.
- Production entry-path, hosting layout, callback URLs, and cross-platform entitlement groups still require finalisation.

## 5. Risk Register

### Purpose

RR allows department heads to record and maintain departmental risks while authorised full-visibility users review risks across MSWG and soft-archive records.

### Implemented frontend

- Dashboard with filters, totals, risk matrix, and residual-rating chart.
- Create-risk modal and dedicated registration page.
- Reuse of an existing risk as an editable starting point.
- Calendar-quarter default with manual selection where appropriate.
- Creator-only Edit actions.
- Real audit-history page.
- Organisation overview for full-visibility users.
- Soft-archive page for full-visibility users.
- Loading, error, success, session, and local role-testing states.
- Local identities for Full visibility, IT HOD, and Corporate Monitoring HOD.

### Data and backend

The browser no longer stores risk records in `localStorage`. The active flow is:

```text
RR browser
  → frontend/api-client.js
  → local HTTP adapter or API Gateway route
  → six Node.js handlers
  → repository
  → DynamoDB
```

The six handlers are:

- `createRisk.js`
- `getRisksByDept.js`
- `getAllRisksForExec.js`
- `updateRisk.js`
- `getRiskHistory.js`
- `archiveRisk.js`

The record stores the complete risk form, department, creator, stable reference, status, timestamps, quarter/year, and `record_version`. Ratings are calculated from impact and likelihood. Optimistic version checks reject stale updates.

Successful edits write history transactionally. Archive is a permission-gated status change rather than deletion and also writes an audit entry transactionally.

### RR permissions

- Department users read active risks only for their verified department.
- A risk may be edited only by its verified creator.
- Full organisation reads require the full-visibility group.
- Archive requires full-visibility permission.
- Department and actor IDs supplied by the browser are not trusted.

### RR local testing

```powershell
cd C:\Projects\RR
docker start rr-dynamodb
node RISKREGISTER\tools\serve-risk-local.js
```

Open `http://localhost:3200/RISKREGISTER/frontend/dashboard.html`.

Evidence commands:

```powershell
node --test .\RISKREGISTER\tests\*.test.js
node RISKREGISTER\tools\test-local-dynamodb.js
```

### RR remaining work

- Deploy to an isolated AWS development environment.
- Validate real Cognito tokens, groups, API Gateway authorisation, Lambda packaging, and IAM.
- Complete MSWG user acceptance testing.
- Confirm retention, backup, production ownership, and handover procedures.

## 6. Conduct of AGM

### Purpose

Corporate Monitoring assessors record observations from an AGM, the application calculates the conduct score, and an HOD reviews the completed assessment. The approved report can be printed or saved as PDF.

### Implemented questionnaire and scoring

- Physical or Virtual meeting selection changes the Section B questionnaire.
- Section A awards timing points based on the interval between financial year end and AGM:
  - within 2 months: 3 points
  - within 2–4 months: 2 points
  - within 4–6 months: 1 point
  - after 6 months: 0 points and a reason is required
- The 28-day notice question contributes one additional point.
- Section C contains the expanded Chairman questions.
- Section E retains only the All Directors Present question.
- Other applicable questions generally score Yes as 1 and No as 0; permitted N/A answers are excluded from the denominator.
- The A–J section navigator is collapsible.
- The report places the company at the upper left and score at the upper right, followed by assessment details and sign-off data.

### Implemented workflow

1. Corporate Monitoring creates and saves a draft.
2. Only the original assessor may edit the draft.
3. Submission validates required details and scored answers, then locks assessor editing.
4. An HOD may return the submission with a reason or approve it.
5. Approval locks the record and stores an approved report snapshot.
6. An HOD may reopen an approved assessment with a reason, creating a new revision while preserving the prior approved snapshot.
7. Created, Saved, Submitted, Returned, Approved, and Reopened events are retained in immutable history.

The approved data snapshot can regenerate the report. A PDF binary is not currently stored in S3.

### AGM local testing

```powershell
cd C:\Projects\RR
docker start rr-dynamodb
node AGM\tools\setup-agm-local-dynamodb.js
node AGM\tools\test-agm-local-dynamodb.js
node AGM\tools\serve-agm-local.js
```

Open `http://localhost:3100/AGM/frontend/records.html`.

Read-only record inspection:

```powershell
node AGM\tools\inspect-agm-local-dynamodb.js
node AGM\tools\inspect-agm-local-dynamodb.js YOUR-ASSESSMENT-ID
```

### AGM remaining work

- Obtain written sign-off for the final questionnaire, scoring denominator, rounding, approval, reopening, and correction rules.
- Decide whether storing the approved data snapshot is sufficient or whether MSWG also requires the PDF binary in S3.
- Complete analyst/HOD user acceptance and print testing.
- Deploy and verify the workflow in AWS.

## 7. Pre‑Voting

### Purpose and current workflow

Pre‑Voting prepares a voting position before a company meeting:

1. The user supplies a Bursa Malaysia announcement URL.
2. A Playwright extractor opens the Bursa page and reads meeting and resolution information, including dynamic disclosure content.
3. The frontend displays company and meeting details.
4. The user selects For, Against, or Abstain for each ordinary resolution.
5. Against and Abstain require remarks; the backend also validates this rule.
6. Submit stores the meeting and its votes.
7. The History page lists stored submissions, opens the complete voting record, supports search, and provides browser printing.

### Current technology

| Layer | Current implementation |
|---|---|
| Frontend | Static HTML, CSS, and JavaScript |
| Local API | Python FastAPI |
| Data access | SQLAlchemy |
| Local database | SQLite at `PRE-VOTING/testing/mswg_test.db` |
| Bursa retrieval | Python Playwright with Chromium |

Current API routes:

- `POST /api/pre-voting/extract`
- `POST /api/pre-voting/submit`
- `GET /api/pre-voting/history`
- `GET /api/pre-voting/history/{submission_id}`

Current database tables:

- `pre_voting_submissions` — company, meeting information, overall remarks, and creation time.
- `pre_voting_votes` — resolution number, description, shareholder action, vote, and remarks linked to the submission.

### Current limitations and risks

- Save Draft does not persist; it only collects the form and displays a message that database saving will be connected later.
- There is no assessor/HOD submission, review, return, approval, lock, revision, or immutable audit workflow.
- There is no authenticated identity, role, department, creator, or entitlement enforcement.
- The API base URL is hardcoded as `http://127.0.0.1:8000` in frontend scripts.
- Port `8000` conflicts with the existing DynamoDB Local container used by RR and AGM.
- The History page silently falls back to demo records when the API is unavailable, which can make an outage look like successful data retrieval.
- SQLite is suitable for the current local prototype but is not the agreed production AWS storage design.
- There is no environment-based configuration comparable with RR and AGM.
- There is no dependency manifest such as `requirements.txt` or `pyproject.toml` in the current Pre‑Voting folder.
- Current test utilities are manual scripts rather than a deterministic automated test suite.
- Playwright requires a separately downloaded Chromium binary:

  ```powershell
  python -m playwright install chromium
  ```

### Pre‑Voting local commands currently documented

From `PRE-VOTING/backend`:

```powershell
python -m uvicorn api:app --reload --port 8000
```

From `C:\Projects\RR`:

```powershell
python -m http.server 8080
```

Open `http://localhost:8080/PRE-VOTING/frontend/index.html`.

These commands cannot run alongside DynamoDB Local on port `8000` without resolving the port collision and updating the frontend API configuration.

### Pre‑Voting next technical milestone

Pre‑Voting should be brought to the same standard as RR and AGM by:

1. moving API endpoints into environment configuration;
2. assigning a non-conflicting local API port;
3. adding authenticated actor and entitlement checks;
4. confirming the business workflow and persisted draft rules;
5. adding version protection and immutable history;
6. replacing silent demo fallback with an explicit development mode;
7. adding dependency and automated-test manifests;
8. defining its serverless AWS API/Lambda/DynamoDB resources after requirements are approved.

## 8. Data stores and local ports

| Platform | Current local store | Local application/API |
|---|---|---|
| Portal | None | Static page; no unified platform server |
| Risk Register | DynamoDB Local: risk and history tables | `127.0.0.1:3200` |
| Conduct of AGM | DynamoDB Local: assessment and history tables | `127.0.0.1:3100` |
| Pre‑Voting | SQLite: submissions and votes | FastAPI currently configured for `127.0.0.1:8000`; static frontend on `8080` |
| Shared DynamoDB Local | Persistent files under `dynamodb-data` | `127.0.0.1:8000` |

The Pre‑Voting/DynamoDB port conflict is a current integration blocker.

## 9. Target AWS architecture

The intended production architecture remains serverless and usage-based:

| AWS service | Intended role |
|---|---|
| Amazon Cognito | Shared login, department/role claims, and platform entitlements |
| Amazon S3 | Private static frontend storage and approved document storage if required |
| Amazon CloudFront | HTTPS frontend delivery and caching |
| API Gateway HTTP API | Authenticated platform routes |
| AWS Lambda | On-demand backend business logic |
| Amazon DynamoDB | Current records and immutable history/audit data |
| Amazon CloudWatch | Logs, metrics, and alarms |
| Amazon SNS | Alarm email delivery |
| AWS Budgets | Cost notifications |
| AWS Certificate Manager | Optional certificate only if an MSWG domain is connected |

Deliberate exclusions for the present scope:

- no Amazon RDS;
- no EC2 application server;
- no NAT Gateway;
- no OpenSearch;
- no Route 53 requirement for the initial CloudFront-domain release;
- no application-level X-Ray requirement unless later justified.

### Critical infrastructure warning

The current working-tree file `shared/infrastructure/template.yaml` contains only:

```yaml
Transform: AWS::Serverless-2016-10-31
```

Therefore, the previously documented Cognito, DynamoDB, Lambda, API Gateway, S3, CloudFront, CloudWatch, SNS, and Budget resources are **not present in the current template**. The template must be restored or reconstructed and reviewed before SAM validation, build, deployment, or cost-resource claims.

Do not overwrite this working-tree change blindly. First establish whether the truncation is intentional and compare it with the last known complete Git version.

## 10. Cost and Finance position

The serverless target should be inexpensive at this scale because there is no always-running RDS, EC2, or NAT Gateway. However, a US$10 monthly target is an operating ceiling and alert threshold, not a guarantee that AWS can never exceed it.

Finance evidence must separate:

- usage assumptions;
- official AWS unit prices for the selected Region and date;
- calculation formulas;
- local test measurements;
- AWS dev-pilot measurements;
- actual Cost Explorer and invoice results.

The strongest evidence will come after a controlled AWS development deployment. AWS Budgets warns about cost; it does not universally stop services.

## 11. Security, ownership, and handover principles

- The AWS account, root email, payment method, recovery, and MFA must be controlled by MSWG.
- Production users should be provisioned from an approved roster.
- Frontend visibility must be backed by API permission checks.
- Actor, creator, department, and role values supplied by a browser must not be trusted.
- S3 should remain private behind CloudFront.
- Production databases require backup/point-in-time-recovery and retention decisions.
- Secrets, passwords, tokens, and access keys must never be committed.
- Adding or disabling users must be an administrative process, not a source-code edit.
- Every platform needs an operator guide, deployment procedure, recovery procedure, and named technical owner before handover.

## 12. Current verification snapshot

On 7 September 2026, the combined Node test command produced:

- **33 tests total**
- **32 passed**
- **1 failed**

The failing shared repository-structure test expects SAM `CodeUri` entries for the platform backends. It fails because the current SAM template is truncated.

RR and AGM retain their previous successful local DynamoDB and live-browser evidence. Pre‑Voting currently has manual extractor/database checks but is not included in the deterministic Node suite.

## 13. Current working-tree caution

At the time of this brief:

- Pre‑Voting history/README work is staged.
- `shared/infrastructure/template.yaml` has a major unstaged modification that removes the previously complete stack.
- These existing changes belong to the current project work and must not be discarded without review.

## 14. Recommended next sequence

1. **Resolve the truncated SAM template** and restore the complete shared infrastructure safely.
2. Rerun all repository tests and SAM validation/build.
3. Resolve Pre‑Voting’s port collision and hardcoded API URLs.
4. Obtain formal Pre‑Voting workflow, draft, approval, retention, and PDF requirements.
5. Add Pre‑Voting authentication, authorisation, versioning, audit history, configuration, and automated tests.
6. Implement portal entitlement filtering and matching backend enforcement for every platform.
7. Complete RR and AGM business-owner/user-acceptance testing.
8. Finalise the 30-person roster, platform entitlements, production owners, alert recipients, retention, backup, Region, and domain decisions.
9. Deploy an isolated AWS development environment.
10. Validate Cognito, IAM, API Gateway, Lambda, DynamoDB, CloudFront/S3, logging, alarms, security, and recovery.
11. Measure real AWS usage and replace Finance forecasts with pilot evidence.
12. Complete the Admin Handbook and production handover pack.

## 15. Definition of “ready”

A platform is not production-ready merely because its frontend works. Production readiness requires:

- approved requirements and workflow;
- authenticated and authorised backend operations;
- persistent records and retrievable history;
- validation and safe concurrency behaviour;
- deterministic automated tests;
- successful AWS dev deployment and smoke testing;
- monitoring, cost alerts, backup, and recovery;
- user acceptance and business sign-off;
- documentation and named operational ownership.

Under this definition, RR and AGM are mature local implementations awaiting AWS and business validation. Pre‑Voting is a useful local prototype that still requires backend/security/workflow maturation. The shared portal is a navigation prototype awaiting real entitlement enforcement.
