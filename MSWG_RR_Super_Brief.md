# MSWG RR — Super Brief

This is the single authoritative continuity brief for the MSWG Risk Register project. It consolidates `MSWG_RR_Brief.md` and Briefs 1–3. When an older note conflicts with a later confirmed decision, the later decision is used here.

**Last consolidated:** 13 August 2026  
**Project folder:** `C:\Projects\RR`

## 1. Project purpose

MSWG RR is an internal, department-scoped enterprise risk register for the Minority Shareholder Watchdog Group (MSWG), a small organization of approximately 26–28 people.

The system is intended to provide:

- A filterable risk-register table
- An impact-versus-likelihood risk matrix
- A residual-rating distribution chart
- Risk registration and editing
- Rating-change history across quarters and years
- Soft archiving with permanent retention
- Department-scoped access for ordinary users
- Cross-department visibility and archiving for three named privileged users

The application is being built by one final-year student working solo. The project also provides hands-on experience toward AWS SAA-C03. Development is local-first and proceeds in small, verified steps before anything is deployed to AWS.

## 2. Wider platform plan

MSWG expects to have three internal platforms in total. RR is the first.

The current plan is for all three platforms to share:

- One company-owned AWS account
- One Amazon Cognito user pool, giving staff a common login
- Per-application access controlled through Cognito groups or equivalent claims

The applications do not need to communicate with one another, so they do not need a shared VPC. They can share account-level identity and administration while keeping their application data and APIs separate.

The other two platforms are expected to be used by everyone in the company. The latest planning note says RR itself will be used by department heads plus the three named full-visibility users. Earlier backend and frontend work assumed that any authorized department member could create a risk. This entitlement boundary must be confirmed before Cognito groups and production accounts are finalized; the backend's department-scoping model supports either choice.

## 3. Current status at a glance

### Completed locally

- Persistent DynamoDB Local environment in Docker
- Two DynamoDB tables
- Six core Lambda handlers and matching local test harnesses
- Department isolation, creator-only editing, privileged cross-department access, rating history, and soft archiving
- Default filtering of archived risks from normal read results
- Separate department-user and superuser frontend prototypes
- Functional localStorage-based frontend CRUD and risk-rating UI
- Consistent role configuration, navigation, topbar, filters, charts, tables, profile pages, and registration forms

### Not yet completed

- A real company-owned AWS account
- Cognito user pool, production groups, and accounts
- Real token-to-Lambda authorization wiring
- API Gateway and deployed Lambda infrastructure
- Replacement of frontend localStorage calls with API calls
- A real login and sign-out flow
- S3/CloudFront deployment and optional custom domain
- Production testing, handover guide, and operational setup

The project is therefore a working local prototype with tested backend business logic, not yet a deployed production system.

## 4. Confirmed organization and department model

Corporate Monitoring I and II were merged into one department and one department ID. Rita Foo and Elaine Choo have equal standing as its co-heads.

The current department list contains eight department partitions/groups, including the CEO Office:

| Department / `dept_id` | Known members |
|---|---|
| CEO Office / `ceo-office` | Dr Ismet Yusoff, Phua Jing Wei, Manivanan |
| Corporate Monitoring / `corp-monitoring` | Rita Foo, Lim Cian Yai, Tan Beng Liang, Yan Lai Kuan, Lim Zhi Bin, Elaine Choo, Norhisan, Nur Amirah, Wahyuni, Gan Thian Han, Kayethri |
| Corporate Governance / `corp-governance` | Noraida Maria, Hazel Lababas |
| Corporate Resources / `corp-resources` | Lini Hazlinda |
| Finance & Admin / `finance-admin` | Emily Lim, Khairi Jamaluddin, Chia Can Nie |
| IT & Training / `it-training` | Padma Devi, Rohana |
| Creative Communications / `creative-comms` | Zulfiwa Zuehir |
| Professional Development / `prof-development` | Iman Lai, Yasmin, Nor Khalidah |

This list accounts for 26 people. Earlier project material referred to 28 people; the two-person difference has not been reconciled.

