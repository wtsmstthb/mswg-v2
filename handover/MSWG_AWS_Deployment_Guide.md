# MSWG Internal Platform AWS Deployment Guide

## A guided workbook for the incoming developer

Prepared for the MSWG successor and technical reviewer

10 September 2026 | Version 1 | Companion to the Project Handover Book

We are handing over one internal platform with three modules: Risk Register, Conduct of AGM, and Pre-Voting. Your first deployment task is to establish a tested AWS development environment for Risk Register and AGM. Pre-Voting needs further backend development before it can join the same production platform.

This book takes you from the master repository to an AWS release using the services already discussed: Cognito, Lambda, API Gateway HTTP API, DynamoDB, S3, CloudFront, Certificate Manager where a custom domain is used, CloudWatch, SNS, and AWS Budgets. SAM and CloudFormation create and update these resources together. IAM supplies the permissions they require.

**The code is not ready for an unchanged production upload.** Complete the preparation tasks in chapters 4 and 5 before deployment. They describe actual differences found in the current code, not optional improvements.

Allow approximately **40 to 70 focused hours for learning, preparation, RR and AGM deployment, testing, and release**. At six productive hours per day, this is roughly 7 to 12 working days, excluding account access and review delays. Add a provisional **30 to 60 hours for Pre-Voting migration**, with further time possible if its browser extraction needs redesign. These are planning estimates, not a delivery promise.

The repository reviewed was `C:\Projects\RR`, local master commit `7aae24e`, dated 10 September 2026. No AWS resources were created or live account settings verified while preparing this book. Record the release commit and actual AWS outputs as you work.

### How to use this book

Read the handover book first. Follow this workbook in order, one checkpoint at a time. Commands assume Windows PowerShell and the project at `C:\Projects\RR`; change that path if your checkout is elsewhere. Replace every value beginning `REPLACE_` before running a command. Do not paste the `PS C:\>` prompt or Markdown fences.

Keep a deployment journal with the date, commit, environment, command result, and unresolved issue. Stop at a failed checkpoint and correct its cause before continuing. A loaded page is only one part of a successful release; saved records and access controls must also work.

<!-- pagebreak -->

## 1 What you will deploy

The employee opens CloudFront over HTTPS. CloudFront reads approved frontend files from a private S3 bucket. Cognito signs the employee in. The browser sends the resulting token to API Gateway, which validates it and invokes a Lambda function. The function checks the employee's role and reads or writes DynamoDB. CloudWatch records operational information; SNS and Budgets deliver alerts.

| Service | Job in this platform | Current template coverage |
| --- | --- | --- |
| Cognito | Employee identity and group membership | One shared pool, client and sign-in domain per environment |
| Lambda | Application operations | Six RR and eight AGM functions |
| HTTP API Gateway | Authenticated browser to backend requests | One shared API with RR and AGM routes |
| DynamoDB | Current records and history | Four on-demand tables |
| S3 | Frontend files | Private, encrypted, versioned bucket |
| CloudFront | HTTPS website delivery | Distribution and signed access to S3 |
| Certificate Manager | Certificate for an optional custom domain | Existing certificate ARN supplied as a parameter |
| CloudWatch | Logs, metrics and error alarms | Logs and two alarm resources |
| SNS | Operational email notifications | Topic and optional email subscription |
| AWS Budgets | Cost warnings | Optional monthly budget, default USD 10 |

CloudFormation is the AWS resource manager. SAM is the developer tool and template format used to drive it. Do not manually recreate the same tables, functions, and API in the console; that produces a second configuration which is harder to repeat. The console remains useful for inspecting resources and administering accounts. [S1]

The checked-in deployment region is **Singapore, `ap-southeast-1`**. Older cost screenshots mixed regions. If MSWG requires Malaysia instead, obtain that decision before creating the stack and update the region and cost assumptions consistently. Do not switch regions halfway through this procedure.

The CloudFront default hostname works without purchasing a domain or requesting a separate ACM certificate. An MSWG custom hostname is optional. For a CloudFront custom hostname, the ACM certificate must be in `us-east-1`, even when the application runs in Singapore. [S3]

There is no current Pre-Voting Lambda, DynamoDB table, or authenticated API route in this template. Uploading its HTML would not move its Python API or SQLite records into AWS. Chapter 14 explains the remaining work.

<!-- pagebreak -->

## 2 Plan the time and the learning

Use the AWS learning material already supplied alongside the relevant task. You do not need to finish every AWS topic before starting the local project. Complete one small practical result, record what it proves, then move to the next stage.

| Stage | Focused time | Evidence to finish the stage |
| --- | --- | --- |
| Learning and local reproduction | 8 to 12 hours | Explain the architecture and reopen locally saved RR and AGM records |
| Deployment preparation and fixes | 12 to 22 hours | Reviewed path, identity, configuration, and monitoring changes; tests pass |
| AWS development deployment | 6 to 10 hours | Stack complete, published files, real Cognito sign-in |
| Workflow and permission testing | 8 to 14 hours | RR and AGM acceptance records with separate users |
| Production release and handover | 6 to 12 hours | Approved release, monitoring and recovery evidence |
| Total for RR and AGM | 40 to 70 hours | A reviewed release, not only a hosted screenshot |

