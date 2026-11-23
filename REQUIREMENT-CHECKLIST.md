# LITTORA requirement checklist

Status meanings
- V — implemented and verified within the stated evidence.
- R — implemented, awaiting complete review or acceptance.
- N — requested implementation is missing or incomplete; implementation gaps are named below.
- B — blocked by the named external dependency.

This checklist records requirement-level acceptance. Partial implementations remain N until the named gaps are implemented; unverified implemented controls are R. Passing tests do not establish completion of a module.

## Working approach
- V Original folder and main branch inspected. Existing changes and nine untracked product images retained.
- V Isolated authenticated review API at 127.0.0.1:15222 with littora_print_test on port 13323. Database directory checked before migrations.
- R Manageable batches and local UI/API checks. Complete acceptance remains open.
- N Cleanup inventory, preservation of recoverable obsolete work, removal of confirmed unnecessary files.
- R Existing source, assets, tests, migrations, lockfiles, example configuration and deployment instructions retained.
- B Manual local acceptance → Git integration/push → VPS retrieval/build/migrations → deployment → verification depends on user acceptance and user-operated deployment.
- N Check automatic deployment before any push instructions. No push instructions issued.

## Website
- N Retain existing URLs/data and verify Shop, Blog, About, Contact, Track Order, search, cart, checkout and POS integration.
- N Continuous homepage, smooth scrolling and active sections.
- N Partial-name and tolerant search, live suggestions and alternatives.
- N Combined category filters, sort, selected indicators, clear-all and preserved state.
- N Diapers — brand, size, tape/pant, pack pieces, price, availability.
- N Toys — type, age, brand, price, availability.
- N Flowers/decor — bouquet, hanging flowers, vase, bonsai, colour, material, price, availability.
- N POS-managed product/variant attributes, media, specifications, variants, related products, quick shopping and price per diaper.
- N Manual visibility plus automatic unsellable hiding with manual hiding preserved on restock.
- R Server price/discount/stock checks and new-order discount allocations. Full checkout acceptance pending.
- N Repeat orders with current prices and stock.
- N Shared Sri Lankan phone normalization for all four specified formats.
- N POS-managed pages, sections/order/visibility, banners, offers, menus, video, social links, FAQs, policies, blogs and appearance.
- N Draft, preview, publish and revision restore.
- N Instagram, YouTube, TikTok and Facebook links/icons.
- N Editable validated video/animation uploads, playback controls and static fallbacks.
- N Layered premium visual design, perspective, lighting, depth, motion and transitions.
- N Touch, keyboard, reduced motion, standard/enhanced/off modes, stable layouts and scrolling.
- N WebP optimization preserving originals/transparency, loading performance, accessibility, SEO, metadata, robots, sitemap and favicon.
- N Actual browser performance measurement.

## Billing
- R Expanded bill workspace replacing catalogue cards; item/variant, quantity, MRP, discount and total.
- R MRP/sale/final-price distinction, editable quantity, price permissions, per-unit/line discounts.
- R Promotions, manual discounts, coupons and final amounts on screen/receipt.
- R Immediate name/SKU/barcode search, variants, pack quantity, price, stock, arrows/Enter/Escape.
- R Repeated variant scans, protected editor input, removal/undo, identifiable held bills and recovery.
- R Hold/recovery preserves customer, variants, discounts, coupons, fulfilment and payments. Full regression pending.
- R F2 confirmed cancellation outside editors, F7 hold/resume, F8 permission-controlled returns, Delete selected line, Ctrl+K search, Ctrl+Enter payment review, F1/? guide, F4 camera, Escape dismiss.
- B F3 drawer operation depends on printer/drawer model, connection and actual equipment.
- R Enter confirms payment only in payment confirmation; persisted sale opens receipt. Duplicate sale protection exists.
- B Silent printing, physical print failure/reprint and drawer command deduplication depend on supported hardware integration.
- V Cash tender 5000 against 4675 retains 4675 and change 325; split change comes from cash, checked by backend tests.

