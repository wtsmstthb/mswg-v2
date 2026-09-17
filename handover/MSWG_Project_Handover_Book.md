# MSWG Internal Platform Handover Book

## Successor edition

Prepared 10 September 2026. Repository reviewed: `C:\Projects\RR`. This book transfers practical knowledge of the current project. Read it together with the separate AWS Deployment Guide before changing the hosted environment.

The product is one MSWG Internal Platform with three modules: Risk Register, Pre-Voting and Conduct of AGM. A shared portal connects them. They are not yet equally ready for AWS. Risk Register and AGM have working local backends and shared infrastructure definitions. Pre-Voting has a working prototype with a different database and additional migration work.

The handover objective is to give the successor enough understanding to run the project, preserve its records, resolve the known gaps, and complete a reviewed AWS release. Having the master repository is the starting point; it does not itself provide an AWS account, production configuration, approved user accounts or a tested deployment.

The planning date assumed here is Friday 18 September 2026. Annual leave is understood to run through Tuesday 15 September. Wednesday 16 September may be a nonworking day; verify the company calendar. Do not assume that the original developer will be available for deployment support during leave. If "next Friday" meant a different date, move the milestones without compressing the checks.

For a successor learning AWS, allow approximately 40-70 productive hours for a reviewed RR and AGM release, roughly 7-12 working days at six productive hours per day. This includes learning, setup, fixing release gaps, deployment, testing and documentation. Account permissions, DNS changes and business approvals add elapsed waiting time. Pre-Voting could add another 30-60 hours and may exceed that if the Bursa extractor needs redesign.

A useful first milestone is independent local operation and a reviewed AWS development pilot. Treat a full three-module production launch as a later milestone unless its remaining work is completed and verified.

No live AWS deployment was performed or verified during this audit. The evidence below describes source code and local automated checks.

<!-- pagebreak -->

# What is being handed over

## Repository baseline

The reviewed checkout is on `master`. Its current commit and cached `origin/master` both point to:

`7aae24e08ab6eff3c65cf96f67875c673fd35472`

Commit message: "new pages in Risk Register". Commit time: 10 September 2026, 09:34 Malaysia time. The remote was not fetched during this audit, so verify the latest remote state when taking over.

Two local changes are outside that commit: modified `AGM/TestRun.md` and untracked root `TestRun.md`. Arrange an explicit transfer or review. A fresh clone will not include uncommitted work. Preserve these files before switching branches or cleaning the checkout.

Start by reading the repository state:

```powershell
cd C:\Projects\RR
git status
git branch --show-current
git log -1 --oneline
git remote -v
```

Use a clean working tree before integrating remote changes. If local edits exist, review and save them in an agreed branch or backup first. Do not overwrite them to obtain a clean status. Once clean, fetch and inspect before using a fast-forward-only pull.

## Files to locate first

- `shared/portal/index.html`: common module-selection page.
- `shared/infrastructure/template.yaml`: shared AWS resource definition.
- `shared/infrastructure/samconfig.toml`: development and production deployment settings.
- `RISKREGISTER/frontend`, `backend`, `tests`, `tools`: current RR application.
- `AGM/frontend`, `backend`, `tests`, `tools`: current AGM application.
- `PRE-VOTING/frontend`, `backend`, `testing`: Pre-Voting prototype and SQLite data.
- `shared/docs/iam-deployment-role-request.md`: deployment access request.
- `RISKREGISTER/docs/access-control-matrix.md`: proposed business access rules.

Several older notes are historical evidence, not current instructions. The consolidated brief still describes an accidentally truncated infrastructure template and an old test failure. The template has since been restored. The root README still says two applications, and the local-development guide refers to `.env.example`, while the actual placeholder filename differs and contains old table names.

Use current code, this dated baseline and fresh checks to resolve contradictions. Do not copy old test counts, account assignments or release claims into the new handover record without verification.

<!-- pagebreak -->

# How the modules work

## Risk Register

A department user creates risks for their assigned department, records risk ratings and mitigation information, and edits records they created. Full-visibility users can read across departments and archive records. Full visibility does not grant unrestricted editing of another person's risk.

The main data is stored in DynamoDB. Every successful update creates history; record versions help prevent one user's save from overwriting a newer version. Archive is a soft delete: the record remains stored but disappears from normal active views. There is no ordinary restore button in the first release.

