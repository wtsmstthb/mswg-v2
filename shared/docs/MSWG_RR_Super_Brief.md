# MSWG RR and Internal Platforms — Super Brief

This is the authoritative continuity brief for the MSWG internal-platform project. It supersedes older RR briefs when they conflict with a later confirmed decision or the current code.

**Last consolidated:** 28 August 2026
**Workspace:** C:\Projects\RR
**Current delivery state:** RR and AGM frontend/backend code exists. Both repositories have been proven against persistent DynamoDB Local, and the AGM browser now uses the real local API and database. Nothing has been deployed to AWS; RR browser CRUD still uses localStorage.

## 1. Purpose and scope

MSWG is developing three small internal platforms for a user population that should not exceed 30 people:

1. **Risk Register (RR)** — register, assess, monitor, update, archive, and review departmental risks.
2. **Pre-Voting** — prepare and review proposed voting positions before company meetings, then produce a printable reference.
3. **Conduct of AGM** — record AGM observations, calculate an AGM conduct score, and export a concise PDF report.

The target is one company-owned AWS account, one shared login, and one portal that shows only the platforms each user may access. Each platform remains a separate code area and should have separate backend resources where appropriate. Sharing identity and hosting does not mean placing all application logic in one file.

The design priorities are ownership, flexibility, low operating cost, secure handover, and the ability to add platforms without paying for permanently running servers.

## 2. Status language used in this brief

- **Implemented** means the code or frontend exists in the workspace.
- **Automated-test verified** means the current deterministic test suite passed.
- **Prototype** means the interface works with local/sample browser data but is not yet a production system.
- **Infrastructure defined** means the resource is present in the SAM template but has not been deployed.
- **Pending** means it must not be presented as completed evidence.

This distinction is especially important for Finance. A forecast, an automated code test, a local database test, an AWS development deployment, and an actual monthly invoice are different kinds of evidence.

## 3. Confirmed product architecture

### One login and one portal

The intended user journey is:

1. The user signs in once through Amazon Cognito.
2. The portal reads verified identity, department, role, and application-entitlement claims.
3. The portal displays only the platform cards allowed for that user.
4. The selected platform opens in its own frontend area.
5. Every API independently checks the same verified claims before reading or changing data.

Hiding a portal button is only a user-interface convenience. It is not security. A user who manually enters a URL or calls an API must still be rejected by the platform's backend unless the token has the required entitlement.

### Code separation

Current frontend areas:

- shared/portal — shared platform-selection prototype
- RISKREGISTER/frontend — current consolidated RR frontend
- AGM/frontend — current AGM assessment prototype
- RISKREGISTER/frontend/legacy — historical HOD and SUPER copies retained for reference

Pre-Voting does not yet have an implemented frontend in the current workspace.

The target structure keeps separate application modules:

- one portal
- one shared authentication/configuration layer
- one frontend folder per platform
- one Lambda/backend folder per platform
- shared infrastructure definitions plus platform-specific resources

This is cleaner to troubleshoot than combining RR, Pre-Voting, and AGM logic in one page or one script.

### Current portal limitation

shared/portal/index.html currently links to RR and AGM and shows Pre-Voting as “In development.” It reads a login token or local mock claims, but it does not yet filter platform cards by entitlement. That filtering and the matching backend checks remain pending.

## 4. User and access model

### Platform visibility

| User category | Risk Register | Pre-Voting | Conduct of AGM |
|---|---:|---:|---:|
| Full-visibility / SUPER user | Yes | Yes | Yes |
| Department head (HOD), including Corporate Monitoring HOD | Yes | Yes | Yes |
| Ordinary Corporate Monitoring user | No | Yes | Yes |
| Other staff without a platform entitlement | No | No | No |

The Corporate Monitoring clarification means only its HOD-level users receive RR access; ordinary Corporate Monitoring users do not receive RR merely because they belong to that department. It does not mean the Corporate Monitoring HOD is restricted exclusively to RR.

The exact cross-platform group names and final list of users still require business-owner approval before accounts are provisioned.

### RR permissions

Within Risk Register:

- A department head sees active risks for their own department.
- A department head may create risks for their own department.
- A risk may be edited only by its authenticated creator.
- A department head does not see the organization Overview or Archive pages.
- A full-visibility / SUPER user sees organization-wide active and archived risks and may archive risks.
- Archiving is a soft delete; the application does not permanently delete a risk or its history.

The three currently named full-visibility users are:

