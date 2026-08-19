# MSWG RR — Project Brief

Paste this at the start of a new chat to bring it up to speed without re-explaining everything.

## What this is

MSWG RR is a department-scoped risk register dashboard for MSWG (Minority Shareholder Watchdog Group), a small organization with 28 people total. Each department logs in and sees only its own risk register: a filterable table, a risk matrix (impact vs likelihood), a residual-rating chart, and a "Register risk" form. The CEO is the one role with visibility across every department, plus a comparison view across all of them.

## Current status

A working prototype already exists: a single-file HTML dashboard (vanilla JS, Chart.js from CDN) with:
- Filters by quarter, department/element, and residual rating
- A 4-level risk matrix (Low, Medium Low, Medium High, High) toggleable between inherent and residual view
- A doughnut chart of residual rating distribution
- A full risk register table
- A "Register risk" modal that currently saves to browser `localStorage`

What's missing: real login, a shared backend so all 28 people see the same data, and department-scoped access control. That's the actual remaining build.

## Access model (decided)

- Two roles: **Department** (head + analysts, flat access within their own department, no further tiers) and **Executive** (CEO only, sees everything plus a cross-department summary)
- No existing company identity provider (no Google Workspace, no Microsoft 365), so accounts will be created manually, one time each, for all 28 people
- Access is controlled by login, not by network or wifi. The page itself is publicly reachable over HTTPS; data requests are rejected without a valid token
- Department membership lives as a Cognito group per department, carried in the login token, enforced server-side on every request (never trusted from the client)

## Architecture (decided)

Serverless AWS stack, chosen for near-zero cost at this scale and no need for an on-site server or LAN:

- **S3 + CloudFront** — hosts and serves the static dashboard over HTTPS from anywhere
- **Cognito** — login, one group per department plus an Executive group
- **API Gateway** — routes requests, rejects anything without a valid Cognito token
- **Lambda** — business logic; scopes department users to their own data, allows Executive to query across all departments
- **DynamoDB** — risk data, partition key `dept_id`, sort key `risk_id`, so a department's query is structurally confined to its own partition
- **Route 53 + ACM (optional)** — custom subdomain `risk.mswg.org.my` pointed at CloudFront, free HTTPS certificate

Domain `mswg.org.my` is already owned by the company; whoever manages its DNS just needs to add one CNAME record, or delegate the subdomain to Route 53.

## Budget

Realistic cost: $1 to $5 a month. Hard ceiling for planning purposes: **$30/month**, with an AWS Budgets alert recommended at $10 to catch anything unexpected early.

## Timeline (part time, ~10-15 hrs/week)

1. Planning and design — 1 week (mostly done)
2. AWS foundation setup (S3, CloudFront, Cognito) — 1-2 weeks
3. Backend development (API Gateway, Lambda, DynamoDB, department scoping) — 2-3 weeks
4. Frontend integration (login flow, replace `localStorage` with API calls, CEO view) — 2 weeks
5. Testing (department isolation, CEO access, user acceptance) — 1-2 weeks
6. Deployment and handover (domain, budget alert, 28 accounts, user guide) — 1 week

Total: roughly 8-11 weeks part time, 2-3 months elapsed.

## Open items (not yet decided)

- Full department list and which of the 28 people belongs to which department (pending)
- Whether the CEO's summary view needs more than a raw combined table (e.g., a proper cross-department comparison layer)

## Who's building this

One person (final-year student, working solo, studying toward AWS SAA-C03, so the AWS stack doubles as exam-relevant experience).
