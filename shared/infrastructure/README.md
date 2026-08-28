# MSWG Internal Platforms Infrastructure

`template.yaml` is an AWS SAM/CloudFormation definition for the `dev` and `prod` environments. It currently creates the shared Cognito foundation, RR and AGM groups, four DynamoDB tables, six RR Lambdas, eight AGM workflow Lambdas, generated least-privilege execution roles, an authenticated HTTP API, private S3/CloudFront hosting, retained logs, alarms, and an optional monthly budget notification.

## Before the first deployment

1. Obtain the company-owned AWS account and temporary deployment role described in `../docs/iam-deployment-role-request.md`.
2. Install or provide AWS SAM CLI in the approved workstation environment.
3. Confirm budget/alarm recipients, owners, domain/DNS handling, log retention, and backup requirements.
4. Supply an ACM certificate from `us-east-1` only if an existing MSWG custom domain will be attached to CloudFront. Route 53 is not required.

## Validate and build

```powershell
cd C:\Projects\RR\shared\infrastructure
sam validate --lint --template-file template.yaml
sam build --template-file template.yaml
```

## Deploy development

```powershell
sam deploy --config-env dev `
  --parameter-overrides `
    EnvironmentName=dev `
    BudgetAlertEmail=finance@example.invalid `
    AlarmEmail=technical-owner@example.invalid
```

Replace the example recipients with approved company addresses. Do not deploy with example addresses.

After deployment, copy the stack outputs into environment-specific frontend configuration, upload the portal and implemented application frontends to the private bucket, and invalidate the CloudFront distribution.

Production uses `--config-env prod` and should be deployed only after the dev acceptance checklist passes and the change set is approved.