Waiting for account permissions, email invitations, DNS validation, business review, and holidays is outside these focused-hour estimates. CloudFormation and CloudFront also take time to process changes; reserve 15 to 45 minutes as an initial deployment planning allowance, not an AWS guarantee.

Suggested learning order: IAM and temporary credentials; S3 and CloudFront; Cognito and tokens; API Gateway and Lambda; DynamoDB and recovery; CloudWatch and cost control. Match your supplied course sections to these subjects. The course itself was not available for review, so no lesson numbers are assumed.

### The September handover window

The planning interpretation is Thursday 10 September 2026 today, leave through Tuesday 15 September, and next Friday 18 September as the target checkpoint. Confirm this interpretation in the handover meeting. Check the MSWG work calendar, especially 16 September, rather than assuming every weekday is available.

For 18 September, set the minimum milestone as: successor has repository and AWS access, both local modules work, preparation issues have owners, and a reviewed development deployment is attempted or completed if its prerequisites pass. A full three-module production release should not be promised for that date based on the current code.

A useful daily update is five lines: what now works, what evidence was saved, what failed, who can resolve it, and the next task. Ask the technical reviewer for help when an identity or deployment issue has consumed two focused hours without progress.

<!-- pagebreak -->

## 3 Prepare the workstation and account details

Install Git, Node.js 22 and npm for parity with the Lambda template, Docker Desktop for local DynamoDB, AWS CLI v2, and AWS SAM CLI using their official installers. The current handover workstation has no working SAM CLI, so its presence must not be assumed on the successor's machine. Open a new PowerShell window after installation. [S2]

```powershell
git --version
node --version
npm --version
docker --version
aws --version
sam --version
```

Each command should print a version. Docker Desktop must also be running for local database work. Docker is a development dependency; the website will not depend on an employee keeping a laptop or Docker session running after AWS deployment.

Use an existing clean master checkout or clone into a new empty directory. Do not clone over an existing project folder.

```powershell
git clone https://github.com/wtsmstthb/mswg.git C:\Projects\RR
cd C:\Projects\RR
git switch master
git pull --ff-only origin master
git status
git log -1 --oneline
git switch -c codex/aws-deployment-preparation
```

If `--ff-only` reports divergence, stop and resolve the Git situation with the repository owner. Record the resulting commit. The handover inspection saw local changes to `AGM/TestRun.md` and an untracked `TestRun.md`; a new clone does not include those files unless they are separately shared or committed.

The backend packages have no lockfiles at the reviewed commit. Install them, then review and retain the generated lockfiles as part of reproducible setup. Local utility scripts also need an SDK lookup path because the repository has no root package manifest.

```powershell
npm install --prefix RISKREGISTER/backend
npm install --prefix AGM/backend
$env:NODE_PATH = 'C:\Projects\RR\RISKREGISTER\backend\node_modules'
node --test .\RISKREGISTER\tests\*.test.js `
  .\AGM\tests\*.test.js .\shared\tests\*.test.js