- Dr Ismet Yusoff
- Phua Jing Wei
- Lini Hazlinda

These named assignments remain subject to written MSWG confirmation.

### AGM working responsibility

The present working model is:

- Corporate Monitoring users attend meetings and enter the observations.
- The system calculates the score from the selected answers.
- The HOD reviews or approves the completed assessment and PDF.

The system, not the HOD, should calculate the numerical total. The exact submit/review/approve workflow and who may amend an approved assessment still need formal confirmation.

## 5. Current implementation summary

### Implemented or prototyped

- Shared portal page with RR, Pre-Voting, and AGM cards
- Consolidated, claims-aware RR frontend
- RR HOD and SUPER navigation/permission differences
- Six RR Lambda handlers
- Verified-claim authorization logic for RR
- Current RR DynamoDB repository and environment configuration
- Repeatable DynamoDB Local table setup and real handler/repository integration test
- SAM/CloudFormation template for the RR AWS foundation
- Conduct of AGM frontend with dynamic questionnaire and scoring
- AGM physical/virtual question branching
- AGM print/PDF report layout
- AGM assessment and immutable-history DynamoDB tables
- AGM save/retrieve/submit/return/approve/reopen workflow with approved-report snapshots
- AGM assessment records page, audit-history retrieval, locking, and local browser-to-API integration
- Automated backend, configuration, frontend-static, and AGM-scoring tests
- Horizon UI-inspired visual language across the current portal, RR pages, and AGM prototype

### Not yet completed

- Real AWS account deployment
- End-to-end RR browser-to-API-to-DynamoDB operation
- Portal card filtering by platform entitlement
- Pre-Voting requirements, screens, backend, and database
- Final production Cognito/account provisioning and AWS deployment of the AGM workflow
- Production user accounts, email addresses, and final business approvals
- Actual AWS usage and invoice evidence

## 6. Risk Register

### Frontend

RISKREGISTER/frontend is the current application. It replaces the earlier duplicated HOD and SUPER working copies.

Current pages include:

- login and Cognito callback
- dashboard
- register risk
- history
- profile
- organization overview for full-visibility users
- archive for full-visibility users
- access denied

The current design uses the Horizon UI-inspired colour and card language, a full-height collapsible sidebar, a detached oval top area, a persistent user/profile area in the sidebar, and a route back to the shared portal. The current chart set was retained after experimental extra charts were removed.

Claims drive RR page and action visibility. Local development can use mock claims, but production identity must come from Cognito tokens.

### RR functionality

The intended and substantially prototyped capabilities are:

- filterable departmental risk table
- impact-versus-likelihood matrix
- residual-rating chart
- risk creation and editing
- quarter/year history
- organization overview for full-visibility users
- soft archive and permanent history retention

The frontend still stores prototype risk data in browser localStorage. RISKREGISTER/frontend/api-client.js is prepared, but page-by-page CRUD has not yet been connected to the Lambda/API layer. Therefore the current screens do not prove database persistence.

### RR backend

The six handlers in RISKREGISTER/backend are:

- createRisk.js
- getRisksByDept.js
- getAllRisksForExec.js
- updateRisk.js
- getRiskHistory.js
- archiveRisk.js

Current security behaviour:

- identity and department are derived from verified API Gateway authorizer claims
- request bodies cannot choose the creator, viewer, updater, or archiver
- ordinary department reads are restricted to the authenticated department
- cross-department reads require the full-visibility group
- updates require an exact creator match
- every successful update writes an audit-history record transactionally
- archives require full-visibility permission and never hard-delete data

The old test*.js Lambda scripts are historical manual harnesses. The tests directory contains the current authorization evidence.

## 7. Conduct of AGM

### Purpose and users

Conduct of AGM is for Corporate Monitoring users to record meeting observations and produce a scored, printable assessment. The score is derived from responses; the HOD review/approval step remains a workflow decision.

### Current frontend structure

The active AGM prototype is split for maintainability:

- landingpage.html — page structure
- landingpage.css — screen styling
- print.css — A4 print rules
- assessment-data.js — sections, questions, modes, and sample state
- assessment-ui.js — rendering, navigation, and scoring
- assessment-report.js — report/print preparation
- landingpage.js — shell, sidebar, and general interactions
- land2.html — preserved pre-Horizon comparison version

The section navigator for A–J is collapsible. The fillable Meeting Details panel itself remains the input area. The Previous button is not shown on the first page.

### Meeting-type branching

Meeting Details requires a Physical or Virtual selection. Section B changes its questionnaire based on that selection.

