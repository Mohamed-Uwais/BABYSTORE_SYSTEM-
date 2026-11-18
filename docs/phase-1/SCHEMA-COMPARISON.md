> Historical snapshot: setup/status statements below are not current. See CATALOGUE-AND-STUDIO.md for implemented controls and RELEASE-RUNBOOK.md for current release prerequisites.

# VPS schema review — 14 November 2026

Source downloaded by owner: `C:\Users\User\Downloads\littora-schema-unreviewed.sql`.

Reviewed copy: `.staging/imports/littora-schema-reviewed.sql` (Git-ignored).

- Size: 42,395 bytes; 42 base-table definitions.
- SHA256: `ca2d856dfc536d3a9814a6d30e155a0371b96af345e7eca948de2a56069b4d36`.
- Static review found no business-row INSERT/REPLACE/LOAD statements, account/grant statements, database selection/creation statements, object definers, URLs, table/column COMMENT literals or unexpected string defaults.
- Credential-named field `password_hash` has no literal password default. Non-numeric string defaults were checked against declared enum options and ordinary text/status/store-display defaults without displaying sensitive contents.
- The file is structural input for comparison, not approved for automatic execution. No SQL from it has been executed. Views, triggers, routines and events were excluded from the initial export; their absence here does not establish absence on production.

## Initial structural differences

Compared with `database/babystore_schema.sql`, using table/column-name inspection (not a complete semantic comparison):

| Area | VPS export difference | Implication |
|---|---|---|
| Additional tables | checkout_requests, expense_categories, expenses, google_reviews | Preserve these structures; canonical bootstrap alone is not deployed parity. checkout_requests already has a separate local migration |
| Schema tracking | schema_migrations is absent from the exported base tables | Do not assume production has applied the local migration inventory. Do not blindly run the historic migration runner |
| Chat conversations | cart, customer_name, customer_phone, intent columns | Preserve current channel contracts; do not copy real chat/customer values into staging |
| Chat messages | provider column | Preserve compatibility; chatbot remains off in staging |
| Delivery | delivery_status, settled, settled_at columns | Preserve existing fulfilment/settlement behaviour and reconcile with stock lifecycle before reservation changes |
| Products | show_on_website column | Confirms schema support for current manual visibility. Live UI/permissions/behaviour still need separate testing |
| Quotations | canonical updated_at column is absent from VPS export | Check consumers before any assumptions about this field; broader quotation changes are outside Phase 1 |

## Next work

1. Compare full column types, nullability, defaults, indexes, constraints and enum values. Normalise MySQL display differences before generating migration decisions.
2. Inventory any excluded database objects using reviewed metadata; obtain separately reviewed definitions only if needed.
3. Reconcile the missing deployed Git commit with the local base, especially MAX-based order numbering. A schema export does not prove code parity.
4. Prepare additive changes for the isolated test database or a separately provisioned parity database, preserving existing synthetic Studio tests. Do not import this CREATE TABLE file over existing tables.
5. Add clearly fictional catalogue/users for integration tests after schema compatibility is established. No production business records are required.

No production migration, data change, deployment or schema-file import occurred in this review. The owner does not need to repeat the export or reset a password.

## Actual staging snapshot comparison

A read-only SHOW CREATE TABLE snapshot was taken from the independent staging instance after verifying its database name, port 13307 and data directory. No business rows were queried. Both the VPS export and current staging snapshot contain 42 tables, but the table sets differ:

- VPS-only: expense_categories, expenses, google_reviews.
- Staging-only: schema_migrations, website_studio_draft, website_studio_revisions. Keep these development additions.
- checkout_requests already exists in staging through migration 017.

Offline comparison removes current AUTO_INCREMENT counters and index/constraint names while preserving column definitions and key structure. Across shared tables it found no differing index definitions or foreign-key/check definitions. It does not compare excluded views/triggers/routines/events or prove runtime compatibility. Some column differences are redundant explicit CHARACTER SET clauses, rather than functional changes.

Significant findings for staging parity:

| Area | Confirmed structure difference | Planned handling |
|---|---|---|
| Website order lifecycle | VPS order enum additionally supports packed, shipped and delivered | Preserve all deployed statuses; map stock reservations and fulfilment against these states |
| Blog | VPS excerpt is TEXT; staging is VARCHAR(500) | Align staging so long existing excerpts remain representable |
| Product visibility | VPS has show_on_website; staging bootstrap lacks it | Add the deployed field to staging before catalogue/checkout journey tests |
| Product images | VPS sort_order is unsigned/non-null and is_primary is non-null | Align nullability/type in staging; preserve defaults |
| Quotations | VPS supports rejected/cancelled; totals have no defaults; staging additionally has updated_at | Preserve deployed states and leave unrelated quotation behaviour unchanged; avoid dropping the staging field merely for parity |
| Contact messages | VPS id is signed; staging id is unsigned | Document compatibility; do not change production identifiers to match the bootstrap |
| Chat structures | Additional fields and stricter count/takeover definitions | Preserve schema compatibility; chatbot remains disabled |
| Routing log | Table charset/collation options differ | Review effective collation before deciding whether to align this non-website subsystem |

Detailed private comparison: `.staging/schema-differences.json`. Reproduce the offline comparison with `python scripts/compare-schema.py` after a verified snapshot. The report is a comparison, not an executable migration.

Next increment: prepare a reviewed staging-only parity script, back up the synthetic test database, add the missing deployed structures and website-critical definitions, then create fictional test accounts/catalogue. Do not load the whole VPS export over existing staging tables or remove Studio test history. Production remains untouched. No further owner terminal commands are needed for this comparison.