```

Repeat `NODE_PATH` in each terminal that runs local utilities. This is a current-checkout workaround; SAM packages each backend from its own manifest. Use `npm ci` only after valid lockfiles have been committed. At audit time the standard suite had 32 passes and one failure; chapter 4 identifies it. Use the handover book for fresh Docker setup and the local save-and-reopen checks before continuing.

<!-- pagebreak -->

## 4 Correct the deployment layout and release settings

These edits are successor tasks in the preparation branch. They were identified during handover and have not been applied by this documentation task. Have the technical reviewer inspect the changes before deployment.

### Keep the consolidated folder structure

In `shared/infrastructure/template.yaml`, change both branches of `RiskUserPoolClient.CallbackURLs` and both branches of the `CognitoRedirectUri` output to end in `/RISKREGISTER/frontend/callback.html`. Change the corresponding logout URLs and `CognitoLogoutUri` output to end in `/RISKREGISTER/frontend/login.html`.

For the custom-domain branch, the host remains `${DomainName}`. For the default branch, it remains `${FrontendDistribution.DomainName}`. Keep the surrounding `!If` and `!Sub` structure. This is an edit to the existing properties, not a second resource block.

Under `FrontendDistribution.Properties.DistributionConfig`, set:

```yaml
DefaultRootObject: shared/portal/index.html
```

Do not add a leading slash. CloudFront supports a folder path as its default root object. The S3 layout in chapter 8 must match these URLs exactly, including letter case. [S4]

### Align enabled monitoring with the agreed scope

Set `RiskApi.Properties.DefaultRouteSettings.DetailedMetricsEnabled` to `false` unless detailed route metrics are explicitly required and costed. Remove `Tracing: Active` from `Globals.Function` for the agreed service scope; X-Ray is currently enabled even though it was not in the confirmed costing table. Preserve ordinary Lambda logs and the existing alarms. Review the built template for any residual tracing permissions. [S5]

The budget filters `Application=mswg-rr`, but AGM tables are tagged `mswg-agm`. In a dedicated project account, a reviewed account-wide budget is a simple way to cover the whole bill. In a shared account, agree a common platform cost tag, apply it consistently to supported resources, activate it for billing, and test the filter. Do not remove a filter in a shared company account without understanding what it will include. [S6]

### Repair the public page test

In `RISKREGISTER/tests/frontend.static.test.js`, the public-page list omits `signup.html` and `forgot-password.html`. Review adding those two public pages to the existing exemption. Keep asset and JavaScript checks for every page. Adding a login guard to a password-reset page solely to silence the test is not the intended correction.

**Checkpoint:** the path changes appear in the template and outputs, the monitoring decision is recorded, and the standard test suite passes. A clean test run is necessary but does not replace real Cognito testing.

<!-- pagebreak -->

## 5 Complete the authentication preparation

### Fix AGM department resolution

`AGM/backend/lib/auth.js` reads department only from custom claims. The browser uses a Cognito access token, which normally carries groups but not those attributes. An assessor with `agm-app-users`, `agm-assessors`, and `rr-dept-corp-monitoring` can receive `ASSESSOR_REQUIRED`. The audit reproduced this failure. [S7]

Use the RR department resolver in `RISKREGISTER/backend/lib/auth.js` as the reference. Add equivalent validation in the AGM backend or a deliberately packaged shared module. Do not import a sibling backend path which will be absent from the AGM Lambda package. The resolver should:

1. Parse verified `cognito:groups` using the existing parser.
2. Extract known department IDs from `rr-dept-` groups.
3. Reject multiple department assignments, invalid custom department values, and a custom claim that conflicts with the group.
4. Return the valid custom department or the single group-derived department.
5. Preserve the existing assessor check requiring `corp-monitoring` and the existing reviewer permission checks.

Add meaningful backend tests for a group-only assessor, missing/wrong department, conflicting assignments, a valid reviewer, and a user without AGM access. Then repeat those cases through the deployed API using real users. API Gateway must continue validating tokens; do not accept role or department values supplied directly in a request body. [S8]

### Complete the production screen behavior

AGM pages still use `AGM_CONFIG.localRole` for parts of the displayed identity and controls. Implement production session handling and use authenticated identity plus server-returned permissions. Test reviewer controls, expired sessions, and a user with no AGM access. The portal should display only the modules available for that employee and release phase; backend checks remain authoritative.

The new account-request page is currently an information page with a registration redirect. **It does not submit a request or invite an account.** Keep administrator-created accounts enabled. Replace the unsupported direct `/signup` action with approved contact instructions or implement an approved request workflow later.

The standalone forgot-password redirect does not create the OAuth state and PKCE verifier required by `callback.html`. For the initial release, direct users through `login.html` and Cognito's own Forgot Password link. If retaining the standalone page, implement and test a complete state-preserving flow before release. Do not claim reset emails have been sent without a real response.

**Checkpoint:** define and pass real tests for invitation, sign-in, password reset, role display, denied access, and session expiry.

<!-- pagebreak -->

## 6 Connect to the company AWS account

Obtain the company account ID, IAM Identity Center start URL and region, named deployment permission set, approved application region, and business and technical reviewers. Obtain the actual finance and alarm email recipients. Keep credentials outside the handover files.

The deployment role needs CloudFormation, the confirmed services, SAM packaging-bucket access, and permission to create and pass Lambda execution roles. The older IAM request mentions CDK; this project uses SAM. Have the AWS administrator check permission boundaries against the generated role names.

Configure and sign in with your assigned profile. The Identity Center region may differ from the application region; use the value supplied by the administrator. [S9]

```powershell
aws configure sso --profile mswg-deploy
aws sso login --profile mswg-deploy
aws sts get-caller-identity --profile mswg-deploy
```

Check the returned `Account` against the company account ID and the `Arn` against your assigned role. Do not proceed on a personal learning account or an unrelated company account. If your administrator uses another temporary-role method, follow those instructions and still run the identity check.

Before deploying, open Billing and Cost Management. Confirm who can view costs and receive alerts. Check the account's Free Tier status and other workloads consuming allowances. Eligibility and credits depend on the account and plan; do not assume that a new company deployment gets a fresh allowance for each module. [S10]

Record these values in the private deployment journal:

| Item | Value to record |
| --- | --- |
| Company account and deployment profile | Account ID, profile name, role ARN |
| Application region | Approved region, initially ap-southeast-1 |
| Development stack | mswg-rr-dev |
| Production stack | mswg-rr-prod |
| Business and technical reviewers | Named staff and contact route |
| Finance and operational recipients | Approved company addresses |
| Domain decision | Default CloudFront hostname or approved MSWG hostname |

A Cognito group such as `rr-account-admins` is an application group. It does not give someone AWS Console authority to administer users. The AWS administrator must assign that authority separately.

**Checkpoint:** the successor can authenticate using a named identity, the account and region are confirmed, and someone will receive operational and budget alerts.

<!-- pagebreak -->

## 7 Validate build and deploy development

Start with development. Confirm the preparation branch has been reviewed and record its commit. From the infrastructure folder, validate and build the functions. Stop on any error and resolve it before deploying. [S1, S2]

```powershell
cd C:\Projects\RR\shared\infrastructure
sam validate --lint --template-file template.yaml `
  --region ap-southeast-1
sam build --template-file template.yaml
```