The register page and dashboard modal offer risk-element choices with a custom option. The current calendar quarter is filled automatically and locked. These interface features do not remove the need for backend validation.

## Conduct of AGM

An assessor completes sections A-J and saves a draft. Submitting locks the assessment for review. A reviewer approves it or returns it with a reason. An approved assessment can be reopened with a reason, creating a new revision. The backend calculates the score and enforces versions and workflow transitions.

Saved assessments are listed in `AGM/frontend/records.html`. `landingpage.html` creates or opens a record. The approved report snapshot is saved so a PDF can be regenerated. The PDF file itself is not automatically a separately stored document in S3. The older `land2.html` is a prototype and should not be used as the working assessment list.

## Pre Voting

The user retrieves a Bursa announcement, records For, Against or Abstain for ordinary resolutions, adds required remarks and submits. Submission currently saves meeting details and votes to SQLite. History can display and print a saved submission.

Two limitations need to be understood immediately. Save Draft does not persist anything; it displays a message about future database connection. If the history API fails, the page silently displays example records. Therefore, a populated history page alone is not evidence of successful saving.

The portal currently labels all three modules available, but its entitlement display is still a prototype. Production readiness must be judged by each module's backend, authentication and verification results.

Source references: `RISKREGISTER/backend`; `AGM/backend/lib/workflow.js`; `AGM/frontend/assessment-persistence.js`; `PRE-VOTING/frontend/prevoting.js`; `PRE-VOTING/frontend/history.js`.

<!-- pagebreak -->

# Accounts access and ownership

## Business accounts

The intended shared sign-in service is Amazon Cognito. The current infrastructure allows administrator-created accounts. The successor should obtain an approved roster and invite users through the agreed administrative process. Do not enable public self-registration merely to make the signup button work.

The local Test as selectors are demonstrations. The local servers translate them into test identities. In AWS, the API must use verified Cognito claims and approved groups. A user changing browser storage must never gain backend permissions.

RR's group model includes `rr-app-users`, `rr-department-heads`, `rr-viewers-all` and one `rr-dept-<department-id>` group. A custom department attribute must agree with the department group when both are present. The account-admin marker is separate from business access and is not itself a management console.

There is a policy detail to reconcile: the written RR scope says heads plus full-visibility users, while the current backend accepts any one of its three application-role groups with a valid department. Provision only the approved combinations and confirm whether stricter enforcement is needed.

AGM access requires `agm-app-users` and an assessor or reviewer group. Assessor operations also require the Corporate Monitoring department. Editing and submission belong to the original assessor. Reviewers can review or reopen as permitted by status. Current entitled AGM users can read the assessment collection; it is not implemented as private per-assessor storage.

## Ownership record to complete

- Business owner: ____________________
- Successor technical owner: ____________________
- Backup technical contact: ____________________
- Account administrator: ____________________
- Finance and budget recipient: ____________________
- Technical alarm recipient: ____________________
- DNS and certificate contact: ____________________
- User acceptance sign-off contact: ____________________

Record these assignments in the handover meeting. Names in old planning notes are proposals until confirmed. Transfer access through company-controlled accounts and approved channels. The book should contain identifiers and responsibility records, not passwords, temporary credentials or recovery codes.

The signup page does not submit an access request. Its registration redirect conflicts with the admin-only policy. Correct it and test password recovery as described in the AWS guide before release.

<!-- pagebreak -->

# Prepare the successor workstation

## Get the repository safely

Install Git, a supported Node.js version, Docker Desktop and an editor. The backend AWS target currently uses Node.js 22; the audited local tests ran on Node.js 24.19.0. Keep the chosen version in the handover record and validate the actual AWS build separately.

If `C:\Projects\RR` does not exist, clone into it:

```powershell
cd C:\Projects
git clone https://github.com/wtsmstthb/mswg.git RR
cd C:\Projects\RR
```

If it already exists, inspect its Git status instead of cloning over it. Obtain the separate uncommitted handover files and approved local-data backup through the agreed channel.

## Install the Node dependencies

There is no root package manifest, and the two current backends do not have committed lockfiles. Do not assume that running `npm ci` at the repository root will work.

```powershell
cd C:\Projects\RR
npm install --prefix .\RISKREGISTER\backend
npm install --prefix .\AGM\backend
```

