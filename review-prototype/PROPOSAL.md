# LITTORA — prototype and initial implementation proposal

Prepared 13 November 2026. Budgetary planning estimate, not a fixed quotation. All amounts are LKR; taxes and third-party charges are excluded. No production system has been changed.

## Review basis and limitations

This review uses the supplied audit figures and a targeted inspection of the shared repository. The website and PageSpeed URLs could not be retrieved through the browsing tool. No authenticated POS session, live database, deployment configuration, waterfall trace or real-user measurement was available. Consequently, the root causes below are investigation priorities rather than proven live diagnoses. Existing documentation describes earlier local changes; it is not evidence those changes reached production. The provided reports cover only the POS login, not staff workflows.

| Supplied baseline | Website mobile | Website desktop | POS mobile | POS desktop |
|---|---:|---:|---:|---:|
| Performance | 60 | 50 | 64 | 99 |
| Accessibility | 80 | 80 | 89 | 89 |
| Best practices | 100 | 100 | 100 | 100 |
| SEO | 92 | 92 | 83 | 83 |
| FCP | 3.8s | 0.4s | 3.8s | 0.3s |
| LCP | 16.7s | 5.5s | 9.6s | 1.0s |
| CLS | 0 | 0.34 | 0 | 0 |

Mobile website LCP is the first performance priority; desktop CLS is also urgent. The POS mobile/desktop gap warrants separate network and CPU analysis. Best-practices scores do not establish security, financial accuracy or integration reliability.

## What to retain, extend and rebuild

Retain the React/Vite storefront and POS, Express/MySQL backend, existing product identifiers, inventory records, order model, supplier/purchasing/reporting foundations and authenticated staff access, subject to validation. A whole-system rewrite is not justified by the available evidence.

Verified repository findings:

- `frontend/src/pages/WebsiteContent.jsx` and `/settings/content` already provide POS-managed content. `contentController.js` accepts ten named section types; `contentModel.js` directly upserts section JSON. Extend this to validated schemas, drafts, revisions, previews, publication and rollback. A generic JSON object check alone is insufficient for a full owner-managed CMS.
- Inventory has a manual visibility action backed by `show_on_website`; the public listing and detail queries respect that field. The user's inability to hide items may reflect deployment differences, permissions or a defect. Reproduce before replacing it.
- `publicModel.js` already uses substring matching across name, brand, category and SKU. This contradicts an exact-name-only implementation in this checkout, but does not disprove the reported live experience. Typo tolerance is absent in the inspected listing query.
- Category, brand, price, stock and sorting parameters already exist. Extend variant-aware size and age facets, useful counts, search suggestions and URL state. Verify popularity against completed sales and returns; the current query appears to aggregate one selected variant, which may misrank multi-variant products.
- `PHASE2_PERFORMANCE.md` documents local route splitting, optimized hero images, smaller catalogue responses and a proposed nginx cache template. It records POS initial JS decreasing from about 1,937 KB to 437 KB and one homepage hero from 1,134 KB to 28 KB. These are recorded build measurements, not a new live speed test. Product upload resizing and asynchronous banner shifts remain outstanding there.

Rebuild the customer-facing composition, navigation and media presentation around the proposed design. Extend the CMS and integration contracts rather than replacing the inventory database. Review actual billing, refunds, purchases and accounting behavior before deciding any Phase 2 replacement scope.

## Prototype and recommended shopping experience

Open `index.html` through a local server. The prototype is separate from production and uses illustrative products, prices, copy and existing repository images. Desktop/Mobile controls demonstrate a narrow layout; also test at actual device widths. The visual direction uses warm ivory, deep botanical green, quiet serif headings, generous space and restrained transitions. Final logo treatment, photographs and brand palette require owner review.

Try searching **diapr**, combining filters, opening a product, adding it to the bag and simulating checkout. Open **POS website studio**, change the headline, preview the draft and publish to this browser. Under Products, set stock to zero, preview, replenish it, then repeat with manual visibility disabled. The manually hidden item stays hidden.

