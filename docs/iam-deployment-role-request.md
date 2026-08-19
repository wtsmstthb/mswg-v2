# IAM Deployment-Role Request — MSWG Risk Register

Please provide the project developer with a temporary, auditable deployment role for the MSWG RR application in the company-owned AWS account.

## Preferred access method

Use AWS IAM Identity Center with an individually assigned permission set. If Identity Center is not available, use an assumable IAM role with MFA and a short session duration. Do not create long-lived IAM user access keys.

Suggested role name: `MSWGRRDeploymentRole`  
Suggested session duration: one hour  
Scope: deployment and maintenance of resources tagged `Application=mswg-rr` in `ap-southeast-1`, plus the global permissions required for CloudFront and IAM role creation.

## Required AWS services

- AWS CloudFormation, because CDK deploys CloudFormation stacks
- Amazon Cognito User Pools
- Amazon DynamoDB
- AWS Lambda
- Amazon API Gateway HTTP APIs and JWT authorizers
- AWS IAM, limited to creating and passing the application Lambda execution roles and deployment-related service roles
- Amazon S3
- Amazon CloudFront
- AWS Certificate Manager in `us-east-1` if CloudFront terminates TLS for `risk.mswg.org.my`
- Amazon Route 53 only if DNS will be managed in the MSWG AWS account
- Amazon CloudWatch Logs, metrics, alarms, and dashboards
- Amazon SNS for alarm notifications
- AWS Budgets for cost alerts
- AWS Systems Manager Parameter Store or CloudFormation outputs if environment configuration needs centralized storage
- AWS CloudTrail read access for deployment audit and troubleshooting

## Permission boundaries

The role should be able to:

- Bootstrap and deploy the approved CDK application stacks
- Create, update, describe, tag, and delete only the application resources required by those stacks
- Create and pass only Lambda/service roles whose names begin with `mswg-rr-`
- Read CloudFormation events, CloudWatch logs, and CloudTrail events needed for troubleshooting
- Invalidate the application CloudFront distribution after a frontend release

The role should not be able to:

- Change root-account settings, payment methods, or support plans
- Manage unrelated company workloads
- Create unrestricted administrator roles or users
- Create long-lived access keys
- Disable CloudTrail or organization-wide security controls
- Delete production data outside an approved CloudFormation change

## Administrative ownership

- Root-account credentials, billing, MFA recovery, and break-glass access remain with MSWG.
- Routine Cognito user administration belongs to an appointed MSWG account administrator, not the deployment role.
- Production deployments should be approved by the named business and technical owners and recorded through CloudFormation changes and CloudTrail.

## Account administrator action requested

1. Confirm the MSWG account ID and preferred identity-access method.
2. Create the temporary role/permission set with MFA and a one-hour session.
3. Assign the developer's named identity—never a shared login.
4. Apply an application tag and, where practical, a permission boundary restricting created roles to `mswg-rr-*`.
5. Provide the sign-in/role-assumption instructions and expiry date.
6. Revoke the deployment assignment after handover or the agreed implementation window.