Review the generated dependency changes before committing. These commands install the AWS SDK packages used by each backend. Local tools sit outside the backend directories, so tell each PowerShell terminal where those packages are:

```powershell
$env:NODE_PATH = 'C:\Projects\RR\RISKREGISTER\backend\node_modules'
```

Repeat that setting in every new terminal used for the local servers or database tools. The current backends use the same two SDK packages, so the RR installation satisfies the utility scripts. It is a session setting, not a permanent Windows change. If the clone uses a different directory, change the path consistently.

Verify the tools:

```powershell
git --version
node --version
npm --version
docker version
```

Docker Desktop must be running before the database can start. The existing developer machine already has a container named `rr-dynamodb`; the successor machine may not. Locate or create it using the next page.

This installation sequence is a fresh-machine procedure derived from the current file layout. It was not executed on a new workstation during this audit. Capture any missing dependency or compatibility issue so the repository setup can be made reproducible.

<!-- pagebreak -->

# Run Risk Register and AGM locally

## Start the local database

First check whether the named container exists:

```powershell
docker ps -a --filter "name=rr-dynamodb"
```

For an existing container, inspect its mount and confirm that it points to the intended local-data folder before relying on its records:

```powershell
docker inspect rr-dynamodb
docker start rr-dynamodb
```

For a new workstation without that container, prepare the folder and create it once:

```powershell
New-Item -ItemType Directory -Path C:\Projects\RR\dynamodb-data -Force
$dataMount = 'type=bind,source=C:\Projects\RR\dynamodb-data,' +
  'target=/home/dynamodblocal/data'
docker run -d --name rr-dynamodb -p 127.0.0.1:8000:8000 `
  --mount $dataMount amazon/dynamodb-local `
  -jar DynamoDBLocal.jar -sharedDb `
  -dbPath /home/dynamodblocal/data
```

Keep the mount path consistent with the cloned repository. Check `docker logs rr-dynamodb` if startup fails. Do not recreate or remove an existing container as the first troubleshooting step.

## Open two server terminals

In each terminal, go to `C:\Projects\RR` and set `NODE_PATH` as described on the previous page. Then start one module per terminal:

```powershell
node RISKREGISTER\tools\serve-risk-local.js
```

```powershell
node AGM\tools\serve-agm-local.js
```

Open RR at `http://localhost:3200/RISKREGISTER/frontend/dashboard.html`. Open AGM at `http://localhost:3100/AGM/frontend/records.html`. Leave both server terminals open. Closing them stops their service. The servers create missing tables, but they do not turn the workstation into an AWS deployment.

Open each module on its correct port. A portal link can show another module's HTML under the first server's port, while its relative API calls fail. Double-clicking an HTML file similarly does not provide a working backend. The "Cannot reach the local Risk Register server" message normally means the expected service is unavailable or the page was opened from the wrong address.

The four table names are `mswg-rr-local-risks`, `mswg-rr-local-history`, `mswg-agm-local-assessments` and `mswg-agm-local-history`. Real local saves go into these tables rather than the HTML files.

<!-- pagebreak -->

# Handle Pre Voting as a separate workstream

## Current local arrangement

Pre-Voting uses FastAPI and SQLAlchemy, with SQLite at `PRE-VOTING/testing/mswg_test.db`. The Python dependency manifest is missing. Before making its setup repeatable, review and record the versions needed for FastAPI, Uvicorn, SQLAlchemy, Pydantic and Playwright. Chromium must also be installed for Playwright.

The repository's current commands are:

```powershell
cd C:\Projects\RR\PRE-VOTING\backend
python -m uvicorn api:app --reload --port 8000
```

In another terminal:

```powershell
cd C:\Projects\RR
python -m http.server 8080
```

The browser address is `http://localhost:8080/PRE-VOTING/frontend/index.html`.

These defaults conflict with DynamoDB Local, which also uses port 8000. Do not expect all three modules to run together unchanged. For an isolated Pre-Voting demonstration, stop RR and AGM work and deliberately stop the local DynamoDB container first. For integrated development, move the Pre-Voting API to an agreed unused port and update every frontend API reference, preferably through environment configuration. That code change remains a successor task.

## Work required before AWS release