The home experience should be one continuous editorial page: Discover → Collections → Favourites → Story → Help. Sticky navigation follows the visible section and anchor links scroll smoothly. Avoid downloading the entire catalogue into this page. Use paginated catalogue results and a dedicated shareable search/category route for large collections, with filters and scroll position restored on return.

Recommend product quick views for browsing, backed by canonical product URLs for sharing, SEO, full specifications, sizes and media. Keep the cart in an accessible drawer with quantity editing and server-confirmed totals. Use a dedicated checkout route to protect focus, mobile form entry, payment returns and recovery. Prototype details use a modal, bag supports removal, and checkout is a simulation without address collection or payments; these do not constitute completed production checkout.

Search should normalize case, spacing and common transliterations, combine prefix/substring and typo matching, rank exact SKU/name first and use category/brand synonyms. Debounce suggestions around 150–250ms, cancel stale requests and make suggestions keyboard accessible. Offer useful related categories when nothing matches, clearly labelled. Benchmark an indexed search service or database-backed index against actual catalogue size before choosing a paid vendor. Return only eligible products; index updates must follow publication and stock changes. Facets must match the same sellable variant, rather than combining a size from one variant with stock from another.

## Full management from the POS

Add **Website Studio** inside the existing POS navigation, using the same identity and roles. No separate owner login is needed. The backend content/media module can be independently maintained while the owner's workflow stays entirely in the POS.

Production scope includes products, categories, brands, descriptions, prices, variants, image ordering/alt text, product video/captions/posters, homepage sections/reordering, banners with mobile crops, promotional video, featured products, timed offers, menus, contact information, FAQs, policy pages and SEO fields. Provide approved animation presets, spacing/display options, mobile/desktop preview, validation, draft saving, revision history, publish permission, scheduled expiry and rollback.

The prototype implements headline/intro/announcement preview, product metadata/filter changes, visibility rules, animation disabling and browser-local demo publication. Section order, featured products, offers, menus, contact/FAQ/policy and media fields demonstrate the proposed editor scope but do not render full custom pages or upload/transcode files. Production requires CMS schema extensions, a media library, storage, safe rich text, valid links, revision APIs and cache invalidation. Preview must use protected draft URLs; public APIs must expose published content only. Browser-local demo storage is not production storage or authentication.

Unlimited arbitrary layouts or custom JavaScript would undermine predictable accessibility and speed. Fully managed routine content should use reusable approved blocks. New block types, bespoke animation effects and structural checkout changes remain developer work. State these limits in the signed scope.

Visibility rule: `published AND manually_visible AND (NOT auto_hide OR sellable_stock > 0)`. Sellable stock accounts for reservations and any store allocation/safety buffer. At product level, use any eligible in-stock variant. Never overwrite manual visibility on stock changes. Enforce eligibility across search, related products, direct links and checkout, with defined cache/search invalidation. Preserve product URLs appropriately when sold out so temporary stock changes do not unnecessarily destroy SEO.

Essential Phase 1 POS work: Studio permissions, schemas/migrations, media handling, variant attributes, independent visibility rules, published read APIs, stock/price contracts and reliable order ingestion. Final checkout must atomically validate stock and prices, reserve/deduct under a documented order lifecycle, handle concurrent shop/online sales, prevent duplicate requests, release expired reservations and reverse stock once on cancellation/refund. Confirm how current sale/order states work before adding a second deduction path. Add retry logs and reconciliation alerts. These dependencies cannot wait until Phase 2.

## Performance, accessibility and SEO acceptance

Record three comparable cold-load Lighthouse runs per mobile/desktop route and compare medians: homepage, category/search, product, cart, checkout, POS login, billing and reports. Capture LCP element, request waterfall, transferred bytes, CPU long tasks and CLS sources. Check low/midrange Android and iPhone alongside desktop browsers; use realistic catalogue and network conditions. Trace staff typing, barcode lookup, sale submission, receipt printing, stock reconciliation and reports after login.