### Department-head display rules

- Dr Ismet Yusoff is the CEO and has no displayed department head.
- Corporate Monitoring has two equal co-heads: Rita Foo and Elaine Choo.
- The other department heads are Noraida Maria, Lini Hazlinda, Emily Lim, Padma Devi, Zulfiwa Zuehir, and Iman Lai.
- Department heads report to the CEO.
- Other users' heads are looked up from their department.

## 5. Authorization model

Authorization has independent layers. Department membership, full visibility, edit rights, and archive rights must not be treated as the same permission.

### Department membership

- A user belongs to a department group.
- A newly created risk is assigned to the user's department.
- `dept_id` must be derived server-side from verified identity claims, never trusted from a request body or browser field.
- A standard user reads only the risks in their department partition.

### Full cross-department visibility

Exactly three named people have full visibility:

- Dr Ismet Yusoff — CEO Office
- Phua Jing Wei — CEO Office
- Lini Hazlinda — Corporate Resources

This privilege is independent of home department or job title and is planned as a separate Cognito group such as `risk-viewers-all`. A privileged user still creates a risk in their own home department.

### Edit access

- Editing is creator-only.
- The backend compares the authenticated user ID with the risk's `created_by` field.
- Sharing a department or having full visibility does not grant permission to edit another person's risk.

### Archive access

- Only the same three full-visibility users may archive a risk.
- Archiving is a soft delete. No risk or history item is physically deleted.
- Archived risks are hidden from ordinary reads by default and can be returned explicitly with `includeArchived`.

### Account creation

- Accounts are to be created administratively; public self-signup was rejected.
- Self-signup cannot safely verify a claimed department, and department membership controls access to sensitive data.
- At this organization's size, occasional manual account creation is acceptable.

## 6. Target AWS architecture

The planned stack is serverless:

- **Amazon S3:** static frontend hosting origin
- **Amazon CloudFront:** HTTPS delivery and caching
- **Amazon Cognito:** authentication, shared login, department/app/privilege groups
- **Amazon API Gateway:** API routing and Cognito token validation
- **AWS Lambda:** business logic and server-side authorization
- **Amazon DynamoDB:** current risk state and rating-change history
- **Amazon Route 53:** optional DNS management
- **AWS Certificate Manager:** optional free TLS certificate for a custom domain
- **AWS Budgets:** cost alerting

The company already owns `mswg.org.my`. A possible production address is `risk.mswg.org.my`. The existing DNS provider could add the required record, or the subdomain could be delegated to Route 53.

The original implementation order was Cognito → DynamoDB → Lambda/API Gateway → S3/CloudFront. In practice, DynamoDB and Lambda business logic were completed first because they could be proven locally. Cognito is the next infrastructure phase once the AWS-account blocker is resolved.

No on-site server, LAN restriction, or shared VPC is required. The site may be reachable publicly over HTTPS, but data access must always require a valid token and server-side authorization.

## 7. Local development environment

Confirmed tool versions at the time of setup:

- Node.js `v24.19.0`
- npm `11.17.0`
- Docker `29.6.2`
- Git `2.55.0`
- AWS CLI `2.36.15`
- AWS CDK `2.1135.0`

The npm project is initialized, `.gitignore` exists, Git has been initialized and committed, and these DynamoDB SDK packages are installed:

- `@aws-sdk/client-dynamodb`
- `@aws-sdk/lib-dynamodb`

Editing is now done in VS Code with `C:\Projects\RR` opened as a folder and autosave enabled. This replaced Notepad after repeated mismatches between pasted code and saved file contents.

## 8. DynamoDB Local

DynamoDB Local runs in Docker with a shared database and persistent host storage:

```powershell
docker run -d -p 8000:8000 --name dynamodb-local -v C:\Projects\RR\dynamodb-data:/home/dynamodblocal/data amazon/dynamodb-local -jar DynamoDBLocal.jar -sharedDb -dbPath /home/dynamodblocal/data
```

Important rules:

- Do not run `docker rm dynamodb-local` unless intentionally discarding the local database.
- Stopping and starting the existing container is safe.
- `-sharedDb` makes the CLI and SDK use the same local database regardless of credential/region combinations.
- The volume mount preserves data across container restarts.

An early container lacked these options. DynamoDB Local separated data by credential/region and stored it non-persistently, causing a Node query to report that a CLI-created table did not exist. Rebuilding with `-sharedDb` and the volume fixed the issue. An early `finance/RISK-001` test item was lost during that rebuild; this was expected. A later `legal/RISK-002` placeholder was used during early testing and is not part of the finalized department model.

### Local AWS credentials

DynamoDB Local ignores credential validity, but the AWS CLI and SDK still require credentials to be present:

```text
AWS Access Key ID: fakeMyKeyId
AWS Secret Access Key: fakeSecretAccessKey
Region: ap-southeast-1
AWS CLI profile: local
```

The Node SDK does not automatically use the CLI's `local` profile. Each local Lambda client currently needs an explicit dummy `credentials` block. Without it, the SDK fails with `Could not load credentials from any providers`. Production code must instead use the Lambda execution role and must not retain local dummy-credential configuration in the deployed client path.

## 9. DynamoDB data model

### `mswg-risk-register`

Purpose: stores the current state of each risk.

- Partition key: `dept_id` (String)
- Sort key: `risk_id` (String)
- Billing mode: `PAY_PER_REQUEST`
- Typical attributes: `title`, `description`, likelihood, impact, `residual_rating`, `quarter`, `year`, `created_by`, `created_at`, `updated_at`, and `status`
- Archived records also contain `archived_by` and `archived_at`
- Edits update the item in place; this table is not a version log

Partitioning by `dept_id` makes an ordinary department query structurally target only one department rather than fetching all data and relying on browser-side filtering.

### `mswg-risk-history`

Purpose: records meaningful rating changes for comparison over time.

- Partition key: `risk_id` (String)
- Sort key: `changed_at` (String, ISO timestamp)
- Billing mode: `PAY_PER_REQUEST`
- Attributes include `dept_id`, `old_rating`, `new_rating`, `quarter`, `year`, and `changed_by`
- A history row is written only when `residual_rating` changes
- Minor edits such as spelling corrections do not create history rows

Creation command used locally:

```powershell
aws dynamodb create-table `
  --table-name mswg-risk-history `
  --attribute-definitions AttributeName=risk_id,AttributeType=S AttributeName=changed_at,AttributeType=S `
  --key-schema AttributeName=risk_id,KeyType=HASH AttributeName=changed_at,KeyType=RANGE `
  --billing-mode PAY_PER_REQUEST `
  --endpoint-url http://localhost:8000 `
  --profile local
```

For PowerShell AWS CLI operations, JSON files referenced with `file://` proved more reliable than heavily escaped inline JSON.

## 10. Backend functions

All backend files are in `C:\Projects\RR\lambdas`. Every handler has a matching local `test*.js` harness. All six handlers have been exercised successfully against DynamoDB Local using hardcoded identity values as temporary stand-ins for future Cognito claims.

### `createRisk.js`

- Creates a risk in the authenticated user's own department.
- Generates `risk_id` with `crypto.randomUUID()`.
- Derives quarter and year from the server date; the browser does not choose them.
- Saves `created_by` for later creator-only authorization.

### `getRisksByDept.js`

- Queries one `dept_id` partition.
- Returns only the requesting department's risks.
- Hides archived risks by default.
- Supports `includeArchived` when archived records are explicitly needed.

### `getAllRisksForExec.js`

- Provides the privileged cross-department view.
- Returns all departments or filters to one requested department.
- Rejects unauthorized callers.
- Hides archived risks by default and supports `includeArchived`.

### `updateRisk.js`

- Requires an exact `created_by` match.
- Updates the current risk record.
- Writes a history item before updating when `residual_rating` changes.
- Does not create history for minor non-rating edits.

### `getRiskHistory.js`

