# Local Readiness Status

**Updated:** 1 September 2026

## Completed

- Access-control matrix covering departments, heads, three full-visibility users, CRUD/archive rights, no-restore decision, account administration, and deployment-role separation
- Password-free 26-person user-account workbook with verified-field placeholders, validation lists, account status, and RR roles
- Backend identity derived exclusively from verified API Gateway/Cognito authorizer claims
- Request-level `dept_id`, `created_by`, `requested_by`, and archive identity cannot impersonate a user
- Environment-based DynamoDB endpoints, table names, regions, API URL, and Cognito identifiers
- Validation of required fields and the four permitted risk ratings
- Creator-only update and transactional audit history for every successful update
- Archived-risk exclusion from normal reads
- Privileged cross-department read and archive permissions
- Consolidated `RISKREGISTER/frontend` with claim-driven navigation and page/action visibility
- Cognito managed-login authorization-code flow with PKCE, callback exchange, and hosted sign-out
- Environment-driven API client
- SAM/CloudFormation definitions for Cognito, groups, DynamoDB, Lambda, generated execution roles, HTTP API/JWT authorizer, private S3/CloudFront, CloudWatch, SNS, retained logs, and conditional Budgets alerts
- IAM deployment-role request
- Finance/MSWG acceptance checklist
- Automated backend, configuration, and frontend permission/static tests
- Persistent `rr-dynamodb` Docker container with current RR risk/history tables
- Repeatable local table setup and real handler/repository/DynamoDB lifecycle test
- AGM assessment and immutable-history DynamoDB tables
- AGM create/save/submit/return/approve/reopen backend with server-side scoring and optimistic concurrency
- AGM assessment-record list, audit-history drawer, workflow locking, and approved-report regeneration
- Local AGM frontend/API server and repeatable real-DynamoDB integration/inspection tools
- Local RR frontend/API server using the same six handlers as the AWS route definitions
- RR browser create, reload persistence, creator-only edit, calculated ratings, real audit history, organisation view, and privileged soft archive
- Optimistic RR record versions and transactional archive-history entries

## Verified

- `node --test .\RISKREGISTER\tests\*.test.js`: 20 Risk Register tests passed after browser persistence integration
- `node RISKREGISTER\tools\test-local-dynamodb.js`: complete form create, scoped reads, authorization denial, versioned transactional update/history, transactional archive/history, and filtering passed
- `node AGM\tools\test-agm-local-dynamodb.js`: draft, retrieval, version-safe save, submission lock, HOD approval, report snapshot, reopen, and history passed
- Live local browser workflow verified save, submit, HOD approval, PDF regeneration, reopen, records retrieval, and history
- Live local RR browser workflow verified create, reload persistence, edit/rating recalculation, audit history, archive, and HOD scoping
- Docker restart retained both current tables and the risk/history test records
- Node syntax check: Lambda/frontend and local-DynamoDB utility JavaScript passed at the time of the last check
- Workbook: formulas inspected with no formula-error matches and all three sheets visually reviewed

## Pending without AWS

- Install AWS SAM CLI, then run `sam validate --lint` and `sam build`
- Generate final environment `config.js` from stack outputs

## Pending MSWG decisions/data

- Confirm that RR entitlement is department heads plus the three full-visibility users
- Resolve the 26-versus-28 roster difference
- Supply verified company email addresses
- Confirm Dr Ismet Yusoff as business owner
- Confirm Lini Hazlinda as account administrator and Dr Ismet as approval/backup contact
- Name the permanent technical owner
- Supply Finance, owner, and technical budget-alert email addresses
- Approve 30-day development and 90-day production log retention
- Approve indefinite risk/history retention, production PITR, and whether longer-term AWS Backup is required
- Confirm DNS and ACM responsibility for `risk.mswg.org.my`

## Pending with AWS access

- Deploy the `dev` stack through the temporary deployment role
- Provision approved Cognito users and groups from the workbook
- Upload the consolidated frontend and populate its environment configuration
- Replace the local API URL and role adapter with the deployed API URL and Cognito tokens
- Configure DNS/certificate if the custom domain is approved
- Confirm alarms and Budgets subscriptions
- Run the acceptance checklist in `dev`, remediate findings, then deploy `prod`