| Target | Proposed acceptance |
|---|---|
| Lab loading | Median LCP ≤2.5s and FCP ≤1.8s on agreed test profiles and key routes |
| Stability | CLS ≤0.1, including banners and asynchronous content |
| Responsiveness | Field INP ≤200ms at p75; lab interaction traces without repeated main-thread stalls |
| Lighthouse | Aim ≥90 performance/accessibility on key public routes; no critical manual accessibility defects |
| Search | p95 suggestion response ≤300ms server-side on agreed catalogue/load; typo fixtures including “diapr” pass |
| Synchronisation | Accepted stock/publication events reflected within 5s normally; failed events visible and retryable; zero oversells in agreed concurrency tests |

Targets depend on the agreed devices/network/data volumes and third-party scripts; freeze test conditions at discovery. Add real-user Web Vitals measurement without collecting personal shopping data and report p75 separately for mobile/desktop once sample size is sufficient. Good field thresholds are LCP ≤2.5s, INP ≤200ms and CLS ≤0.1: https://web.dev/articles/vitals. No current field result is claimed.

Optimize responsive AVIF/WebP product uploads, use explicit dimensions/aspect ratios, prioritize the actual LCP image and avoid lazy loading it. Lazy load below-fold media; promotional video gets a lightweight poster, captions and click-to-play. Audit cache headers and MIME types; use immutable caching only for fingerprinted public assets, revalidate HTML and avoid shared caching of private POS/order data. Remove unused code after tracing, split noncritical routes, defer chat/analytics and trim font weights. Reserve banner/header space, batch layout reads/writes and animate opacity/transform. No scroll hijacking or heavy parallax. Reduced-motion must suppress nonessential movement.

Resolve accessible names for every icon/button/link, text contrast, heading hierarchy, alt text, focus order, visible focus, labelled form errors, dialog focus return and keyboard screen-reader navigation. Scan plus manual testing at 200% zoom and narrow widths; an audit score alone is insufficient.

Fetch robots.txt and inspect actual response/status/content type before diagnosing its invalidity. The storefront should have valid crawler directives, sitemap, canonical URLs, metadata, meaningful headings and accurate Product/Offer structured data; control crawlable filter combinations. Keep private POS behind authentication and add `noindex` to login/private HTML, preferably an appropriate X-Robots-Tag. Robots exclusion is not security and must not prevent a crawler seeing a needed noindex directive during removal. A public marketing meta description is low priority for an intentionally private login page. Verify behavior separately on the actual storefront and POS hosts.

## Phases, dependencies, budget and approval gates

Estimates assume one existing shop, one inventory authority, the current codebase can be retained, existing COD/bank-transfer flows, and timely owner content/access. New payment gateways, major accounting migration, multi-branch stock, native apps, photography, translation and hardware are separately scoped. Phase boundaries include your test and approval; development of the next phase starts only after that approval.

| Phase | Scope | Calendar allowance | Planning cost | Dependencies / completion gate |
|---|---|---|---:|---|
| 1 — Website first | Access/deployment discovery, design refinement, responsive storefront, navigation, search/facets, detail/cart/checkout, full POS Studio, media, visibility, essential sync, performance/accessibility/SEO | 7–10 weeks, including discovery/design and UAT | 650,000–1,050,000 | Staging + backups, current POS/API/schema access, product attributes, brand/content approval. Owner publishes routine content unaided; checkout/concurrency/visibility tests pass; targets measured; owner signs off |
| 2 — POS operations | Billing, barcode/receipt workflows, inventory adjustments/transfers, purchasing/suppliers, income/expenses, returns, cost/margin and cash/bank reporting, staff permissions, audit trail and reconciliation | 4–6 weeks | 350,000–600,000 | Approved Phase 1, documented financial rules, opening balances and hardware. Parallel sample-day reconciles sales, COGS, purchases, refunds and cash/bank balances; permissions and restore drill pass; owner signs off |
| 3 — Customer replies | Website chat + WhatsApp, Messenger, Instagram integrations, grounded answers, identity-checked order lookup, shared inbox/routing, staff takeover, consent and monitoring | 3–5 weeks | 200,000–400,000 | Approved Phase 2, Meta business/account permissions, API reviews and chosen inbox provider. Channel-by-channel UAT, no unauthorised order disclosure, takeover stops bot, unavailable-data fallback tested; owner signs off |

