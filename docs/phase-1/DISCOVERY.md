# LITTORA Phase 1 — discovery working record

Started 13 November 2026. Status: local code assessment in progress; deployed system not verified. This is not approval to implement or release. Earlier repository documents named PHASE1_STABILITY and PHASE2_PERFORMANCE describe prior technical work, not the newly agreed project phases.

Owner update: revised prototype visual direction, navigation, scrolling behaviour and overall structure are approved. Category-specific POS-managed filters are now explicit scope; see WEBSITE-AND-FILTER-SCOPE.md. This remains an upgrade to the existing website, with no whole-system replacement planned. Full requirements/implementation and live-release approval remain separate gates.

## Delivery agreement

One complete website launch after owner approval. Internal sprints may demonstrate progress on staging only. Phase 1 includes discovery, prototype, implementation, website-related POS controls/integration, testing, training and handover. Broader POS operations remain Phase 2; messaging automation remains Phase 3. Prototype and final requirements require approval before implementation. Additional costs require agreement before work. Design approval, UAT acceptance and payment do not authorise a live release.

LKR 850,000 and 8–11 weeks are previous planning estimates, not a binding quotation or a fee charged by this workspace. Discovery must identify and estimate integration changes before implementation commitment.

## Verified local baseline

- Backend: `npm test` — 25 passed, zero failures. Database-facing tests use mocks; real MySQL concurrency, schema compatibility and production workflows remain unverified.
- Website and POS: `npm run build` — both completed successfully. Build success does not establish browser usability or live performance.
- Existing untracked product poster and review-prototype files were preserved. No live database writes, migrations or deployment were performed.

## Priority findings

| Finding | Evidence | Required next action |
|---|---|---|
| Pending website orders do not reserve stock | `orderModel.createOrder` locks/checks variants but deducts only for POS; website orders are inserted pending. `acceptOrder` deducts on confirmation | Agree lifecycle and add reservations shared by website and POS, or explicitly approve an alternative. Validate last-item competition in real MySQL |
| Price lookup precedes the order transaction | `publicController.checkout` calculates catalogue/tier/promotional prices before calling `createOrder`; the locked variant retail price is not used to reprice the supplied item | Define a transactional pricing snapshot/version contract and test concurrent price/publication changes |
| Retry protection exists | Checkout keys/hashes and transactional replay in order flow | Verify deployed migration, request-key retention and retries after connection loss |
| Manual website visibility exists | Inventory visibility endpoint and `show_on_website` checks | Reproduce reported live limitation; check deployed version, permissions and direct links |
| Stock hiding is not a global visibility policy | Public catalogue supports an optional stock filter | Add independent auto-hide setting; apply consistently to public discovery and checkout while preserving manual visibility |
| POS content editing exists, but directly updates content | `contentController` allows nine section keys; `contentModel.upsert` overwrites section JSON | Extend validated content schemas, draft/published separation, revisions, preview and rollback |
| Current media uploader does not accept video | Shared upload middleware allows JPEG/PNG/WebP/PDF, maximum 5 MB | Introduce purpose-specific product/site media handling, validation, optimisation and storage limits; protect payment-slip paths |
| Partial-name search exists | Public model uses LIKE across name/brand/category/SKU | Add typo tolerance and suggestions; benchmark on realistic catalogue and verify size/age attributes |

## Proposed stock decision — pending owner approval

Use physical stock, active reservations and optional safety stock to derive sellable stock. Reserve atomically on website order creation; POS sells only unreserved stock. Fulfilment converts reservation to one physical deduction; cancellation/expiry releases once. Returns restore only inspected saleable items. Price and payment status remain separate from fulfilment status. Expiry policy, staff confirmation and dispatch trigger require agreement before implementation.

This changes current acceptance-time deductions. Do not add dispatch deductions on top of existing acceptance deductions. Audit delivery/refund/chatbot/adjustment paths and existing pending orders before migration. Historic chatbot orders may already have stock movements and require classification. Do not backfill reservations indiscriminately.

Alternatives for comparison: retain staff-confirmation ordering with explicit availability disclaimers (simpler, weaker certainty), or deduct available inventory immediately on order creation with reversible allocations (requires defining physical versus available stock consistently across reports). The proposed separate-reservation model best matches the previously requested rules but its implementation cost is not yet confirmed.

## Discovery work remaining

1. Compare deployed commit/schema/configuration to this checkout using read-only or staging access. Review public site and authenticated staff journeys.
2. Obtain a sanitised database/schema inventory and realistic catalogue volumes; restore staging and verify backups.
3. Exercise concurrent final-item sales, duplicate retries, cancellation/expiry, price changes, returns and legacy pending orders in staging.
4. Complete desktop/mobile prototype and POS Studio demonstration; visibly distinguish working, simulated and planned controls. Current prototype still requires visual QA.
5. Walk through the retention checklist with owner; record acceptance criteria and content-editing limits.
6. Measure mobile/desktop route performance, accessibility and server/cache behaviour; record reproducible profiles and median lab results.
7. Itemise necessary integration changes, refine effort/cost and agree implementation backlog and launch plan.

## Approval gates

- Discovery findings and retained-feature checklist reviewed.
- Desktop/mobile prototype, POS controls and limitations approved.
- Stock/payment/fulfilment lifecycle, performance test profile, requirements and revised estimate approved.
- Implementation may then begin locally/staging.
- Complete UAT, migration rehearsal, training and release package accepted.
- Explicit owner approval for the identified live release, followed by launch checks and rollback readiness.

No approval gate is marked complete by this document.