## Returns, receipts and sharing
- R Original paid item allocation, unrelated discounts protected, cumulative quantity/refund rounding and remaining-quantity checks.
- R Returned item/variant/quantity/refund/reason/restock records; full disposition and original-price audit presentation pending.
- R Atomic replacement bill with original return credit, residual refund/store credit and retry protection.
- R New sale promotion/coupon/manual/loyalty allocations persisted. Full promotion combinations pending.
- R Historical missing discount evidence requires owner allocation approval with reason and reconciliation.
- R Historical receipt search; barcode does not determine historical price.
- N Permission-controlled unlinked returns with approved amount and audit.
- V FIFO crossing batches and original-cost saleable restoration verified in synthetic workflow.
- R Non-restocked returns excluded from sellable restoration. Full damaged/quarantine inventory workflow pending.
- R Receipt image download and WhatsApp/open-chat fallback.
- B Actual recipient attachment/share acceptance depends on supported device sharing capability; no real messages sent.

## Orders and delivery
- N Separate authoritative fulfilment, customer payment and courier settlement status across operational screens, tracking and reporting.
- R External courier POS billing records confirmed fulfilment and COD.
- N Placed → Confirmed → Processing → Packed → Shipped → Delivered, pickup → Collected.
- N Icons, staff, timestamps, sequential transitions, audited corrections and exception actions.
- R External courier saved-customer/tracking validation.
- N Create shipment → obtain tracking → finalize, assigned courier display, matching tracking links and relevant actions.
- B Shipment creation/status APIs depend on verified courier documentation, credentials and sandbox access.
- N Parcel transfer fields, immutable submission snapshot, duplicate prevention, failures/retries and exception queue.
- N Delivery/tracking motion and depth.
- N Courier-compatible labels with recipient/sender/return, order/tracking, COD/prepaid, parcel count and supported barcode.

## COD and settlement
- V Synthetic 4900 merchandise entitlement plus 600 delivery produces 5500 COD and 4900 expected remittance.
- V Explicit allocation limits, partial balance, concurrent retry and reversal tested through authenticated API.
- R Explicit allocation UI and preview, receiving method/account, order/tracking lookup and history.
- V Authenticated synthetic test applied unapplied receipt once under concurrent retry, retained original business receipt date/account, created zero new cash, and reversed allocation/source in dependency order. UI acceptance remains R.
- R Reversals retain history and restore balances, owner permission enforced. Full UI review pending.
- R Added separate retained delivery, extra courier fee, approved deduction/reason and business receipt date. Unit tests verify fee limits and unresolved shortages. Full API/UI acceptance remains pending.
- N Unsettled/Partially settled/Settled authoritative status including settled order views and legacy reconciliation.
- N Batch/partial settlements with all fee/difference/reversal combinations.
- N Delivered-independent settlement and customer-to-courier payment exclusion across all business balances/reports.

## Customers and loyalty
- N Every saved customer as loyalty; anonymous sales create no individual walk-in profile.
- R Original customer bill detail, receipt values, returns, payment methods, reprint/download/share. Cross-screen review pending.
- R Existing loyalty ledger preserved.
- R Rs150 earns one point; Rs1 redemption; 1000 minimum/10000 maximum, balance/value caps and wholesale exclusion.
- R Delivery/discount/redemption exclusions and return point restoration/reversal.
- V User confirmed existing per-bill loyalty rounding. Retain until explicitly changed.
- B Automatic WhatsApp offers/reminders depend on provider access, templates and marketing consent configuration.
- N Preferences, frequency limits, unsubscribe and delivery logs.
- N Credit reminders after seven days overdue, remaining debt, staff notifications, deduplication, stop-on-settlement and repeat frequency.

