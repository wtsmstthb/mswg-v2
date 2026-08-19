# Local Readiness Status

**Updated:** 13 August 2026

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
- Consolidated `Frontend/risk-register` with claim-driven navigation and page/action visibility
- Cognito managed-login authorization-code flow with PKCE, callback exchange, and hosted sign-out
- Environment-driven API client
- SAM/CloudFormation definitions for Cognito, groups, DynamoDB, Lambda, generated execution roles, HTTP API/JWT authorizer, private S3/CloudFront, CloudWatch, SNS, retained logs, and conditional Budgets alerts
- IAM deployment-role request
- Finance/MSWG acceptance checklist
- Automated backend, configuration, and frontend permission/static tests

## Verified

- `npm test`: 16 tests passed
- Node syntax check: 23 Lambda/frontend JavaScript files passed at the time of the last check
- Workbook: formulas inspected with no formula-error matches and all three sheets visually reviewed

## Pending without AWS

- Install AWS SAM CLI, then run `sam validate --lint` and `sam build`
- Complete live browser testing when the desktop browser-control runtime is available
- Replace page-level localStorage operations with calls through `api-client.js`
- Add frontend creator-only edit controls and production error/loading/session-expiry handling
- Generate final environment `config.js` from stack outputs
- Run DynamoDB Local integration tests against the refactored repository if desired

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
- Connect localStorage page operations to authenticated API endpoints
- Configure DNS/certificate if the custom domain is approved
- Confirm alarms and Budgets subscriptions
- Run the acceptance checklist in `dev`, remediate findings, then deploy `prod`
