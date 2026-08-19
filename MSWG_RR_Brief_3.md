# MSWG RR — Project Brief (Session 3 update)

Paste this at the start of a new chat to bring it up to speed without re-explaining everything.
This supersedes MSWG_RR_Brief_2.md — read this one only.

## What this is

MSWG RR is a department-scoped risk register dashboard for MSWG (Minority Shareholder Watchdog Group), a small organization (~26-28 staff). Each department logs in and sees only its own risk register; 3 named full-visibility viewers see everything across departments. Built solo by a final-year student, also studying toward AWS SAA-C03.

**Bigger picture, decided this session:** MSWG plans 3 internal platforms total. RR is the first. All 3 are intended to share **one AWS account** and **one Cognito user pool**, so staff get one login across all internal tools, with per-app access controlled by Cognito group membership. The other 2 platforms are used by everyone in the company; RR is used only by HODs + 3 named superusers. The 3 apps do not need to talk to each other, so no shared VPC is needed, just shared account + shared Cognito.

## Backend status (unchanged from prior sessions, all working locally)

- 6 Lambdas done, tested against DynamoDB Local: `createRisk.js`, `updateRisk.js`, `getAllRisksForExec.js`, `getRisksByDept.js`, `getRiskHistory.js`, `archiveRisk.js`
- Two tables: `mswg-risk-register`, `mswg-risk-history`
- Archived-risk filtering fixed this session: both `getRisksByDept.js` and `getAllRisksForExec.js` now hide `status: "archived"` by default, expose via `includeArchived` param. Verified working via test output.
- Cognito auth wiring is the next real infrastructure step, not yet started (blocked on AWS account, see below).

## Department list — finalized this session