Expected results are a valid template and a successful build. The build uses the backend manifests and creates `.aws-sam/build/template.yaml`. Local tools and database files do not belong inside Lambda packages. Review the built artifacts if dependency or import errors appear.

Set the actual recipients below, then deploy the built template. This initial example uses the free CloudFront hostname, so custom domain parameters remain empty. Keep rollback enabled and changeset confirmation on.

```powershell
$budgetEmail = 'REPLACE_APPROVED_FINANCE_EMAIL'
$alarmEmail = 'REPLACE_APPROVED_TECHNICAL_EMAIL'
sam deploy --template-file .aws-sam/build/template.yaml `
  --config-file C:\Projects\RR\shared\infrastructure\samconfig.toml `
  --config-env dev --profile mswg-deploy `
  --region ap-southeast-1 --confirm-changeset `
  --parameter-overrides EnvironmentName=dev `
  BudgetAlertEmail=$budgetEmail AlarmEmail=$alarmEmail `
  MonthlyBudgetUsd=10
```

Read the changeset before accepting it. The initial stack should create the shared infrastructure and RR/AGM resources. Unexpected deletion or replacement of an existing pool, bucket, or table requires investigation. `CAPABILITY_IAM` in `samconfig.toml` acknowledges creation of execution roles; it does not grant your deployment identity extra permissions.

Open CloudFormation in the selected region. Look for `mswg-rr-dev` to reach `CREATE_COMPLETE` or `UPDATE_COMPLETE`. A failed stack or a rollback status is not a successful deployment. For a failure, inspect Events, identify the earliest failed resource, correct its cause, and retry the reviewed build.

```powershell
aws cloudformation describe-stacks --stack-name mswg-rr-dev `
  --region ap-southeast-1 --profile mswg-deploy `
  --query 'Stacks[0].Outputs' --output table
```

**Checkpoint:** the stack is complete and its outputs are recorded. This creates the infrastructure, but does not yet upload the website files, create employee accounts, or migrate local data.

<!-- pagebreak -->

## 8 Prepare the website files and configuration

Create a new release directory outside the source checkout. Copy only current frontend files. Preserve these exact paths inside that directory:

```text
web-dev/
  shared/portal/index.html
  RISKREGISTER/frontend/login.html
  RISKREGISTER/frontend/callback.html
  RISKREGISTER/frontend/dashboard.html
  RISKREGISTER/frontend/config.js
  RISKREGISTER/frontend/other current frontend assets
  AGM/frontend/records.html
  AGM/frontend/landingpage.html
  AGM/frontend/agm-config.js
  AGM/frontend/other current frontend assets
```

Exclude RR legacy folders, AGM `land2.html`, example configurations, backend files, database files, documentation, archives, tests, `.git`, and `node_modules`. Inventory asset references before finalizing the release directory; copy referenced assets at their original relative paths. Hide or label Pre-Voting as not yet released until chapter 14 is completed. Do not publish the whole repository.

Use outputs from the same stack to replace the two staged configuration files. Cognito pool/client IDs and endpoints are configuration, not passwords; never put a client secret, AWS key, or token in these browser files.

| Browser setting | Value from the stack |
| --- | --- |
| RR apiBaseUrl | ApiBaseUrl including /dev |
| AGM apiBaseUrl | ApiBaseUrl followed by /agm |
| RR cognito.userPoolId | UserPoolId |
| RR cognito.clientId | UserPoolClientId |
| RR cognito.hostedUiDomain | CognitoHostedUiDomain |
| RR cognito.redirectUri | Corrected CognitoRedirectUri |
| RR cognito.logoutUri | Corrected CognitoLogoutUri |
| Upload destination | FrontendBucketName |
| Cache invalidation target | CloudFrontDistributionId |

The RR environment value must be `dev` for this deployment, and `prod` for production. The AGM environment must also be non-local. Local mock claims, local role switching, `localhost`, and `/api` must not remain in the deployed configuration.

The API output already contains the stage. Do not append `/dev` a second time. Do not add `/api`; that prefix belongs to the local adapters. The example on the next page generates settings from outputs rather than retyping long IDs.

<!-- pagebreak -->

## 9 Generate the staged settings

Run this only after creating the staged folder structure in chapter 8. Keep this PowerShell session for the upload step. It writes configuration into the release directory, not the repository. Replace the release directory with your actual prepared location.

