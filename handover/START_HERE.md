# MSWG successor handover package

Prepared 10 September 2026 from the main checkout at commit `7aae24e`.

Read **MSWG_Project_Handover_Book.pdf** first. It explains the three modules, current status, local setup, saved data, roles, known issues, responsibilities, and handover acceptance.

Then follow **MSWG_AWS_Deployment_Guide.pdf**. It provides the confirmed service map, preparation fixes, development and production deployment procedures, configuration examples, Cognito user setup, testing, cost controls, recovery, and Pre-Voting migration tasks. The PDF contents and AWS references are clickable.

The `.md` files are editable text versions of the same books. Open them in an editor to copy commands or update the handover. They are not scripts and do not deploy anything automatically.

Planning estimate: 40 to 70 focused hours for a reviewed RR and AGM release, plus a provisional 30 to 60 hours for Pre-Voting. Account access, holidays, approvals, and substantial extraction redesign can add time. Treat 18 September 2026 as the assumed handover checkpoint rather than a guaranteed full-platform release date.

Current preparation work must be completed before production. In particular, the existing AWS template covers RR and AGM only; Pre-Voting remains a local Python and SQLite implementation. The books distinguish verified code/test evidence from future deployment tasks.

No application code was changed, AWS resources deployed, or records migrated to prepare this package. Before giving it to the successor, fill in the named owners and confirm the approved account, region, recipients, roster, and repository revision.