Physical currently contains six questions covering:

- venue suitability
- registration counters
- helpdesk
- advance administrative information
- early entry to the meeting room
- directors mingling with shareholders

Virtual currently contains two questions covering:

- registration guidance in the Notice of AGM
- display of shareholder questions during the meeting

This branch is implemented and covered by an automated test.

### Scoring

Section A uses weighted timing points:

| AGM timing after financial year end | Points |
|---|---:|
| Within 2 months | 3 |
| Within 2 to 4 months | 2 |
| Within 4 to 6 months | 1 |
| After 6 months | 0, with a reason required |

The 28-day notice question adds one point for Yes and zero for No. Section A therefore has four possible points before conversion to its percentage.

Other scored questions generally use:

- Yes = 1
- No = 0
- N/A = excluded from the possible score where N/A is permitted

The system recalculates each section and the overall result. Business owners should sign off the final denominator, rounding, unanswered-question treatment, and any approval thresholds before production.

### Analyst-requested questionnaire amendments already applied

- Physical and Virtual meetings show different Section B questions.
- Section A uses the weighted FYE-to-AGM timing scale.
- Section C contains 11 Chairman questions.
- Section E retains only “All directors were present.”
- The printable report places the company at the upper left and the score at the upper right, followed by section results, details, remarks, and sign-off information.

The print layout has been adjusted to fit one A4 portrait page in the prototype. Final user-acceptance testing must still cover the actual browser and printer/PDF settings used by MSWG.

### AGM persistence and remaining limitations

The AGM application now persists records through a real local API and DynamoDB Local. Corporate Monitoring assessors may create/save/submit their own records; HOD reviewers may return, approve, or reopen them. Submitted and approved records lock, optimistic record versions prevent silent overwrites, and every workflow action writes an immutable history snapshot. Approval stores an approved report snapshot so the report can be regenerated later.

The AGM stack is not deployed to AWS. Production Cognito/IAM/API Gateway behaviour remains unproven, the local role selector is development-only, and actual PDF binaries are not stored in S3. The approved data snapshot is the current authoritative record. The question set and chosen workflow should still receive written analyst/business-owner sign-off before production.

## 8. Pre-Voting

Pre-Voting is the least defined platform.

Current understanding:

- used by Corporate Monitoring and HOD/SUPER users according to entitlement
- form-based preparation and review
- printable or PDF output
- intermittent rather than daily use

There is no approved questionnaire, workflow, data model, screen implementation, backend, or database yet. The usage assumptions in the Finance model are capacity-planning assumptions only; they are not evidence of actual activity.

Do not copy the AGM or RR database design into Pre-Voting until its record lifecycle, approval roles, retention, and PDF requirements are known.

## 9. Target AWS architecture

The proposed architecture is serverless and usage-based:

| AWS service | Intended role |
|---|---|
| Amazon Cognito | Shared user pool, login, department/role claims, and platform entitlements |
| Amazon S3 | Private storage for static frontend files and, if approved, generated documents |
| Amazon CloudFront | HTTPS delivery and caching of the portal and application frontends |
| AWS Certificate Manager | Optional certificate if an MSWG custom domain is used |
| Amazon API Gateway HTTP API | Authenticated routes to platform Lambdas |
| AWS Lambda | On-demand business logic; no permanently running application server |
| Amazon DynamoDB | On-demand application records and audit/history data |
| Amazon CloudWatch | Logs, metrics, and alarms |
| Amazon SNS | Email delivery for operational alarms |
| AWS Budgets | Forecasted and actual cost alerts |

### Deliberate exclusions

- **No Amazon RDS.** The previous personal/student-project surprise bill was mainly caused by RDS, which can continue charging while idle. These platforms do not need an always-running relational database for the current scope.
- **No EC2 application server.**
- **No NAT Gateway.**
- **No OpenSearch.**
- **No Route 53 in the current plan.** The initial release can use the CloudFront domain. If MSWG later uses its own subdomain, the existing DNS provider can create the required record.
- **No application-level AWS X-Ray requirement.** Normal CloudWatch logs and metrics are sufficient for this scale.

The current shared/infrastructure/template.yaml still has Lambda tracing set to Active. That conflicts with the decision not to use X-Ray and should be removed or changed before deployment.

### Region and domain

The current configuration uses ap-southeast-1, which is the Singapore AWS Region. The original deployment note incorrectly described that code as Malaysia. Region choice and any data-residency requirement should be confirmed before deployment.