```powershell
$region = 'ap-southeast-1'
$profile = 'mswg-deploy'
$stackName = 'mswg-rr-dev'
$releaseDir = 'C:\Projects\MSWG-releases\web-dev'
$stackJson = aws cloudformation describe-stacks `
  --stack-name $stackName --region $region `
  --profile $profile --output json
if ($LASTEXITCODE -ne 0) { throw 'Cannot read stack outputs' }
$stack = $stackJson | ConvertFrom-Json
$out = @{}
foreach ($entry in $stack.Stacks[0].Outputs) {
  $out[$entry.OutputKey] = $entry.OutputValue
}
$required = 'ApiBaseUrl','UserPoolId','UserPoolClientId', `
  'CognitoHostedUiDomain','CognitoRedirectUri', `
  'CognitoLogoutUri','FrontendBucketName', `
  'CloudFrontDistributionId','CloudFrontDomainName'
foreach ($key in $required) {
  if (-not $out[$key]) { throw "Missing output: $key" }
}
$rr = @{
  environment = 'dev'
  apiBaseUrl = $out.ApiBaseUrl
  awsRegion = $region
  cognito = @{
    userPoolId = $out.UserPoolId
    clientId = $out.UserPoolClientId
    hostedUiDomain = $out.CognitoHostedUiDomain
    redirectUri = $out.CognitoRedirectUri
    logoutUri = $out.CognitoLogoutUri
  }
  localMockClaims = $null
}
$agm = @{
  environment = 'dev'
  apiBaseUrl = $out.ApiBaseUrl.TrimEnd('/') + '/agm'
}
$rrFile = Join-Path $releaseDir 'RISKREGISTER/frontend/config.js'
$agmFile = Join-Path $releaseDir 'AGM/frontend/agm-config.js'
$rrJson = $rr | ConvertTo-Json -Depth 5
$agmJson = $agm | ConvertTo-Json -Depth 3
Set-Content -LiteralPath $rrFile -Encoding UTF8 `
  -Value "window.APP_CONFIG = Object.freeze($rrJson);"
Set-Content -LiteralPath $agmFile -Encoding UTF8 `
  -Value "window.AGM_CONFIG = Object.freeze($agmJson);"
```

Open the generated files and compare the callback paths with chapter 4. Confirm they refer only to this development stack. This configuration does not by itself fix AGM's production identity display; chapter 5 must already be completed.

<!-- pagebreak -->

## 10 Publish through S3 and CloudFront

Use the staged frontend folder and stack outputs from chapter 9. First run a dry run and inspect every planned destination. The upload should contain frontend files only. Then run the real sync and invalidate CloudFront. [S11]

```powershell
$bucket = $out.FrontendBucketName
$distribution = $out.CloudFrontDistributionId
aws s3 sync $releaseDir "s3://$bucket" `
  --region $region --profile $profile --dryrun
```

```powershell
aws s3 sync $releaseDir "s3://$bucket" `
  --region $region --profile $profile `
  --cache-control 'no-cache'
if ($LASTEXITCODE -ne 0) { throw 'Website upload failed' }
aws cloudfront create-invalidation `
  --distribution-id $distribution --paths '/*' `
  --profile $profile
```

The initial procedure deliberately avoids an automatic deletion flag. On later releases, separately review obsolete objects and remove only approved paths. A sync without deletion leaves old objects present. Record the invalidation ID and wait for completion in CloudFront before judging a cache-related failure.

Keep S3 Block Public Access enabled. The template uses a regional S3 origin and Origin Access Control so CloudFront can read private objects. Do not enable public website hosting or make the bucket public to cure a 403. Check the requested key, bucket policy, distribution ARN, and origin configuration instead. [S12]

Open these HTTPS paths under the returned CloudFront domain:

```text
/shared/portal/index.html
/RISKREGISTER/frontend/login.html
/RISKREGISTER/frontend/dashboard.html
/AGM/frontend/records.html
```

The home URL should open the shared portal after the root-object correction. On protected pages, an unauthenticated user should receive the intended sign-in/access flow; confidential record requests must not succeed without authorization.

CloudFront delivers static files publicly unless additional controls are added. A private S3 bucket protects direct origin access; it does not make the CloudFront HTML confidential. Keep secrets and assessment data out of frontend assets and rely on authenticated APIs for records.

**Checkpoint:** the correct files load with no missing scripts or styles; no local configuration is served; authentication starts at the correct URL. A database/API failure at this point belongs to the next test stage, not to an S3 visibility fix.

<!-- pagebreak -->

## 11 Configure Cognito users and access

Open Cognito in the application region and select the pool identified by the stack output. Confirm self-registration remains disabled. Use the approved employee roster, verified department IDs, and named account administrator. Create pilot users through the console and send invitations to their own company addresses. Do not put temporary passwords in this book or a source-control commit. [S13]