- Queries `mswg-risk-history` by `risk_id`.
- Returns the chronological sequence of rating changes.

### `archiveRisk.js`

- Allows only the three designated privileged users.
- Sets `status: "archived"`, `archived_by`, and `archived_at`.
- Never deletes data from either table.
- Rejects unauthorized attempts and attempts to archive an already archived risk.

All handlers use the standard `exports.handler = async (event) => { ... }` Lambda shape. Business logic should remain largely unchanged during deployment. The temporary request fields and hardcoded identity test values—such as `dept_id`, `created_by`, and `requested_by`—must be replaced with values derived from verified Cognito claims.

## 11. Frontend

The frontend follows the visual system of the original `erm.html` prototype. This is a firm design constraint: use its established styles and patterns instead of inventing a new design language.

Key design tokens and patterns include:

- Background `#eef2f8`
- Accent blue `#2f6fed`
- Semantic High, Medium High, Medium Low, and Low colors
- Inter and IBM Plex Mono typography
- Stat cards
- Dot-matrix risk visualization
- Chart.js doughnut chart
- Badge-styled table cells

Two prototype folders currently exist:

### `frontend-dept`

For standard department users:

- `dashboard.html`
- `register.html`
- `history.html`
- `profile.html`
- `common.js`
- `sidebar.js`
- `shell.css`
- `role-config.js`

### `frontend-superuser`

For the three full-visibility users. It contains the shared files above plus:

- `org-overview.html`
- `archived.html`

The duplication between the two folders is intentional for the current no-auth prototype. They will probably collapse into one frontend after Cognito supplies real role claims.

### Shared frontend behavior

`common.js` contains:

- The shared eight-risk seed `DATA` array based on real MSWG risk-register content
- localStorage-based CRUD helpers such as `getAllData`, `addRisk`, and `archiveRisk`
- Rating helpers such as `computeRating`, `ratingClass`, and `bucketFromScore`
- Override/deduplication logic: archiving a seed risk stores an override with the same risk number, and `getAllData()` replaces the seed row instead of duplicating it

`sidebar.js` provides:

- Sidebar navigation and active-page state through `window.CURRENT_PAGE`
- A sticky topbar
- Time- and language-aware greetings
- Profile menu
- A placeholder sign-out action
- Persisted, smoothly animated sidebar collapse

`role-config.js` is loaded before `common.js` and `sidebar.js` and is the single source for the current prototype's:

- `window.DEPT_LABEL`
- `window.USER_NAME`
- `window.IS_VIEWER`
- `window.IS_DEPT_HEAD`

This extraction fixed a recurring problem where copied pages contained stale inline role variables and silently hid superuser navigation. Only `window.CURRENT_PAGE` remains page-specific.

The superuser topbar uses dark navy (`#1c2536`) instead of the standard accent blue so the two prototype roles are visually distinct.

The sidebar uses sticky positioning and accounts for the topbar through `--topbar-h`, preventing independent scrolling and content overlap.

### Pages and features

- `dashboard.html`: filters, stats, matrix/chart/table views, and a Register Risk modal
- `register.html`: standalone version of the full risk-registration form
- `history.html`: rating-history presentation and filters
- `profile.html`: name, department, and department-head display
- `org-overview.html`: superuser organization-wide overview
- `archived.html`: superuser archived-risk view and current manual archive control

Filters are implemented consistently on the dashboard, history, organization overview, and archive pages. Dropdown options are derived from the current data; all active filters are combined before a single render path refreshes charts, stats, and tables.

The Register Risk modal and standalone page preserve the prototype's impact, likelihood, control-method, effectiveness, trend, and related fields. Inherent and residual ratings are computed and previewed live.

### Frontend data-model warning

The original `erm.html` seed schema groups risks by risk **element**—for example Reputational, Financial, and Compliance—not by department. It has no real `dept_id` field. The organization overview therefore groups by element only as a temporary prototype behavior.

Do not conflate risk element with department. When the real API is connected, organization-wide grouping must use backend `dept_id` values while retaining risk element as a separate business field.