The current decision is not to purchase or manage DNS through Route 53. With the default CloudFront domain, no separate ACM certificate is required. If an existing MSWG domain is later connected, a non-exportable public ACM certificate used by CloudFront has no certificate charge, while DNS remains with the existing provider.

### Current SAM template

shared/infrastructure/template.yaml currently defines an RR-and-AGM dev/prod stack with:

- Cognito user pool, client, domain, RR groups, AGM assessor/reviewer groups, and department groups
- four on-demand DynamoDB tables: two RR and two AGM
- six RR and eight AGM Node.js 22 ARM64 Lambdas
- API Gateway HTTP API with JWT authorization and throttling
- private/versioned S3 frontend bucket
- CloudFront with origin access control
- retained CloudWatch logs
- SNS alarms
- an optional monthly AWS Budget whose default amount is US$10
- production DynamoDB point-in-time recovery and deletion protection

It has not yet been validated with SAM CLI or deployed. Its default frontend root remains RR-focused and must be revised for the shared portal. Pre-Voting resources are not yet defined.

## 10. DynamoDB model and retention

### RR current-state table

Proposed deployed name: mswg-rr-<environment>-risks

- partition key: dept_id
- sort key: risk_id
- billing: on demand
- stores the latest state of each risk
- archived items remain stored with archive metadata

### RR audit-history table

Proposed deployed name: mswg-rr-<environment>-history

- partition key: risk_id
- sort key: changed_at
- billing: on demand
- stores each successful update with actor, quarter/year, changed fields, and before/after values

Risk and history data are retained rather than hard-deleted. Production point-in-time recovery and deletion protection are defined in the template.

### AGM current assessment table

Proposed deployed name: mswg-agm-<environment>-assessments

- partition key: assessment_id
- stores the current fields, answers, comments, server-calculated scores, workflow state, actors, timestamps, revision, record version, and latest approved report snapshot
- optimistic record versions prevent one session silently overwriting another

### AGM immutable history table

Proposed deployed name: mswg-agm-<environment>-history

- partition key: assessment_id
- sort key: event_at
- stores every Created, Saved, Submitted, Returned, Approved, and Reopened event with actor, reason/comment, revision, and snapshot
- no application hard-delete path

Pre-Voting should receive its own tables once its requirements are approved. Sharing the Cognito user pool does not require mixing the platforms' business records in the same table.

## 11. Local database testing status and evidence

### Current local environment

- Docker Desktop engine version 29.6.2 is installed and reachable.
- Container rr-dynamodb runs the official amazon/dynamodb-local image on localhost port 8000.
- The container uses -sharedDb and persists data to C:\Projects\RR\dynamodb-data.
- Current tables are mswg-rr-local-risks, mswg-rr-local-history, mswg-agm-local-assessments, and mswg-agm-local-history.
- The table keys match shared/infrastructure/template.yaml.
- The RR and AGM repositories use DDB_ENDPOINT=http://localhost:8000 and local dummy credentials only in their local runners.
- No PostgreSQL, MongoDB, or separately installed database server is required.

### Repeatable scripts

- node RISKREGISTER\tools\setup-local-dynamodb.js creates or verifies both tables without deleting existing data.
- node RISKREGISTER\tools\test-local-dynamodb.js runs a real handler-to-repository-to-DynamoDB lifecycle.
- RISKREGISTER/tools/dynamodb-local.js contains the RR local endpoint, table definitions, and safe dummy credentials.
- node AGM\tools\setup-agm-local-dynamodb.js creates or verifies both AGM tables without deleting data.
- node AGM\tools\test-agm-local-dynamodb.js proves the real AGM workflow.
- node AGM\tools\inspect-agm-local-dynamodb.js provides read-only record/history inspection.
- node AGM\tools\serve-agm-local.js runs the local AGM frontend and API on port 3100.

### Proven on 28 August 2026

The real integration run passed:

1. create a risk in the authenticated creator's department
2. read it from the creator's department
3. confirm another department cannot see it
4. deny an ordinary user's all-department request
5. update it through the DynamoDB transaction
6. write and read one audit-history record
7. archive it through a full-visibility identity
8. hide it from normal department reads
9. retrieve it through the full-visibility archived view
10. restart rr-dynamodb and confirm both tables and records remain

The 25 standard automated tests use injected/mocked repositories and remain separate evidence for authorization and application logic. The RR and AGM local scripts prove the current repositories and DynamoDB operations; the AGM browser test additionally proves the frontend-to-API path.