Set the email and appropriate department metadata. In the user profile, assign the required groups. Each RR identity must have exactly one supported department group. A combined RR/AGM employee receives the union of approved module groups while retaining one consistent department assignment.

| Pilot role | Groups to assign after owner approval |
| --- | --- |
| RR departmental HOD | rr-app-users; rr-department-heads; one rr-dept-* group |
| RR full-visibility user | RR HOD groups plus rr-viewers-all |
| AGM assessor | agm-app-users; agm-assessors; rr-dept-corp-monitoring |
| AGM reviewer | agm-app-users; agm-reviewers; approved department group |
| Negative test user | No RR or AGM entitlement |

Current department suffixes are `ceo-office`, `corp-monitoring`, `corp-governance`, `corp-resources`, `finance-admin`, `it-training`, `creative-comms`, and `prof-development`. For example, the IT group is `rr-dept-it-training`. Set `custom:department_id` consistently where used. The AGM group-derived fix remains necessary for access-token requests.

Do not assign `rr-viewers-all` simply to make a test pass; it also grants archive authority in the current RR backend. Do not combine assessor and reviewer privileges by default. Confirm any broader role policy with the business owner.

Open the deployed `login.html`. Continue to Cognito, accept the invitation using the provided temporary credential, and set a permanent password. The current template requires at least 12 characters, uppercase and lowercase letters, a number, and a symbol. Temporary passwords are configured for seven days; the administrator can reissue an expired invitation.

Test the approved recovery route through Cognito's sign-in page. Confirm the code is received at the intended account email, a new password works, and invalid or expired codes fail cleanly. Test logout, then sign in again with a different pilot account in a separate browser profile.

**Checkpoint:** at least one RR user, one AGM assessor, one reviewer, and one unentitled account have been tested. A department entered in a form is not a substitute for a verified account assignment.

<!-- pagebreak -->

## 12 Prove that development works

Use fictional test records. Log the user, action, expected and actual result, record ID, evidence reference, commit, and stack. Exclude tokens and personal records from the evidence log.

### Risk Register acceptance sequence

1. Sign in as an approved departmental user and create a risk. Confirm quarter is current and locked, and risk-element choices allow the intended custom entry.
2. Reload and reopen the record. Edit it as the creator and confirm the history records the change.
3. Sign in as another user from the same department. Verify the agreed view access and that creator-only editing is enforced by the backend.
4. Sign in from another department. Confirm restricted department records cannot be obtained by altering the URL or request.
5. Sign in as the approved full-visibility user. Confirm organization view and archive behavior, with retrievable audit history.

### AGM acceptance sequence

1. As assessor, create a draft, save it, close the tab, and reopen it from `records.html`.
2. Complete all required answers and reasons. Submit for review; confirm editing locks.
3. As reviewer, return it with a reason. As the original assessor, correct, save, and resubmit.
4. As reviewer, approve. Confirm approved status, a stored approved snapshot, report regeneration, and history entries.
5. Reopen with a reason. Confirm a new revision and preservation of the previously approved report.

### Authentication and operational acceptance

- An unauthenticated API request receives 401. A signed-in user without the required entitlement receives 403. Test backend responses as well as visible buttons.
- Concurrent edits produce an explicit conflict instead of silently overwriting newer work.
- Expired sessions have a clear sign-in path. The current code does not establish an automatic token-refresh workflow.
- CloudWatch shows the expected function activity without exposed passwords or tokens. SNS subscription is confirmed and a controlled test notification arrives.
- The saved cloud data remains accessible after the developer's local servers and laptop are off.

Unit and local tests do not prove deployed permissions, identity, notification delivery, or billing. Keep evidence from this AWS development stack.

**Checkpoint:** business and technical reviewers accept the workflows, permissions, and operations. Record unresolved issues; do not substitute demonstration data for a failed API result.

<!-- pagebreak -->

## 13 Check monitoring costs and recovery

Confirm the SNS email subscription rather than assuming creation means delivery. In CloudWatch, inspect the API alarm, the Lambda error alarm, and log retention. Current retention is 30 days in development and 90 in production. The Lambda alarm covers eight mutating functions; read-function coverage is not comprehensive.

Two alarm resources are not necessarily two billable metrics. This template's metric-math Lambda alarm uses eight underlying metrics and the API alarm uses one. Check current regional prices and account-wide free allowances. Detailed API metrics, if enabled, add another cost category. [S5, S14]

The earlier model assumed 10,800 API calls monthly: RR 4,800; Pre-Voting 3,000; AGM 3,000. Its total of USD 0.071734101 monthly and USD 0.860809217 annually is a historical planning calculation, **not a verified hosting bill**. It mixes regional assumptions and does not represent the complete currently enabled infrastructure.

Reconcile before financial sign-off: Lambda invocations and duration; DynamoDB transactional writes and item sizes; all four tables; production point-in-time recovery; S3 requests, deployment artifacts and noncurrent versions; CloudFront usage and pricing plan; logs, alarm metrics and optional tracing. One API call can cause more than one database write. Free allowances are shared with other account workloads and must be verified. [S10, S14, S15]