## Inventory and FIFO
- V New products allow duplicate names with distinct SKUs; backend requires SKU/retail price and validates supplied numeric attributes. Synthetic API and unit tests passed.
- N Optional category attributes and removal of remaining category/label requirements in creation UI.
- V New product/opening-batch omitted cost remains NULL; known zero remains distinct. Existing historical values are preserved. API checked.
- N Evidence workflow for assigning subsequently established costs to an existing unknown-cost batch (distinct from undocumented quantities).
- N Editable images/video/animation after creation.
- N Category/brand/low-stock/visibility filters and dated sales/price/margin sorting.
- R Cost hiding on order detail/return APIs; complete API/export/label permission audit pending.
- R Internal SKU barcodes and batch labels; hardware readability pending.
- V Stock adjustments/counts update FIFO batches transactionally, require reasons, reject stale counts, and deduplicate concurrent retries. Additions require actual cost; removals retain exact batch evidence. API verified.
- V Owner/admin reconciliation adds evidenced receipt batches matching undocumented quantities without changing physical count or historical sale costs. Concurrent API checks passed.
- R Adjustment/count/reconciliation UI implemented; current browser verification blocked by automation URL-policy detection.
- N Locations/transfers, bulk edit/import preview, complete archival, batch/expiry, ageing, supplier comparisons, reorder and exception workflows.
- N Consistent physical/reserved/sellable/damaged stock definitions.
- V FIFO oldest receipt consumption, cross-batch cost 600 and profit 1900 acceptance fixture.
- R Receipt dates/remaining quantities/landed costs, exact sale allocations, latest purchase cost separated from sale snapshots.
- R Transactional stock protection and linked returns; concurrent last-unit sale and return retries checked.
- R Historical missing batch evidence blocks invented attribution and saleable restoration.
- N Optional warranty duration/provider/terms/serial requirement, sale snapshot and customer history.
- B Warranty start-date policy requires confirmation.

## Purchasing
- R Single editable quantity/unit cost/line total table; name/SKU/barcode lookup and camera entry.
- B Physical scanner input requires actual hardware verification.
- R Supplier, invoice date/reference, duplicate invoice warning, partial receiving and receipt retry safety.
- R Actual transport/other charges, separate third-party obligations, line/shared allocations.
- R Quantity/value/weight/manual allocations and backend preview. Quantity/value/weight/manual rounding tests pass; full UI acceptance pending.
- R Cent-reconciled landed batches and prevention of repeat receipt charges.
- R Merchandise/transport/receipt charges, total, previous payment/current payment/balance, method/account, registered paid-by and separate operator.
- R Optional JPG/PNG/PDF attachment, preview/download; PNG authenticated transfer verified, JPG/PDF acceptance pending.
- N Supplier-facing PO image sharing, supplier references, cost comparison and shortage/damage receiving.
- R Payment history and owner reversal with reason, concurrent retry tested.
- N Audited late-cost adjustments preserving historical profit.

## Daily summary, reports and dashboard
- N Owner unrestricted historical roll-up/drill-down with accurate costs.
- V Shared cashier API policy: Asia/Colombo day, newest created_at/id order, whole-bill cap 51785, stop without skipping, newest oversized bill restriction. Authenticated boundary tests passed. Browser acceptance remains R.
- R Sales lists/detail/returns/search/pagination, sales exports, dashboard/chart summaries and customer-scoped older bills use the shared policy; authenticated HTTP checks passed for tested paths. Historical analytics reject cashier requests and packing excludes totals. Complete cross-module permission acceptance remains pending.
- R Exact original FIFO costs preserved on new sales.
- R Credit/COD collection report uses business receipt dates and frozen per-receipt FIFO cost allocations for new collections; reversal negates stored amounts. Unknown historical allocation remains unknown.
- N Unified counter/credit/COD/refund collection report, complete fee economics and historical reconciliation remain incomplete.
- N Clearly labelled transaction versus collection metrics.
- N Cash/card/bank receipts, credit issued/repayments by method, refunds, expenses, opening cash, movements, expected/count closing cash, overdue balances and supporting transactions.
- N Facts/dimensions, historical attributes, incremental ETL/data quality, time/category drill-down, slice/dice, comparisons, ageing, retention, courier KPIs and refresh time.
- N Missing-cost visibility and forecasting gated on adequate actual history.