### Frontend placeholders still to replace

- Role and identity values are hardcoded in each folder's `role-config.js`.
- CRUD uses localStorage rather than the API.
- No real login page exists.
- Sign out displays a placeholder alert.
- The archive prototype uses a manual risk-number input rather than a fully wired per-row action.

## 12. AWS account and ownership blocker

No production AWS account had been created at the time of the latest brief. Cognito and deployment work are blocked pending management provision of:

1. A company-owned administrative email, such as `aws-admin@mswg.org.my`
2. A company payment card

A personal email or card should not be used. MSWG must own the account from day one so access, billing, and recovery remain with the organization after the developer leaves.

The existing public MSWG website is hosted by the external provider IPServerOne. The RR proposal is not a proposal to migrate that website. The AWS account is for RR and the planned internal platforms.

Meeting/Finance preparation already produced:

- A plain-language justification for in-house AWS hosting of RR
- An external-vendor-versus-AWS comparison covering ownership, cost, logins, role access, user administration, data ownership, future change, handover risk, and scaling to more platforms
- A full service and cost list for Finance
- A handover explanation centered on admin-created Cognito users, infrastructure as code with AWS CDK, and an Admin Handbook

Adding or removing a user should ultimately be an administrative procedure, not a software-development task.

## 13. Cost expectations

- Expected RR cost at this scale: approximately **US$1–$5 per month**
- Planning ceiling: **US$30 per month**
- Recommended AWS Budgets alert: **US$10 per month**
- ACM certificates are free when used with supported AWS services.
- Route 53 is optional and may add a small hosted-zone/domain-management cost.

The AWS account and Cognito pool are intended as shared foundations for all three internal platforms. Later platforms should add mostly incremental usage and data costs rather than requiring three unrelated account foundations.

## 14. Timeline

The original part-time estimate, at roughly 10–15 hours per week, was:

1. Planning and design — 1 week
2. AWS foundation — 1–2 weeks
3. Backend — 2–3 weeks
4. Frontend integration — 2 weeks
5. Testing — 1–2 weeks
6. Deployment and handover — 1 week

Total estimate: approximately 8–11 working weeks or 2–3 months elapsed time.

Planning, local data infrastructure, core backend logic, and substantial frontend prototyping are now complete. The schedule must be reassessed once the AWS account is available because production identity, integration, testing, and handover remain.

## 15. Next recommended sequence

1. Confirm the exact RR user population: all department members, or only department heads plus the three privileged viewers.
2. Resolve the 26-versus-28-person roster discrepancy.
3. Obtain the company-owned AWS email and payment card and create the AWS account securely.
4. Configure an AWS Budgets alert and appropriate administrative access.
5. Define shared Cognito naming conventions for app entitlement, department membership, and cross-department RR privilege.
6. Create the Cognito user pool, groups, app client, and initial users.
7. Replace hardcoded backend identity inputs with verified claims.
8. Deploy the two DynamoDB tables, IAM roles, Lambdas, and API Gateway—preferably through AWS CDK.
9. Add the real frontend login flow and replace localStorage CRUD with authenticated API calls.
10. Reconcile the frontend element-based seed model with the backend department-based model.
11. Complete archive actions, error handling, loading states, and privileged overview behavior.
12. Test department isolation, creator-only editing, privilege checks, archive behavior, token expiry, and all key user journeys.
13. Deploy through S3 and CloudFront, then connect the optional custom subdomain.
14. Create production accounts, conduct user acceptance testing, and complete the Admin Handbook and user guide.

## 16. Outstanding decisions and risks

- **RR entitlement:** the latest strategy says department heads plus three privileged users, while earlier implementation assumed all department members. Confirm before creating production access groups.
- **Roster:** 26 named people are listed, but earlier scope says 28.
- **Executive summary depth:** decide whether privileged users need more than a combined table and current organization overview.
- **Shared Cognito design:** decide now only what RR requires while leaving a clean convention for the two future platforms.
- **Infrastructure ownership:** production work cannot proceed responsibly until the company owns the AWS email, billing method, root account, and recovery path.
- **Frontend/backend schema:** risk element and department are independent dimensions and must be modeled separately during API integration.
- **Admin documentation:** the Admin Handbook is promised but not started; it should be written incrementally as real AWS resources are created.

