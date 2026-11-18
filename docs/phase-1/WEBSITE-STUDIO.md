> Historical snapshot: setup/status statements below are not current. See CATALOGUE-AND-STUDIO.md for implemented controls and RELEASE-RUNBOOK.md for current release prerequisites.

# Website Studio backend maintenance notes

This is an opt-in backend foundation. The existing POS Website Content screen has not yet been migrated to these draft APIs. Do not enable the feature until the POS interface, preview flow and field-level schemas have been implemented and tested together.

## Configuration and storage

- Default: `WEBSITE_STUDIO_ENABLED` unset/false. Public content reads and existing POS editing remain unchanged.
- When true, `/api/website-studio` is mounted behind existing authentication and `settings` permission. Owner role is accepted through the existing permission middleware.
- The old `PUT /api/settings/content/:section_key` returns 409 when Studio is enabled, preventing legacy writes from bypassing the draft workflow.
- Migration 018 adds `website_studio_draft` and `website_studio_revisions`. `website_content` remains the public published store. Migration was applied to the isolated test database only.
- Content snapshots preserve existing sections. Save/publication uses a locked singleton draft row and optimistic `expectedVersion` checks. Conflicting edits return 409 instead of silently overwriting.
- Publication updates public content and records before/after snapshots in a single transaction. Publishing a restored snapshot removes sections absent from that snapshot so publication matches it exactly.
- Restore loads a revision into the draft; a further explicit publish is required.

## API contract

All responses use `{ success: true, data: ... }`; failures pass through the existing error handler. Responses are marked no-store/noindex.

| Method/path under /api/website-studio | Request | Behaviour |
|---|---|---|
| GET /draft | — | Current draft document/version; falls back to existing public content at version 0 before draft creation |
| PUT /draft/:section | content, expectedVersion | Save one allowed existing section into the draft |
| POST /publish | expectedVersion | Publish the complete saved draft atomically |
| GET /revisions | — | Latest 100 revision metadata records |
| POST /restore/:id | expectedVersion | Restore an identified revision into the draft only |

Actor identity comes from the authenticated session, not request-body fields. Current section allowlist covers nine existing content sections. Validation currently rejects unknown sections, non-object roots, oversized/deep documents and unsafe property names. This is JSON-envelope validation, not complete URL/media/content-block validation.

## Tests and remaining engineering

`backend/test/websiteStudio.test.cjs` covers draft isolation, section preservation, stale versions/concurrent callers, publication history, restore semantics, invalid content/version handling and adapter rollback/release. Initial real isolated-MySQL checks verified draft locking/conflicts, public isolation, history and restoration. These do not establish full website editing, media safety or real stock concurrency.

Remaining before enabling: structured field schemas, media/URL validation, new content block/page types, protected preview, category attributes and assignments, publication UI, revision UI, more granular publishing permissions and complete browser/UAT coverage.

## Application architecture constraints

Extend the existing React/Vite website/POS and Express/MySQL backend. Preserve product/variant/category IDs, product slugs, established public routes and working pricing/delivery/payment flows. Do not replace the existing commerce system with the standalone HTML prototype. Stock reservations remain unimplemented; current website orders check stock at creation and deduct on staff acceptance. Pricing lookup still precedes the order transaction. Resolve both lifecycle/pricing contracts and legacy chatbot deductions before claiming reliable concurrent shop/online availability.

Commercial proposals, design prototypes, schedules and owner-review checklists are external references, not runtime dependencies. See the root README for their separate location.