Use the previously discussed USD 5 monthly planning allowance and USD 10 alert threshold only as provisional management guardrails. They are not validated ceilings. The template's budget warns at 80 percent forecast and above 100 percent actual; it does not stop services or cap charges. Ensure the filter includes all project resources and check Billing after the first deployment and regularly during the first week. [S6, S16]

Production tables enable DynamoDB point-in-time recovery. Rehearse restoring a development test table to a new table, inspect its content, and document how configuration and IAM would be updated to use it. Restoration does not automatically move the application to the recovered table, and settings such as PITR, tags, and permissions need review. [S17]

S3 versioning can recover an earlier frontend object, but a working release needs a consistent set of HTML, scripts, and configuration. Keep a dated release directory and its matching commit. Database recovery and application rollback are separate operations.

**Checkpoint:** alert recipients confirm delivery, finance understands the cost basis, and a recovery rehearsal has a recorded result and owner.

<!-- pagebreak -->

## 14 Bring Pre Voting into the same architecture

This is a development work package, not a command that can be run against the current SAM stack. Its size is provisionally 30 to 60 focused hours after the RR/AGM foundation, and may exceed that if extraction must be redesigned.

The current backend is FastAPI and SQLAlchemy writing SQLite in `PRE-VOTING/testing/mswg_test.db`. The frontend calls `http://127.0.0.1:8000`. Submit and history are implemented locally, but Save Draft only displays a message, history can silently fall back to mock rows, and backend routes have no Cognito authorization. The Playwright extractor launches a visible browser and can wait much longer than the template's ten-second Lambda timeout.

### Implement the migration in this order

1. Confirm the business requirements for saved drafts, submission changes, review, evidence attachments, retention, and visibility. Identify the owner of each record and acceptable extraction waiting time.
2. Replace hardcoded local API URLs with environment configuration. Remove production mock-history fallback so failures are visible and distinguishable from saved data.
3. Define Pre-Voting DynamoDB records and history keys, version fields, ownership fields, and access rules. Migrate database access into a repository layer with tests.
4. Implement Cognito group checks and employee identity validation through API Gateway. Add a module entitlement and explicit backend authorization for every endpoint.
5. Package the API operations for Lambda, either as deliberate Python handlers or another reviewed implementation. Add its functions, tables, routes, permissions, logs, outputs, and alarms to the same SAM deployment pattern.
6. Prove the extraction component can run headlessly in Lambda with a repeatable package and acceptable timing. Browser binaries and native dependencies cannot be copied blindly from a Windows environment. If it cannot finish within the chosen request limits, escalate a design decision before introducing extra queue, workflow, or compute services.
7. Implement real draft persistence and version/history rules. Add tests for submit, reload, correct ownership, denied access, extraction failure, and no fake fallback records.
8. Migrate only approved real data through a reviewed import with record-count checks and rollback. Local SQLite files do not transfer automatically.
9. Run the development acceptance sequence, review updated costs, and only then enable the production portal link.

Keep the confirmed service set as the target. Do not add RDS, an always-running EC2 server, or a new paid service merely to make the local prototype run unchanged. If requirements require a different design, make that cost and scope decision visible to MSWG.

<!-- pagebreak -->

## 15 Release production and record the result

Use the same reviewed code as the accepted development release. Rebuild from that commit and review the production changeset. Keep the same approved region and actual email recipients. Recheck account identity immediately before applying changes. From `shared/infrastructure`, after `sam build` succeeds, use the following for the default CloudFront hostname. [S1]

```powershell
sam deploy --template-file .aws-sam/build/template.yaml `
  --config-file C:\Projects\RR\shared\infrastructure\samconfig.toml `
  --config-env prod --profile mswg-deploy `
  --region ap-southeast-1 --confirm-changeset `
  --parameter-overrides EnvironmentName=prod `
  BudgetAlertEmail=$budgetEmail AlarmEmail=$alarmEmail `
  MonthlyBudgetUsd=10
```

Generate a separate `web-prod` directory using only production stack outputs. In chapter 9 change the stack name, both environment values to `prod`, and the release directory. Upload only to the production bucket. A production page must never call a development API or use its Cognito pool.

Production starts with separate users and empty tables unless an approved import is performed. Local records and accounts do not transfer automatically. Record the production login and portal URLs.

If using an MSWG hostname, obtain an issued ACM certificate in `us-east-1`, supply `DomainName` and `CloudFrontCertificateArn` during deployment, and ask the existing DNS owner to point the hostname to CloudFront. Update both callback/logout URLs and generated configuration together. Retest login, logout, and reset on that exact hostname. Route 53 is not mandatory if DNS is already managed elsewhere. [S3]

Release to an approved pilot group. Retest save/reload and review in production with designated records. Agree how to handle those records through supported application actions.

### If the release fails

