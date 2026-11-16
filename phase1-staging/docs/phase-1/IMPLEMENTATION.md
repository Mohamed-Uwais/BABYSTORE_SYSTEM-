# Phase 1 implementation schedule and progress

Authorisation: owner approved the prototype direction and requested Phase 1 implementation, including configurable category filters and full routine website management within the POS. Any scope/cost change needs prior approval; every production deployment needs separate explicit approval.

## Approach and isolation

Upgrade the existing React/Vite website and POS with the shared Express/MySQL backend. Keep existing product/variant/category identifiers, slugs, URLs, order history, stock and working features. The approved HTML prototype guides component styling and interactions; it does not replace the commerce application.

Development checkout: `C:\Users\User\.codex\worktrees\littora-phase1\BABYSTORE-POS`. The original checkout and its untracked poster remain intact. Requirements and approved prototype files were copied into this isolated checkout; production credentials and .env files were not copied. Initial code work did not start servers or connect to databases. Following the owner’s staging instruction, a separate local MySQL instance was provisioned and repository schema plus migrations 017/018 were applied there only. See STAGING.md. No application or production deployment has been started.

## Indicative milestones

| Milestone | Planning window from implementation start | Review evidence |
|---|---|---|
| M1 — foundations | Weeks 1–2 | Staging configuration, additive schema review, content drafts/revisions, validated category/attribute contracts and stock lifecycle |
| M2 — POS website management | Weeks 2–4 | Product/category/attribute assignments, media, content blocks/pages/menus, preview/publish, visibility and permissions demonstrated |
| M3 — storefront integration | Weeks 3–5 | Approved visual direction in existing website; scroll navigation, typo search, category facets, product media and checkout; retained routes/features |
| M4 — complete-system testing | Weeks 6–7 | Concurrency/retry tests in staging MySQL, stock/order reconciliation, mobile/desktop accessibility and performance, migration/rollback rehearsal |
| M5 — owner review and handover | Weeks 7–8 | Complete staging website, UAT, training, source/account documentation, release package; launch only after separate approval |

Windows overlap for planning, not partial launches. Allow 6–8 weeks for implementation/review after discovery/prototype approvals; the earlier 8–11-week package includes discovery/design. These are estimates, not a promise of calendar completion. Deployed-version/schema access, a sanitised staging dataset and owner decisions may affect dates. Work can proceed on independent local code without them; live-database compatibility cannot be signed off without them.

Previous commercial figures remain planning estimates. Work in this chat does not commission or charge a supplier, guarantee support coverage or turn an estimate into a formal quotation. Any discovered additional work must be itemised before a cost/scope change is proposed.

## First implementation increment

- Additive migration 018 introduces a draft document and publication revisions. Existing published `website_content` rows remain in use by the public website.
- New content service supports save-to-draft, version-conflict detection, transactional publication, revision history and restore-to-draft. A restore does not automatically publish.
- New settings-permission-protected API is mounted only when `WEBSITE_STUDIO_ENABLED=true`; it remains disabled by default. Do not enable against an existing POS until its editor has been migrated and tested.
- With Studio enabled, the legacy direct-publish write endpoint is blocked to prevent bypassing drafts. Current public reads remain unchanged. Both the new flag and legacy endpoint guard must ship together.
- No product records, orders, prices, slugs or inventory are rewritten. No new content is published by installing code alone.

This is a backend foundation, not completion of M1 or of the full CMS. Existing-section shapes are validated only at the JSON-envelope level so current content remains compatible. Field-specific schemas, URL/media validation, new page/block types, finer publish permissions, audit presentation and POS preview/publish UI remain to implement before enabling the feature. The API is not yet a full website editor.

## Staging setup required before integration tests

Use a separately provisioned database and upload directory containing sanitised copies, distinct JWT credentials, sandbox/disabled notifications and courier/payment integrations. Never point the development process at production. Inventory schema migrations first; migration 018 is additive, but MySQL DDL must not be assumed transactional. Back up/restore staging before rehearsal. Do not blindly run all historic repair scripts. No credentials should be placed in documentation or the repository.

## Release gate

One complete website launch. Present the full staging package with retained-feature checklist, configurable-category demo, integration results, measured performance, accessibility findings, migration/rollback plan, training and handover. Design approval, progress demonstrations, milestone acceptance and payment are not deployment approval.

Validation: 30 backend tests passed before staging guard additions. Real isolated-MySQL draft/publication checks passed; no business data was used. Final test totals are reported in the implementation handoff.