## 17. Working conventions and lessons

- Work one command or small step at a time and review its output before continuing.
- Explain why a step matters in plain language, not only what command to run.
- Prove behavior locally before using paid or production AWS resources.
- Preserve the established `erm.html` design system and current code patterns.
- Keep a matching local test harness for every Lambda.
- If test output is surprising, verify the file actually saved in VS Code; `Get-Content` or `type filename.js` can catch stale or mixed-up contents.
- Remember that PowerShell paths are relative to the current directory; replaying an older command after changing directories can target the wrong file.
- Prefer `file://` JSON payloads for AWS CLI commands in PowerShell when inline quoting becomes fragile.
- Never trust department IDs, creator IDs, viewer flags, or archive authority from the browser.
- Never hard-delete risk or history records under the current retention requirement.
- Do not remove the `dynamodb-local` container unless local data loss is intentional.
- Keep company infrastructure company-owned and reproducible with AWS CDK to reduce handover risk.
- Match the requested communication format; avoid unnecessary design or scope changes.

## 18. Continuity instruction

For a new development session, read this file first and treat it as the source of truth. Then inspect the current workspace before changing code, because implementation may have advanced since this consolidation. The four older brief files are historical snapshots and should not override this document.

## 19. Local-readiness implementation update — 13 August 2026

The AWS-waiting-period roadmap has now been substantially implemented locally:

- The access baseline is documented in `docs/access-control-matrix.md`. It currently assumes RR entitlement for department heads plus the three full-visibility users, no archived-risk restore in release one, and proposed account administration by Lini Hazlinda with Dr Ismet as approval/backup contact. These assignments remain subject to written MSWG confirmation.
- `outputs/rr-local-readiness/MSWG_RR_User_Accounts.xlsx` contains the 26 known people, department IDs, application roles, full-visibility flags, account status, and no password column. Company emails remain blank because verified addresses were not provided.
- The six Lambda handlers now derive identity and department only from API Gateway authorizer claims. Request fields cannot choose the creator, updater, viewer, or archiver.
- Backend configuration is environment-based. Production Lambda source contains no DynamoDB Local endpoint, literal table name, region, or dummy credential.
- Every successful update now creates an audit-history entry transactionally, even when the residual rating does not change. History contains changed fields, before/after values, quarter, year, and authenticated actor.
- `Frontend/risk-register` consolidates the two prototype folders into a single claims-driven application. It includes permission-aware navigation, department scoping, full-visibility pages, archive controls, a hosted Cognito login flow with PKCE, callback exchange, and environment-configured API client.
- `infrastructure/template.yaml` defines the dev/prod SAM/CloudFormation stack: shared Cognito pool and groups, DynamoDB, six Lambdas and generated execution roles, HTTP API JWT authorization, private S3/CloudFront, retained logs, CloudWatch/SNS alarms, and conditional budget alerts.
- IAM, deployment-decision, local-development, acceptance-test, and readiness-status documents now exist under `docs`.
- The automated suite contains 16 passing backend/security/configuration/frontend tests. All Lambda and consolidated-frontend JavaScript passed syntax checks.

Limitations at this checkpoint:

- The consolidated pages still perform their prototype CRUD through localStorage; `api-client.js` is prepared, but page-by-page API integration remains.
- SAM CLI is not installed, so the infrastructure template has not yet received `sam validate --lint` or `sam build` verification.
- Live browser automation could not connect in the current desktop runtime; frontend claims/permissions and all inline scripts were verified through deterministic tests instead.
- Company emails, final owners/administrators, the 26-versus-28 roster discrepancy, budget recipients, and final retention/DNS approvals remain business inputs.

Use `docs/local-readiness-status.md` as the operational checklist for the next session.
