# Hardcoded data, access and retired-file review

Reviewed against the current `C:\Projects\RR` checkout on 10 September 2026. This note supersedes older instructions that use local role selectors, fake identities, or unauthenticated local APIs. Existing handover PDFs describe the earlier snapshot and need this addendum.

## The four categories

| Category | Finding and action |
| --- | --- |
| Fake records and identities | Removed both invented Pre-Voting history submissions and the fallback that displayed them on API failure. Removed the hardcoded AGM person, Pre-Voting analyst identity, and RR/AGM impersonated staff accounts. Failed history requests now show an error and unavailable count. RR and AGM active forms already start with empty record data. |
| Fake login/access | Removed RR localStorage mock claims, all role selectors, query-string role selection, `x-local-role` authentication, and synthetic server claims. RR/AGM local servers now verify Cognito access-token signatures, issuer, client, expiry and token type. Pre-Voting previously had no API authentication: all its routes now require a verified access token and membership in an explicitly configured group. Missing configuration denies access. Browser checks support the interface; server verification remains the security boundary. |
| Local-only settings | Preserved and listed below. They are development configuration, not evidence of a signed-in identity. |
| Fixed business wording | Preserved department IDs/names, risk ratings, dropdown/reuse choices, quarters, AGM questions, weights, workflow statuses and vote choices. The named department-head directory in RR's sidebar/profile is actively referenced business information, not a login rule; retained for the owner to maintain. |

RR's sidebar and both AGM sidebars now link to `../../PRE-VOTING/frontend/index.html`. The local RR/AGM web servers serve only public frontend assets, preventing direct downloads of databases, backend code, archives and tests.

## Settings to replace or confirm before hosting

| Location | Retained setting | Deployment action |
| --- | --- | --- |
| `RISKREGISTER/frontend/config.js` | `environment: local`, `/api`, region `ap-southeast-1`, blank Cognito settings | Supply the real API URL and pool/client/domain/callback/logout values from the chosen stack. |
| `AGM/frontend/agm-config.js` | `environment: local`, `/api/agm` | Supply the actual AGM API base URL. Login configuration is shared with RR. |
| `PRE-VOTING/frontend/config.js` | `http://127.0.0.1:8000` | This was moved out of the form/history logic without deleting it. Replace with the deployed Pre-Voting API origin. |
| `RISKREGISTER/tools/dynamodb-local.js` | DynamoDB on localhost:8000, `mswg-rr-local-risks`, `mswg-rr-local-history`, local development credentials | Keep for DynamoDB Local only. Cloud Lambdas use environment-configured tables and IAM execution roles. |
| `AGM/tools/agm-dynamodb-local.js` | Local endpoint, `mswg-agm-local-assessments` and `mswg-agm-local-history` | Keep for local testing; production needs real stack outputs. |
| RR/AGM local server scripts | Loopback binding; ports 3200/3100 | Keep for local development. These are not production hosting servers. |
| `PRE-VOTING/backend/database.py` | SQLite under `PRE-VOTING/testing/mswg_test.db` | Retained existing data. Review migration/storage before cloud hosting; do not deploy the database as a frontend asset. |
| `PRE-VOTING/backend/api.py` | Local CORS origins | Replace/add the approved HTTPS frontend origin before hosting. Different local ports are different origins, including for token storage. |
| `shared/infrastructure/samconfig.toml` | Dev/prod stack names and Singapore region | Confirm the account, region and environment; names are configuration, not demo records. |

The Pre-Voting default port 8000 conflicts with the documented DynamoDB Local port. Resolve that locally by choosing another Pre-Voting API port and updating its config. Navigating to another module through a local server does not automatically provide that module's API routes: use the correct module server or configure a shared origin/proxy. The sidebar path itself is valid.

## Real sign-in setup

1. Install local Node authentication dependencies from the repo root: `npm ci --prefix shared/auth`. Keep installing RR/AGM backend dependencies as documented.
2. Set `COGNITO_USER_POOL_ID` and `COGNITO_CLIENT_ID` in each local API server's environment. These are public identifiers; do not supply a client secret for the browser app.
3. Fill the Cognito settings in RR's frontend configuration and register the exact login callback/logout URLs in Cognito. All three interfaces read the shared browser session helper at `shared/auth/session.js`; include that file when staging frontend assets for S3.
4. Assign actual RR and AGM group memberships, including the department group. AGM now supports the department group in Cognito access tokens and rejects conflicting department assignments.
5. For Pre-Voting, install `python -m pip install -r PRE-VOTING/backend/requirements.txt`. Set the same Cognito pool/client plus `PREVOTING_REQUIRED_GROUP` to the company-approved Cognito group name. Until it is set and membership assigned, Pre-Voting denies data access. No permissive default group is assumed.
6. Start/restart the local servers and sign in. Old cached role choices no longer grant access. A company administrator must still configure Cognito; this change does not provision AWS resources or create accounts.

Pre-Voting's configured group currently grants access to the shared submission collection. Per-author or per-department record isolation is not implemented and must be decided before production. Its draft button still reports that database saving is not connected; this review does not claim it saves drafts.

## Retired files: evidence checked before removal

Searched active HTML links, JavaScript imports/references, Python imports, package scripts, tests and infrastructure for paths and filenames. The matches below were internal to the retired copies or historical documentation, not active runtime dependencies. Current README/index references were updated. Historical briefs remain historical records.

| Removed target | Evidence |
| --- | --- |
| `RISKREGISTER/frontend/legacy/frontend-HOD/` (8 files) | Superseded by the consolidated frontend. Its HTML links/scripts stay within the old copy; no active page, test, import or deployment path targets it. Contains fixed fake identity and browser-seeded data. |
| `RISKREGISTER/frontend/legacy/frontend-SUPER/` (10 files) | Same evidence; old fixed-privilege copy replaced by the consolidated app. |
| `RISKREGISTER/legacy/database-check/` (5 files) | Explicitly retired manual checker, not imported or invoked by active tests/build scripts; current setup/lifecycle checks are in `RISKREGISTER/tools/`. |
| `AGM/frontend/land2.html` | Standalone pre-Horizon prototype. No active HTML, code or test links to it; documentation describes it as a comparison copy. |
| `AGM/archive/agm-conduct.zip` | Retired packaged prototype; no code, build or active page opens it. |
| `sd` | Plain saved Git log, not executable application code; no active references. |
| `VOTING/` | Empty local directory; contains no application or files and has no active references. |

The 26 tracked files are recoverable from Git. No database records, current test scripts, design-source ZIPs/licences, board wireframes, historical briefs or handover books were deleted. An unlinked manual test or document is not automatically dead code.

## Verification

Run `node --test RISKREGISTER/tests/*.test.js AGM/tests/*.test.js shared/tests/*.test.js` after installing dependencies. For Python tests, install `httpx` in the test environment and run `python -m unittest discover -s PRE-VOTING/testing -p test_auth.py -v`.

Checks cover valid and forged signatures, expired/wrong-issuer/wrong-client tokens, anonymous requests to all Pre-Voting routes, missing group assignments, old mock storage, history API failure, department conflicts, protected static paths and active page links. Python API tests use an isolated in-memory database. Live Cognito sign-in and AWS deployment remain untested because no real pool/client configuration is supplied.

Implementation references: [AWS Cognito JWT verification](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html), [AWS verifier](https://github.com/awslabs/aws-jwt-verify), [PyJWT verification](https://pyjwt.readthedocs.io/en/latest/usage.html). The Python dependency requires the patched PyJWT 2.13 series or later within major version 2.