The confirmed target uses Cognito, HTTP API, Lambda and DynamoDB. Pre-Voting currently has none of those production integrations. Its submit and history endpoints do not enforce verified identity, department or entitlement. Its database is a local file, not a deployed DynamoDB table.

The Bursa extractor opens a visible Chromium window. Its source explicitly says headless operation needs debugging. Extraction includes long waits, so browser packaging and request timing need a tested design before choosing Lambda configuration. Simply uploading the Python files will not complete this migration.

Priorities are authenticated access, environment-based endpoints, persistent drafts if required, approved workflow rules, version protection, real audit history, automated tests and AWS resources. Remove silent demonstration-record fallback from production behavior. Confirm whether any existing SQLite records are test material or approved records requiring a separate migration plan.

Source references: `PRE-VOTING/backend/api.py`, `database.py`, `extractor.py`; `PRE-VOTING/frontend/prevoting.js`, `history.js`; `PRE-VOTING/frontend/README.md`.

<!-- pagebreak -->

# Evidence and release priorities

## Verified on 10 September

The read-only combined test run produced 33 tests, with 32 passing and one failing:

```powershell
node --test .\RISKREGISTER\tests\*.test.js `
  .\AGM\tests\*.test.js .\shared\tests\*.test.js
```

The failure is in `RISKREGISTER/tests/frontend.static.test.js`: the newly added forgot-password page is expected to load permission configuration because the public-page exemption has not been updated. Review signup at the same time. Do not add authentication-required scripts to a public recovery page solely to silence the test. Preserve the test's asset and JavaScript checks while correcting its intended page classification.

Passing unit tests cover mocked authorization, validation, workflow and static wiring. They do not prove a new AWS account or deployment is configured correctly. Older successful Docker and browser checks remain historical evidence; they were not repeated during this read-only audit.

## Work in priority order

1. Preserve the reviewed commit, outstanding local files and approved data. Assign owners and obtain the AWS learning material.
2. Reproduce RR and AGM on the successor workstation. Resolve the current static-test failure and record a clean repeatable check.
3. Confirm users, permissions, Region, alert recipients and deployment access.
4. Resolve Cognito return flows and production frontend identity handling. AGM still derives some display behavior from local-role settings, and its assessor department claim must be verified in the actual token used by the API.
5. Validate and build the SAM template, deploy development, generate environment configuration and upload only intended frontend assets.
6. Test real sign-in, record persistence, permission denials, AGM review, history, reports, logging and recovery before production sign-off.
7. Complete the Pre-Voting migration separately, then include it in the same production acceptance process.

The current template covers RR and AGM, with shared Cognito, HTTP API, Lambda, DynamoDB, private S3, CloudFront, CloudWatch, SNS and optional Budgets. ACM is conditional on custom-domain use. It does not contain Pre-Voting backend resources.

Local mock roles must be absent from production configuration. Portal visibility should reflect approved entitlements, while the backend continues to enforce them. A visible button or hidden menu is not an authorization test.

<!-- pagebreak -->

# Data protection and everyday operation

## Know which environment holds the record

Local RR and AGM data lives in DynamoDB Local's mounted folder. Local Pre-Voting data lives in its SQLite file. AWS tables will be separate resources created by deployment. Cloning Git or copying frontend files does not move records from local storage into AWS.

Both the local DynamoDB database file and Pre-Voting SQLite file are currently tracked in Git despite the ignore rule for the DynamoDB folder. Treat their contents as local/test data until reviewed. Do not automatically import them as production business records.

Before a local backup, stop the application servers and stop the relevant database writer. Copy the approved data to a dated backup location and record which commit and environment it belongs to. Verify that the backup exists and can be read before relying on it. Do not copy an actively written SQLite database as though it were a guaranteed consistent backup.

If local records disappear, check the browser port, active role, filters, table names and container mount before attempting recovery. An empty filtered list does not prove deletion. A stopped server does not itself erase records. Avoid deleting the mounted data folder or recreating resources during diagnosis.

## Recovery requires a controlled procedure

RR archive is a business operation, not a database backup. There is no approved normal restore workflow. Preserve the archived item and its history; escalate accidental archive to the business and technical owners before designing a correction.

For AWS, verify production point-in-time recovery and retention settings after deployment. A DynamoDB recovery creates a restored table; the application does not automatically switch to it. Validate the restored data and permissions, then follow a reviewed configuration change and record the cutover. Test recovery in development before an incident.

Use CloudWatch for errors and request behavior. The current infrastructure specifies 30-day development and 90-day production log retention; confirm acceptance and the deployed values. Logs are diagnostic evidence, not the permanent business history store. Monitor SNS subscription confirmation and budget recipients after deployment. Budget notifications alert people; they do not impose a universal spending stop.

For a failed save, retain the message, timestamp, environment and record identifier. Do not put passwords, tokens or complete sensitive records into a support message.

<!-- pagebreak -->

# Handover acceptance and learning plan

## Record the agreed milestones

Use productive hours rather than promising a fixed calendar date before access is available. The shared 40 to 70 hour RR and AGM estimate allocates 8 to 12 hours to learning and local reproduction, 12 to 22 to preparation fixes, 6 to 10 to AWS development deployment, 8 to 14 to workflow and permission testing, and 6 to 12 to production release and handover. The AWS guide gives the matching milestones.

These are planning ranges, not a measured delivery commitment. Record blocked waiting time separately. Reassess after the first local demonstration and development build. Pre-Voting adds an estimated 30-60 hours with significant uncertainty around authentication, database migration and the Bursa extractor.

## Acceptance checklist

- [ ] Successor has the repository, commit reference and separately transferred local changes.
- [ ] Technical, business, account and alarm owners are named.
- [ ] AWS learning module and access instructions have been received.
- [ ] RR and AGM run independently on the correct local ports.
- [ ] Successor can create, reload and locate a saved RR and AGM record.
- [ ] Creator-only editing, cross-department denial and reviewer permissions have been demonstrated.
- [ ] AGM submit, return, approve, reopen, history and approved-report regeneration have been demonstrated.
- [ ] Current automated failure is resolved and evidence recorded.
- [ ] Pre-Voting limitations and the separate release milestone are understood.
- [ ] Development AWS build, sign-in and save/read workflows pass before production release.
- [ ] Monitoring recipients, backups, recovery and support ownership are verified.
- [ ] Business acceptance and deployment approval are recorded with dates.

Successor acknowledgment: ____________________  Date: __________

Business acceptance: ____________________  Date: __________

<!-- pagebreak -->

# Reference and quick lookup

## Small glossary

**Repository** is the versioned project folder. **Commit** is a recorded code snapshot. **Frontend** is the website in the browser. **Backend** processes requests and applies business rules. **API** is the interface between them. **Cognito** handles sign-in. **Lambda** runs backend functions on demand. **DynamoDB** stores records. **S3** stores frontend assets. **CloudFront** delivers those assets over HTTPS. **SAM** describes and deploys AWS resources. **Environment** separates local, development and production use. **IAM** controls AWS permissions. **PKCE** helps secure browser sign-in. **Point-in-time recovery** supports restoring database data to an earlier moment. **User acceptance testing** confirms that the business workflow meets its agreed needs.

Keep the completed checklist with deployment outputs, test evidence, approved account roster and recovery notes. Update this handover after the successor's first independent release.

## Where to look when a question comes up

- Saved RR records: use the register and history screens on the RR local server at port 3200.
- Saved AGM records: open `http://localhost:3100/AGM/frontend/records.html`. Use the record's History or Approved report action where available.
- Read-only AGM database inspection: run `node AGM\tools\inspect-agm-local-dynamodb.js` after setting the local dependency path and starting DynamoDB Local.
- Actual local workflow tests: `node RISKREGISTER\tools\test-local-dynamodb.js` and `node AGM\tools\test-agm-local-dynamodb.js`. These write clearly labelled test records; run them only in the intended local test database.
- Infrastructure and deployment settings: `shared/infrastructure/template.yaml` and `samconfig.toml`.
- Known production prerequisites, official AWS sources and command examples: the companion AWS Deployment Guide.

This handover was assembled from the reviewed master checkout and the read-only combined test run. The files under `shared/docs` and module READMEs provide additional background, but some status text is older than the current code. Preserve the date and commit when recording evidence.

## First independent demonstration

The successor should show the manager where each module starts, save and reopen an RR record, save and reopen an AGM assessment, explain the Pre-Voting limitations, and identify the current deployment blocker and its owner. The purpose is to establish independent ownership before promising a live release date.
