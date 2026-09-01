# MSWG RR Access-Control Matrix

**Status:** Local-development baseline, pending MSWG business-owner approval  
**Decision date:** 13 August 2026

## Access-policy decisions

- RR application access is limited to department heads and the three full-visibility users.
- A full-visibility user also retains their home-department membership.
- Department identity and permissions come only from verified Cognito claims. Request bodies cannot select a department, creator, updater, or archiver.
- All updates are creator-only and generate an audit-history entry, including non-rating changes.
- Archiving is a soft delete and is restricted to full-visibility users.
- Archived risks are hidden from normal department and organization views.
- Restore is deliberately not available in the first release. A restore workflow needs a separate business approval and audit design before implementation.
- User accounts are administered by an appointed MSWG account administrator. Technical owners may deploy infrastructure but should not be the routine approver of business access.

## Departments and heads

| Department | Department ID | Department head(s) | RR department access |
|---|---|---|---|
| CEO Office | `ceo-office` | Dr Ismet Yusoff (CEO) | Dr Ismet Yusoff and Phua Jing Wei have RR access; Manivanan does not under the current HOD/privileged-user scope |
| Corporate Monitoring | `corp-monitoring` | Rita Foo and Elaine Choo | Both co-heads |
| Corporate Governance | `corp-governance` | Noraida Maria | Department head only |
| Corporate Resources | `corp-resources` | Lini Hazlinda | Department head and full-visibility user |
| Finance & Admin | `finance-admin` | Emily Lim | Department head only |
| IT & Training | `it-training` | Padma Devi | Department head only |
| Creative Communications | `creative-comms` | Zulfiwa Zuehir | Department head only |
| Professional Development | `prof-development` | Iman Lai | Department head only |

## Three full-visibility users

| User | Home department | Additional permission |
|---|---|---|
| Dr Ismet Yusoff | `ceo-office` | View active and archived risks across every department; archive risks |
| Phua Jing Wei | `ceo-office` | View active and archived risks across every department; archive risks |
| Lini Hazlinda | `corp-resources` | View active and archived risks across every department; archive risks |

## Permission matrix

| Capability | No RR access | Department head | Full-visibility user | MSWG account administrator | Technical deployment role |
|---|---:|---:|---:|---:|---:|
| Sign in to RR | No | Yes | Yes | Only if separately assigned an RR role | No by default |
| View active risks in own department | No | Yes | Yes | No by default | No |
| View active risks in other departments | No | No | Yes | No by default | No |
| View archived risks | No | No | Yes | No by default | No |
| Create a risk | No | Yes, in own department | Yes, in own department | No by default | No |
| Update a risk | No | Creator only | Creator only | No | No |
| Archive a risk | No | No | Yes | No by default | No |
| Restore an archived risk | No | No | No—feature not available | No | No |
| Create, enable, disable, or reset users | No | No | No unless separately appointed | Yes | Emergency/support only if explicitly approved |
| Change department or application access | No | No | No unless separately appointed | Yes, with business-owner approval | Implements configuration only |
| Deploy application infrastructure | No | No | No | No by default | Yes, through a temporary deployment role |

## Cognito group model

- `rr-app-users`: base RR application entitlement
- `rr-department-heads`: department-head role marker
- `rr-viewers-all`: full cross-department visibility and archive permission
- `rr-account-admins`: administrative marker if account administration is later exposed through tooling
- `rr-dept-<department-id>`: exactly one RR department group per RR user

The token should also contain `custom:department_id` and `custom:application_role`. The backend checks that `custom:department_id` agrees with the department group, preventing ambiguous or inconsistent assignments.

## Administration and approval

- **Business owner:** Dr Ismet Yusoff, subject to written confirmation.
- **Account administrator:** proposed primary administrator Lini Hazlinda, with Dr Ismet Yusoff as approval/backup contact; both assignments require written confirmation.
- **Technical owner:** the developer/project maintainer during implementation and handover, with the permanent successor still to be named.
- Account administrators may create, enable, disable, and reset accounts only from an approved user list.
- Department or full-visibility changes require business-owner approval and should be recorded in the access workbook or a future access-request log.