## Settings and delivery rates
- R Receipt/barcode printing settings.
- N Central business identity/logo/phones/address/sender/return/social/opening hours/receipt policies/warranty/currency/timezone/permissions acceptance.
- N Courier/zone first/additional kg rates, effective dates, product/package weights and authorised overrides.
- N Exactly 300g down, 301g up, minimum 1kg, consistent backend POS/website rule.
- N Missing-weight attention, separate customer/actual courier charges and saved rate/calculation snapshot.

## Printing additions
- V 58mm/80mm/A4 save/reload and preview/copy checks were run in Edge in the printing batch.
- R Width/margins/font/logo/visible fields and long names/discounts/coupons/returns/split payment/tender/change layout.
- R Test print, copy-marked reprint and printer-independent image exports.
- R Label dimensions/gaps/margins/columns, product/variant quantities, barcode/SKU/name/variant/selling price options.
- R Cost-free labels, barcode proportions/quiet space, preview and calibration.
- B Physical receipt fit, label scan-readability, silent print and drawer checks depend on actual printer/scanner/drawer models, connection types and media dimensions.

## Verification and handover
- V Backend suite last run 47/47 and frontend build passed before this continuation.
- R HTTP synthetic tests cover purchase/payment retries, FIFO crossing, targeted discounts, loyalty limits, partial returns, concurrent exchange/refunds and COD allocation/reversal.
- N Full permissions, delivery 300/301g, cashier cap/date, original-price preservation, complete status and courier concurrency acceptance.
- R Local browser checks cover printing, Billing load, purchase preview and settlement history. New allocation/reversal UI acceptance pending.
- N Full end-to-end regression, actual browser performance measurements and all requested hardware/integration acceptance.
- B Manual deployment handover awaits local acceptance. Production access remains outside development scope.

## Current localhost review
1. Open http://127.0.0.1:15222/purchasing/8 for partial receiving and allocation previews.
2. Open http://127.0.0.1:15222/purchasing/11 for unknown-cost confirmation.
3. Open http://127.0.0.1:15222/reports and choose Settlements, review-cod, View Orders for remittances and history.
4. Open http://127.0.0.1:15222/orders and inspect ORD-2026-000015 for the latest settlement verification fixture.
5. Open http://127.0.0.1:15222/settings for receipt and label settings.

Restart from C:\Users\User\BABYSTORE-POS using & .\scripts\restart-print-review.ps1.

## Current verification evidence — 2026-11-23
- Latest backend suite: 59 passed, zero failed. Final frontend production build passed, including blank-retail validation; git diff --check passed.
- Authenticated `.print-test/cashier-boundaries.cjs` passed exact cap, previous-day denial, deterministic equal timestamps, stop-before-exceeding, oversized newest bill, pagination/search/export, direct bill access, scoped older operational history and owner/admin access. Additional product cost redaction, packing total omission and historical analytics denial passed.
- `.print-test/stock-adjustments.cjs` passed cross-batch removal, cost evidence, concurrent retry, stale count, missing cost, evidenced addition and reconciliation. Latest fixture STOCK-ef8b00db; separate LEGACY/UNKNOWN fixtures share that suffix.
- `.print-test/credit-reversal.cjs`: ORD-2026-000019 concurrent repayment/reversal each changed debt once; collected merchandise netted to zero. Read-only authenticated verification confirmed the stored FIFO cost and its exact opposite reversal. Immutable allocation rounding/reversal unit tests pass; full courier API acceptance of the new snapshot remains R.
- Migrations 039–042 applied only after database name/data-directory checks. Existing missing migrations 002/006 were applied to the isolated database. Catalogue now responds successfully; no production configuration changed.
- Browser automation stopped because it could not identify the current browser URL with policy confidence. No new browser/UI verification claimed this continuation. Earlier printing evidence remains historical evidence, not a fresh full regression.
- Source changes and nine product images retained. No push, merge, deployment or production changes.
- Remaining N entries above are implementation gaps, not external blockers. Provider/hardware dependencies do not establish completion of independent work.
