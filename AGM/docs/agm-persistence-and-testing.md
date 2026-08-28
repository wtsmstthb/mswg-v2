# Conduct of AGM Persistence and Database Testing

**Implemented:** 28 August 2026

## Implemented workflow

1. A Corporate Monitoring assessor creates and saves a draft.
2. Only the original assessor may edit that draft.
3. Submission validates all required meeting details and scored answers, then locks assessor editing.
4. An HOD reviewer may approve the submission or return it with a required reason.
5. Approval locks the record and stores an approved report snapshot.
6. An HOD may reopen an approved assessment only with a reason. Reopening preserves the approved snapshot, increments the revision, and returns the new revision to the original assessor.
7. Every create, save, submit, return, approve, and reopen event writes an immutable history snapshot.

The approved report can be regenerated from the stored approved snapshot if the downloaded PDF is lost. The system does not currently store the PDF binary in S3.

## DynamoDB tables

### `mswg-agm-local-assessments`

- Partition key: `assessment_id`
- Stores the current fields, answers, comments, calculated score, workflow status, revision, record version, creator, submitter, reviewer, timestamps, and latest approved snapshot
- Uses `record_version` for optimistic concurrency so one browser cannot silently overwrite a newer save

### `mswg-agm-local-history`

- Partition key: `assessment_id`
- Sort key: `event_at`
- Stores the event type, actor, status, revision, comment/reason, and record snapshot
- No application operation deletes history

Production table names follow `mswg-agm-<environment>-assessments` and `mswg-agm-<environment>-history`.

## Files

Backend:

- `AGM/backend` — eight Lambda handlers and shared authorization, validation, scoring, workflow, and repository modules

Frontend:

- `AGM/frontend/records.html` — retrievable assessment list and review queue
- `AGM/frontend/landingpage.html` — persistent form and workflow actions
- `AGM/frontend/assessment-persistence.js` — save, load, submit, review, reopen, and locking behaviour
- `AGM/frontend/agm-api-client.js` — local/production API client

Local tools:

- `AGM/tools/setup-agm-local-dynamodb.js` — create or verify both tables
- `AGM/tools/test-agm-local-dynamodb.js` — automated real-database lifecycle
- `AGM/tools/inspect-agm-local-dynamodb.js` — read-only database inspection
- `AGM/tools/serve-agm-local.js` — local frontend and API server

## User-run database test

Perform these steps yourself from PowerShell.

### 1. Open the project

```powershell
cd C:\Projects\RR
```

### 2. Start DynamoDB Local

```powershell
docker start rr-dynamodb
```

If Docker reports that it is already running, continue.

Confirm it:

```powershell
docker ps --filter "name=rr-dynamodb"
```

The result must show `Up` and port `8000`.

### 3. Create or verify the AGM tables

```powershell
node AGM\tools\setup-agm-local-dynamodb.js
```

Expected table definitions:

```text
mswg-agm-local-assessments | ACTIVE | assessment_id:HASH
mswg-agm-local-history | ACTIVE | assessment_id:HASH, event_at:RANGE
```

The setup script never deletes or replaces an existing table.

### 4. Run the backend/database integration test

```powershell
node AGM\tools\test-agm-local-dynamodb.js
```

It should finish with:

```text
SUCCESS real AGM DynamoDB workflow at http://localhost:8000
```

This proves the handler/repository/database path. It deliberately creates a clearly labelled local test record.

### 5. Start the local application

```powershell
node AGM\tools\serve-agm-local.js
```

Keep this PowerShell window open. Open:

```text
http://localhost:3100/AGM/frontend/records.html
```

Do not open the HTML file directly from Windows Explorer. The local server supplies the API routes.

### 6. Test as Corporate Monitoring

1. Select **View as Corporate Monitoring**.
2. Click **New assessment**.
3. Enter a distinctive company name such as `DB Test Berhad`.
4. Complete the required meeting details.
5. Answer every scored question.
6. Add a reason for every No or zero-point answer.
7. Click **Save draft**.
8. Note the record ID shown below the page heading.
9. Close the browser tab.
10. Reopen the records URL and confirm that `DB Test Berhad` is still listed.

That browser-close/reopen check proves that the data came back from DynamoDB rather than browser memory.

### 7. Test submission and HOD review

1. Open the saved record as Corporate Monitoring.
2. Go to Section J and click **Submit for review**.
3. Confirm that the status becomes **Pending HOD review** and the inputs lock.
4. Change the local role selector to **View as HOD reviewer**.
5. Confirm that **Approve assessment** and **Return for correction** appear.
6. Test Return first and enter a reason.
7. Switch back to Corporate Monitoring, correct the record, save, and resubmit.
8. Switch to HOD and approve it.
9. Confirm the status becomes **Approved** and the form remains locked.
10. Open **PDF preview** and confirm the assessor, approver, approval date, company, and score.

### 8. Test history and reopening

1. Return to **Assessments**.
2. Click **History** for the test company.
3. Confirm that Created, Saved, Submitted, Returned, resubmitted, and Approved events appear in order.
4. Open the approved assessment as HOD.
5. Click **Reopen revision** and enter a reason.
6. Confirm that the revision number increases and the status becomes Returned.
7. From the records page, click **Approved report** and confirm that the previously approved snapshot still opens.

### 9. Inspect DynamoDB directly

List all stored assessments:

```powershell
node AGM\tools\inspect-agm-local-dynamodb.js
```

Copy one assessment ID from that table, then inspect its complete record and history:

```powershell
node AGM\tools\inspect-agm-local-dynamodb.js YOUR-ASSESSMENT-ID
```

Replace `YOUR-ASSESSMENT-ID` with the real ID shown by the first command.

### 10. Stop only the local application

In the PowerShell window running the local server, press:

```text
Ctrl+C
```

Optionally stop the database:

```powershell
docker stop rr-dynamodb
```

Stopping the container does not delete its mounted data.

## What local testing does not prove

Local testing does not prove Cognito, API Gateway JWT verification, deployed Lambda packaging/IAM, CloudWatch, or AWS billing. Those require a later isolated AWS development deployment and acceptance test.