For a frontend fault, restore the previous release folder and invalidate CloudFront. For a backend fault, review the previous known-good commit for data compatibility, then redeploy through SAM. Keep the production settings. Do not delete the stack as routine recovery.

The template retains tables, buckets, and logs and protects production tables from deletion. A stack deletion can leave resources and costs behind. Teardown requires an exact inventory, backup decision, and owner approval.

### Complete the release journal

Record: commit and reviewer; account/region; stack status; deployment date; CloudFront domain and distribution; frontend bucket; API base; Cognito pool/client; four table names; alert recipients; budget scope; test evidence; backup/restore result; previous release location; known issues; next maintenance owner.

**Checkpoint:** the successor can operate and recover the live system independently, with account and data ownership recorded.

<!-- pagebreak -->

## 16 Troubleshooting by symptom

### The page says it cannot reach a local server

An AWS page calling `localhost`, `/api`, or a local port has incorrect configuration. Generate settings from its stack outputs, upload, invalidate, and reload. Local RR and AGM use ports 3200 and 3100 respectively.

### Cognito rejects the callback or token exchange

Compare the HTTPS hostname and exact callback path in the client, outputs, and frontend config. Start again from `login.html` to create state and PKCE values. Do not open the callback directly or reuse an authorization code.

### Sign in works but AGM returns 403

Check AGM groups, the chapter 5 department resolver, the backend error code, and the account used. Do not grant reviewer or full-visibility access to work around a department-assignment failure.

### S3 or CloudFront returns Access Denied

Confirm the object exists at the exact requested key. Check the default root, distribution origin, OAC, and bucket policy. Keep the bucket private. A missing file may also appear as 403 with a private S3 origin.

### Lambda reports a missing module or configuration

Review `CodeUri`, handler name, backend package manifest, built package, and table-name environment variables. Rebuild before redeploying. AWS credentials are supplied through execution roles; the cloud function must not be configured with the local DynamoDB endpoint.

### A saved record disappears after reopening

Check the request actually succeeded, then compare the user, environment, region, and table. A local record is not an AWS record. Pre-Voting mock-history fallback is not persistence evidence. Use actual record IDs and history to trace the operation.

### The deployment is denied or rolled back

Check `aws sts get-caller-identity`, SSO expiry, and the earliest failed CloudFormation event. Ask the AWS administrator for the specific missing action/resource permission. Avoid replacing the role with unrestricted administrator access as the default response.

### Costs or alarm emails look wrong

Verify SNS confirmation, recipient addresses, cost-tag activation/filter scope, other workloads, and delayed billing data. Review retained resources, versioned objects, detailed metrics and backups. A budget warning is not a charge cap.

When escalating, share the timestamp, region, stack, commit, error code, failed action and a redacted log excerpt. Do not share passwords, session tokens, or complete assessment records in ordinary chat.

<!-- pagebreak -->

## 17 References and evidence

The following official AWS references were checked on 10 September 2026. Console labels can change; identify the resource and setting described in the procedure rather than relying solely on a screen position. The executable examples are adapted for this repository and were not run against AWS during preparation.

- [S1 AWS SAM deploy command](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-deploy.html)
- [S2 Install the AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- [S3 CloudFront certificate requirements](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html)
- [S4 CloudFront default root object](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DefaultRootObject.html)
- [S5 API Gateway HTTP API metrics](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-metrics.html)
- [S6 Activate user defined cost allocation tags](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/activating-tags.html)
- [S7 Cognito access token claims](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-access-token.html)
- [S8 HTTP API JWT authorizers](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html)
- [S9 AWS CLI Identity Center setup](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html)
- [S10 AWS Free Tier FAQs](https://aws.amazon.com/free/free-tier-faqs/)
- [S11 AWS CLI S3 sync](https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html)
- [S12 CloudFront access to a private S3 origin](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)
- [S13 Cognito administrator created accounts](https://docs.aws.amazon.com/cognito/latest/developerguide/how-to-create-user-accounts.html)
- [S14 CloudWatch pricing](https://aws.amazon.com/cloudwatch/pricing/)
- [S15 DynamoDB on demand pricing](https://aws.amazon.com/dynamodb/pricing/on-demand/)
- [S16 Managing costs with AWS Budgets](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html)
- [S17 DynamoDB point in time restore tutorial](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/PointInTimeRecovery.Tutorial.html)

Primary repository evidence: `shared/infrastructure/template.yaml`; `samconfig.toml`; RR `login.html`, `callback.html`, `config.js`, `config.prod.example.js`, API client and backend auth; AGM configuration, API client, persistence/records UI and backend auth; Pre-Voting API, database, extractor, form and history scripts; current test suite.

The older consolidated brief's statement that the infrastructure template was reduced to one line is obsolete. The reviewed template is restored. The current identified test failure is the new public authentication-page classification. Prefer the reviewed code and this dated evidence over stale status paragraphs.

No live cloud account inventory, SAM build, deployed authentication test, DNS change, data migration, or cost measurement was performed in writing this book. Those results belong in the successor's deployment journal.