Corporate Monitoring I and II **merged into one** `dept_id`: `corp-monitoring`, one Cognito group, both former heads (Rita Foo, Elaine Choo) have equal standing within it. Final list (26 people against org chart, brief's "28" figure not fully accounted for, flagged but not resolved):

| dept_id | Members |
|---|---|
| `ceo-office` | Dr Ismet Yusoff (CEO), Phua Jing Wei (Sr Exec), Manivanan (Driver) |
| `corp-monitoring` | Rita Foo, Lim Cian Yai, Tan Beng Liang, Yan Lai Kuan, Lim Zhi Bin, Elaine Choo, Norhisan, Nur Amirah, Wahyuni, Gan Thian Han, Kayethri |
| `corp-governance` | Noraida Maria, Hazel Lababas |
| `corp-resources` | Lini Hazlinda |
| `finance-admin` | Emily Lim, Khairi Jamaluddin, Chia Can Nie |
| `it-training` | Padma Devi, Rohana |
| `creative-comms` | Zulfiwa Zuehir |
| `prof-development` | Iman Lai, Yasmin, Nor Khalidah |

3 named full-visibility viewers (`risk-viewers-all` group, layered on top of dept group): **Dr Ismet Yusoff, Phua Jing Wei, Lini Hazlinda**.

Department heads (for "Head of Department" display logic): Dr Ismet Yusoff = CEO (no head). Department heads (Rita Foo/Elaine Choo, Noraida Maria, Lini Hazlinda, Emily Lim, Padma Devi, Zulfiwa Zuehir, Iman Lai) have the CEO as their own head, everyone else's head is looked up from their department.

## Frontend — built this session, functional prototype

Two folders, both requested to be shared/copied structure with 8 core files each:
- **`frontend-dept`** — for regular department analysts (26 non-viewer staff): `dashboard.html`, `register.html`, `history.html`, `profile.html` + shared `common.js`, `sidebar.js`, `shell.css`, `role-config.js`
- **`frontend-superuser`** — for the 3 named viewers: same files as above, plus `org-overview.html`, `archived.html`

**Design system**: matches the user's original `erm.html` prototype exactly — colors (`--bg #eef2f8`, `--accent #2f6fed`, high/medhigh/medlow/low semantic colors), Inter + IBM Plex Mono fonts, stat cards, dot-matrix risk visualization, doughnut chart (Chart.js), badge-styled table cells. User pushed back hard when an earlier mockup used a different, invented style — always match `erm.html`'s actual system, never reinvent.

**Data model note (important):** the existing `erm.html`/DATA schema is organized by **risk element** (Reputational, Financial, Compliance, etc.), NOT by department. There is no `dept_id` field in the actual risk records yet — that only exists in the Lambda/DynamoDB design, not the frontend prototype data. Org-overview groups by element for now, flagged to switch to dept_id grouping once real backend data flows in. Don't conflate the two schemas.

**Key architecture decisions from building this:**
- `common.js` holds the single shared `DATA` array (8 seed risks from the real MSWG risk register content), localStorage-based CRUD (`getAllData`, `addRisk`, `archiveRisk`), and rating logic (`computeRating`, `ratingClass`, `bucketFromScore`). Archiving a base DATA risk works by pushing an override copy into localStorage keyed by same `no`; `getAllData()` dedupes so overrides replace base rows, not duplicate them.
- `sidebar.js` renders the sidebar nav (marks active page via `window.CURRENT_PAGE`), the topbar (see below), the profile dropdown, and the language/time-aware greeting cycle.
- **`role-config.js` pattern (important, fixes a recurring bug):** originally each page had its own inline `<script>` setting `window.DEPT_LABEL`, `window.USER_NAME`, `window.IS_VIEWER`, `window.IS_DEPT_HEAD`. This caused a repeated bug: copy-pasting pages into `frontend-superuser` sometimes left the OLD department-user values in place, silently downgrading the sidebar (hiding Org overview/Archived) on some pages while other pages in the same folder showed the full superuser sidebar. Fixed by extracting these 4 variables into one `role-config.js` per folder, loaded before `common.js`/`sidebar.js` on every page. Now impossible for pages within one folder to disagree on role. Only `window.CURRENT_PAGE` stays inline per-page.
- **Topbar** (replaced an earlier floating fixed profile-icon approach, which overlapped page content on scroll): sticky blue bar at top of every page via `sidebar.js`'s `renderTopbar()`, containing eyebrow text, time+language-aware greeting, subtitle, and the profile circle/dropdown (View profile → `profile.html`, Sign out → placeholder alert until real Cognito sign-out exists). Sidebar height/position account for topbar height via `--topbar-h` CSS variable so sidebar doesn't scroll oddly under it.
- **Visual distinction between roles**: `frontend-superuser`'s topbar uses a dark navy (`#1c2536`) instead of the standard blue accent, so the two interfaces are instantly distinguishable without a full redesign.
- **`profile.html`**: shows full name, department, head of department (with CEO-override logic described above).
- Sidebar collapse (persisted via localStorage) has smooth opacity/width transitions, not abrupt `display:none`, to avoid janky animation.
- `.sidebar` uses `position: sticky` with height/top calculated against `--topbar-h` so it doesn't scroll independently or shift during interaction.
- Filters (`filterElement`, `filterRating`/`filterTrend`, `searchBox`) added consistently to `dashboard.html`, `history.html`, `org-overview.html`, `archived.html` — same pattern each time: `populateFilters()` builds dropdown options from current data, `getFiltered()` applies all active filters together, single `renderAll()`/equivalent re-renders every chart/table/stat from the filtered set.

**Register Risk**: fully functional both as a modal (on `dashboard.html`) and as a standalone `register.html` page (sidebar link goes to a real page, not just a modal trigger). All original form fields/dropdowns preserved (impact, likelihood, control methods, effectiveness, trend, etc.), inherent/residual rating computed and previewed live as the user fills the form.

**Still placeholder / not yet real:**
- `USER_NAME`, `DEPT_LABEL`, `IS_VIEWER`, `IS_DEPT_HEAD` are hardcoded per role-config.js, will be replaced by real Cognito token claims once auth exists
- Sign out is a placeholder alert
- Archiving in the prototype uses a manual "enter risk number" input on `archived.html`, since there's no real per-row archive button wired yet
- No real login screen exists yet

## AWS account — not yet created, blocked on management

Confirmed this session: **no real AWS account exists yet.** Local dev (DynamoDB Local, Docker) is unaffected and continues. Before Cognito work can start for real, need:
1. A company-owned email (e.g. `aws-admin@mswg.org.my`), not personal
2. A company payment card, not personal
Reasoning: account must be MSWG-owned from day one since the developer leaves after handover; transferring account ownership after the fact is a real hassle.

**Meeting with Lini Hazlinda** was scheduled to discuss this. Prep materials created this session:
- A plain-language AWS hosting requirements/justification doc (why AWS in-house vs continuing with existing external vendor **IPServerOne**, which currently hosts MSWG's public website — this is scoped to justify RR specifically, not a proposal to move the main website)
- A comparison table: external vendor vs in-house AWS, covering ownership, cost model, staff logins, role-based access, ease of adding/removing users, data ownership, future changes, handover risk, scalability to more platforms
- Answered CEO-level concern: "what happens when the developer leaves, who adds new people / handles frontend+backend" — answer: (1) adding a user becomes a few clicks in Cognito console once set up, not a coding task, (2) plan to use AWS CDK so infrastructure is defined as reproducible code, not tribal knowledge, (3) commitment to a **handover Admin Handbook** (how-to tutorials: add/remove access, check AWS bill, where code lives, who to contact), written incrementally throughout the project, not scrambled at the end — this hasn't been started yet since the other 2 platforms haven't started, but is a stated intention to raise in meetings.
- Self-signup for new users was considered and explicitly rejected: Cognito self-signup can't verify a claimed department, and department membership directly controls data access, so admin-created accounts stay the approach for this org's size (~26-28 people, infrequent joiners).

**Full AWS services list + cost estimate drafted for a Finance email** (services: Cognito, Lambda, DynamoDB, API Gateway, S3, CloudFront, Route 53 optional, ACM optional, AWS Budgets). Estimated $1-5/month for RR alone, hard ceiling $30/month, alert at $10/month. Final email version explicitly frames this AWS account + Cognito pool as **shared infrastructure for all 3 planned platforms**, not a one-off cost, so Finance isn't surprised later when platforms 2 and 3 land under the same account with only incremental (mostly DynamoDB) cost increase.

## Open items carried forward

- AWS account creation itself — waiting on company email + card from management
- Cognito user pool, groups, and 26 user accounts — not started, this is the next real build step once the account exists
- Whether the other 2 internal platforms' Cognito groups/naming conventions should be planned now or later (leaning later, since neither has started)
- Admin Handbook — not started, intentionally deferred until there's more to document
- Full original `erm.html` middle-section (~lines 500-955) was read in full this session and used as the design/data source of truth; if a new chat needs it again, re-upload `erm.html`
- The two frontend folders (`frontend-dept`, `frontend-superuser`) currently duplicate `dashboard.html`, `register.html`, `history.html`, `common.js`, `sidebar.js`, `shell.css` — this duplication is intentional/accepted for now (simpler than dynamic role-detection without real auth), but will likely collapse into one shared frontend once Cognito provides real role data instead of hardcoded `role-config.js` per folder

## Working style notes (unchanged)

- Guided, step-by-step, output/screenshots pasted back before proceeding
- Plain-language explanations of *why*, not just what to run
- Local-first, DynamoDB Local via Docker (`dynamodb-local` container — do not `docker rm`, just stop/start)
- User pushes back on design or scope drift — always match existing patterns (erm.html design, existing Lambda handler shape, existing common.js helpers) rather than introducing new ones
- User does not want extravagant/formatted documents when asking for plain explanations — match requested format (paragraph+bullets, not headers/tables, unless a table is explicitly asked for)