A later AWS dev-environment smoke test is still required because DynamoDB Local cannot prove Cognito, IAM, API Gateway, Lambda packaging, CloudWatch, or actual AWS billing behaviour.

## 12. Usage and cost planning

### Thirty-user planning scenario

| Platform | Users | Sessions per user | API calls per session | Average monthly API calls |
|---|---:|---:|---:|---:|
| Risk Register | 30 | 8 per month | 20 | 4,800 |
| Pre-Voting | 30 | 60 per year | 20 | 3,000 |
| Conduct of AGM | 30 | 60 per year | 20 | 3,000 |
| **Combined** |  |  |  | **10,800 per month** |

Calculations:

- RR: 30 × 8 × 20 = 4,800 calls per month
- Pre-Voting: 30 × 60 × 20 ÷ 12 = 3,000 calls per month
- AGM: 30 × 60 × 20 ÷ 12 = 3,000 calls per month

“20 API calls per session” is a design assumption. One API call means one browser request to the backend, such as load a list, save a form, update a record, retrieve history, or archive a record. A real session may use more or fewer calls depending on autosave, pagination, retries, and page design.

### How each cost must be calculated

| Service | Usage evidence needed | Calculation basis |
|---|---|---|
| Cognito | unique people who sign in during the month | monthly active users against the current official allowance/tier |
| API Gateway | successful and failed HTTP API requests | requests ÷ 1,000,000 × current regional price |
| Lambda | invocations, memory, and duration | request charge plus GB-seconds after any applicable allowance |
| DynamoDB | read/write request units and stored GB | actual on-demand operations and storage at the selected Region's rates |
| S3 | stored GB, PUT/COPY/POST/LIST, and GET requests | measured file/document storage and request counts |
| CloudFront | delivered GB and viewer requests | measured transfer and request counts after applicable plan/tier |
| CloudWatch | log bytes ingested/stored, metrics, and alarms | actual telemetry volume and configured monitoring resources |
| SNS | alarm notifications | number and type of messages delivered |
| ACM | certificate type and integration | no certificate charge for a non-exportable public certificate used with an integrated AWS service |
| Budgets | number/type of budgets and actions | current AWS Budgets pricing and included allowances |

The Finance evidence pack should contain, for every priced service:

1. an official AWS pricing screenshot or exported AWS Pricing Calculator line item
2. the exact selected Region and pricing date
3. the usage formula
4. the source of the usage quantity
5. the resulting monthly amount
6. a conservative allowance shown separately from calculated usage

For example, “1 GB of S3” is not evidence unless the platform build size, expected uploaded PDFs, record count, retention period, and growth calculation explain where 1 GB came from.

### Budget position

The three platforms are expected to remain inexpensive because there is no always-running RDS, EC2, or NAT Gateway and because the expected request volume is small. A **US$10 combined monthly target/ceiling** is reasonable as an operating guardrail, not as a mathematical guarantee that AWS can never bill more.

AWS Budgets sends alerts; it does not automatically stop all charges. To control the risk:

- alert below the ceiling, for example at 50%, 80%, and 100%
- use API throttling and conservative Lambda reserved concurrency
- keep CloudWatch log levels and retention controlled
- use S3 lifecycle/retention rules for generated documents
- review Cost Explorer and service usage after the first week and first full month
- do not add RDS, EC2, NAT Gateway, X-Ray tracing, or other services without a cost review
- investigate cost anomalies immediately

The strongest evidence will be a controlled AWS dev pilot followed by actual Cost Explorer and invoice data. Forecasts should not be described to Finance as proof that cost can “never” exceed a number.

## 13. Security and ownership

- The AWS account must be company-owned from the first day.
- Root email, payment method, recovery, and MFA must remain under MSWG control.
- Cognito accounts should be administrator-created from an approved roster.
- Tokens must carry department, role, and app entitlement information.
- API authorization must use verified token claims, not browser-supplied IDs.
- Portal card hiding and frontend page hiding must be backed by API checks.
- S3 should remain private and be served through CloudFront.
- DynamoDB encryption is enabled in the template.
- Production tables should retain point-in-time recovery and deletion protection.
- IAM deployment access should be temporary and least-privilege.
- Passwords, access keys, token values, and account secrets must never be committed.
- Adding or disabling a user should be an administrative procedure documented for handover, not a source-code change.

## 14. Current validation evidence

Verified on 28 August 2026:

- node --test .\RISKREGISTER\tests\*.test.js .\AGM\tests\*.test.js .\shared\tests\*.test.js: **28 tests passed after the repository restructure**
- node RISKREGISTER\tools\setup-local-dynamodb.js: both local tables ACTIVE with the expected key schemas
- node RISKREGISTER\tools\test-local-dynamodb.js: complete real DynamoDB lifecycle passed
- container restart: risk count remained 1 and history count remained 1, proving the mounted database persisted
- AGM tests prove Physical/Virtual branching, Section A weighted scoring, 11 Chairman questions, and the single Board-attendance question
- backend tests prove claim enforcement, department isolation, creator-only update, full-visibility read/archive, validation, archived filtering, and audit-history creation
- configuration/static tests prove the current production source does not embed local DynamoDB credentials/endpoints and that consolidated frontend assets and inline scripts resolve correctly
- frontend permission tests cover full-visibility, department-head, and no-entitlement RR behaviour
- node AGM\tools\setup-agm-local-dynamodb.js: both AGM tables ACTIVE with the expected key schemas
- node AGM\tools\test-agm-local-dynamodb.js: real draft, retrieval, save, submit, approve, approved snapshot, reopen, and immutable history passed
- live AGM browser test proved record retrieval after navigation, submission locking, HOD approval, report regeneration, new-revision reopening, and the visible audit trail

Not yet proven:

- RR browser-to-API-to-database integration
- SAM lint/build
- real Cognito login and group provisioning in AWS
- deployed IAM permissions
- CloudFront/S3 deployment
- actual AWS regional usage and monthly cost
- full MSWG user-acceptance testing
- final business sign-off of the implemented AGM workflow and final Pre-Voting requirements

## 15. Business inputs still required

- final 30-person or smaller roster and verified company email addresses
- final platform entitlement for every user
- written confirmation of the three full-visibility users
- business owner, account administrator, permanent technical owner, and backup contacts
- AGM questionnaire/scoring sign-off, including rounding and approval rules
- AGM record retention and whether a signed/final PDF must be stored
- complete Pre-Voting questionnaire, roles, workflow, and PDF requirements
- final AWS account approval and company payment method
- Region/data-residency approval
- alarm and budget recipient addresses
- log-retention and backup policy
- decision on whether to remain on the CloudFront domain or use an existing MSWG DNS provider later

## 16. Recommended next sequence

1. Use this brief to reconcile the older access-control and readiness documents.
2. Connect the RR frontend's localStorage operations to api-client.js and the tested backend.
3. Run the RR frontend, API adapter, and persistent DynamoDB together locally.
4. Implement portal entitlement mapping and matching backend app-entitlement checks.
5. Obtain written AGM questionnaire/workflow approval and run analyst/HOD user acceptance testing.
6. Decide whether the approved data snapshot is sufficient or whether MSWG also requires storing a PDF binary in S3.
7. Gather and approve Pre-Voting requirements before coding it.
8. Revise the hosted frontend entry point for the shared portal and add Pre-Voting resources only after its design is approved.
9. Disable unnecessary X-Ray tracing and set the portal as the hosted entry point.
10. Install SAM CLI, then validate and build the template.
11. Obtain the company-owned AWS account and deploy an isolated dev environment.
12. Run security, persistence, Cognito, browser, print, and user-acceptance tests.
13. Measure actual usage and Cost Explorer data, then replace Finance assumptions with pilot evidence.
14. Complete the Admin Handbook, user guide, architecture diagram, deployment procedure, and cost-control runbook before production handover.

## 17. Working conventions

- Read this file first in a new session.
- Inspect the workspace before changing code; implementation may have advanced after this date.
- Treat older files in .md as historical or supporting documents when they conflict with this brief.
- Keep assumptions, test results, AWS definitions, deployments, and real billing evidence clearly separated.
- Do not promise that a variable cloud bill can never cross a value; document the target, assumptions, controls, and evidence.
- Keep each platform modular even though identity and the portal are shared.
- Never trust role, department, creator, or archive authority supplied by the browser.
- Never hard-delete risk/history data under the current retention requirement.
- Do not add an always-on AWS service without an architecture and cost review.
- Preserve company ownership and reproducible infrastructure for handover.
- Match MSWG's approved question text and scoring rules; do not invent business rules during implementation.

## 18. Continuity instruction

This document is the current source of truth for the combined RR, Pre-Voting, and Conduct of AGM initiative as of 28 August 2026. The older MSWG_RR_Brief files and supporting .md documents may contain useful history, but they must not override later decisions or current-code evidence recorded here.