Sequential total: **14–21 working calendar weeks plus external approval/client pauses; LKR 1.20–2.05 million**. Allow roughly 15% contingency until discovery identifies legacy defects. This is an independent effort estimate, not a claim of prevailing market rates or an offer by a contracted agency. Discovery should produce a fixed deliverable list, refined quote and release plan before implementation commitment. The present prototype does not begin production development.

Budget monthly allowances: hosting/database/backups/monitoring LKR 12,000–30,000; optional media storage/CDN LKR 2,000–10,000; maintenance/support LKR 20,000–45,000; Phase 3 inbox/AI services LKR 8,000–30,000 plus platform/message usage. Combined planning range after Phase 3: **LKR 42,000–115,000/month plus usage**. Renew domains at actual registrar cost. Obtain current supplier quotes and usage caps before purchasing. Maintenance should explicitly include updates, backup checks and a defined support-hour allowance; enhancements are separate.

## Communication automation

Use one shared staff inbox, with a channel adapter per platform and read-only access to published product data. Live price/availability comes from tools, not an AI model's memory. Verify customer identity before revealing order details. Log sources/timestamps, redact sensitive information and hand over when data is missing, confidence is low, the customer asks, or a complaint/refund needs staff. Assignment pauses the bot until staff release the conversation. Show staffed hours and provide an out-of-hours queue and response expectation.

WhatsApp Business Platform supports webhook-based replies and approved templates. Current official policy requires opt-in for subsequent contact, templates to initiate conversations or reply outside the 24-hour window, and a clear escalation path. Platform pricing is usage-dependent; do not assume all messages are free. Source: https://www.whatsapp.com/legal/business-policy/.

Messenger and Instagram are planned through their official messaging APIs, subject to eligible Page/professional-account setup, app permissions/review and current messaging windows. Do not promise unrestricted outbound replies or human-agent exceptions for automated marketing. Their developer documentation returned rate limits during this review, so exact account eligibility, permissions and current limits remain an explicit Phase 3 discovery dependency. Website chat is under our control and can support the same inbox and handover without Meta approval. Basic native greeting/FAQ replies can be a low-cost interim option, but they do not establish live inventory/order integration.

## Training, support and useful additions

Include two 90-minute owner/content sessions in Phase 1, two staff billing/inventory/reconciliation sessions in Phase 2, and one inbox/handover session in Phase 3, with recordings, short task guides and a named owner administrator. Each UAT includes staff doing real representative tasks without developer assistance. Propose 30 days of defect support after each accepted release. Agree support hours and severity definitions in contract; a practical starting option is business-hours critical-incident acknowledgement within four working hours, with restoration targets based on the hosting/support plan, not a blanket 24/7 promise.

Release through staging with backups, migration rehearsal, payment/order reconciliation and a rollback plan; verify backup restoration, not merely backup creation. Avoid changing stock rules during a trading day without reconciliation.

High-value follow-ups: reorder from past purchases, opt-in back-in-stock alerts, repeat-purchase reminders, curated bundles, pickup with reserved stock, delivery estimates before checkout, low-stock/reorder suggestions, supplier lead-time tracking, batch/expiry tracking where applicable, daily till closure and a mobile owner dashboard. Distinguish profit from cash: report COGS, discounts, returns, delivery costs and expenses separately; reconcile bank transfers and COD remittances. Prioritize repeat orders and stock accuracy before adding loyalty or complex recommendations. Use real purchase data for popularity; publish no unverified claims or reviews.

## Information needed to finalise the quote

Provide a staging POS URL with an appropriate review account, deployed version/hosting details, catalogue/order volumes, payment and delivery workflows, current monthly service bills and final brand/content assets through secure channels. Do not paste production passwords into the proposal. Discovery should demonstrate billing, search, purchasing, stock adjustments, website publication and end-to-end order reconciliation before confirming retained functionality.

Owner review now: visual direction, browsing/checkout approach, Studio control coverage, Phase 1 dependencies, acceptance targets and budget range. Full implementation remains subject to the agreed scope.
