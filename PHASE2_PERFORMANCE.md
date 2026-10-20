# Phase 2 performance changes

Local implementation and production-build validation, 10 September 2026. No deployment or database migration was performed. Phase 1 transaction, authentication and duplicate-submission safeguards remain in place.

## Measured differences

The saved Phase 1 build baseline is `scripts/phase2-before.json`. Current measurements are in `scripts/phase2-after.json`. Sizes below use decimal KB and include static imports recursively, rather than measuring only the entry filename. They exclude images, fonts, API responses and dynamically requested routes.

| Metric | Before | After | Difference |
| --- | ---: | ---: | ---: |
| POS initial JS | 1,936.61 KB | 436.50 KB | -77.5% |
| POS initial JS, gzip | 507.35 KB | 140.40 KB | -72.3% |
| POS initial CSS | 120.72 KB | 90.71 KB | -24.9% |
| Website initial JS | 462.53 KB | 462.84 KB | +0.1% |
| Website initial CSS | 101.20 KB | 88.82 KB | -12.2% |
| Homepage hero, original vs 960px AVIF | 1,134.33 KB | 27.79 KB | -97.6% |
| Shop hero, original vs 960px AVIF | 4,837.58 KB | 36.27 KB | -99.3% |

Initial POS code plus the Billing route is 532.79 KB (164.48 KB gzip); Login is 442.00 KB and Dashboard is 856.38 KB. The website homepage including its static dependencies is 516.24 KB. Camera, export and other action-triggered chunks are additional when used. Total POS JS across all routes is 1,948.93 KB versus 1,936.61 KB before: splitting avoids unnecessary initial downloads; it does not remove those features. Website total JS is 600.36 KB versus 589.64 KB, including responsive image metadata. Image selection depends on viewport and device pixel ratio; the 1920px homepage AVIF is 71.06 KB. These are build/file measurements, not new Lighthouse results.

## Changes and tradeoffs

- `frontend/src/App.jsx`: lazy imports for POS pages, with loading fallbacks. Charts are requested by the pages that use them. First visits to another page now require a chunk request; keep old fingerprinted assets available during deployment.
- `frontend/src/components/LazyBarcodeScanner.jsx` and its consumers: load camera scanning only when opened. A local error boundary keeps the Billing cart mounted if this optional chunk fails. Barcode entry remains available. Test camera permissions on the actual POS device before release.
- `frontend/src/components/Receipt.jsx`, `Quotation.jsx`, `ShippingLabel.jsx`: load image export functionality on demand. Existing export error handling remains; the first export needs its chunk download.
- `website/src/components/HeroImage.jsx`, `PageHero.jsx`, `pages/Home.jsx`, `hero-images.json`: responsive AVIF/WebP images at 640/960/1440/1920 widths, with JPEG fallback. Existing source photographs, focus positions and layout remain. `scripts/optimize-hero-images.py` regenerates fingerprinted files; originals are retained. A representative WebP was visually inspected; validate all crops at real device sizes in staging.
- `website/vite.config.js`: route-aware early hero preloading, one format only, matching the picture's responsive source set. Product and checkout routes do not preload unrelated heroes. Check the deployed CSP allows the injected script; if not, move it to an allowed external script or provide a CSP hash as part of deployment configuration.
- `website/src/components/ProductCard.jsx`: lazy, dimensioned product thumbnails; secondary images requested on pointer/focus interaction; cached pointer geometry instead of layout reads on every pointer movement; memoized cards and cleaned-up feedback timers. Actual uploaded product image resizing remains outstanding.
- `website/src/context/CartContext.jsx` and `PromoContext.jsx`: stable action/context values keep cart changes from rerendering every product card unnecessarily.
- `website/src/components/CartDrawer.jsx`: promotion requests only when the drawer is open and populated, debounced and aborted on changes. Existing Phase 1 concurrent GET deduplication remains, without caching stock or prices across completed requests.
- `website/src/pages/Shop.jsx`: 24-item pages, URL-backed navigation, filter changes reset pagination and obsolete requests are cancelled. POS catalogue loading is unchanged so barcode lookup coverage is preserved.
- `backend/src/models/publicModel.js`: opt-in `view=card` omits unused descriptions and the sales aggregation except when required by best-selling sorting. Default API shape remains compatible; image batching, counts, price fields and filtering remain. Stable ID tie-breaking prevents ambiguous pagination ordering. SQL behavior is covered with mocked tests; staging MySQL verification is still required.
- `website/src/index.css`: Latin font subsets reduce generated font CSS and unused font assets. Browser fallback handles scripts not present in these Latin fonts; verify Sinhala/Tamil content on supported devices.
- `website/src/components/Header.jsx`: consistent header sizing avoids scroll-driven height changes. `PromoBanner.jsx` fades with opacity instead of animating layout height. Asynchronously inserted banners/content can still shift layout; the reported CLS of 0.341 has not been demonstrated resolved.
- `deployment/performance-cache.nginx.conf`: proposed compression and long-lived caching for fingerprinted build assets and optimized heroes, with revalidation of the HTML shell. This is a template to merge into the existing server blocks, not a replacement deployment configuration. APIs and uploads, including payment slips, are deliberately excluded from public immutable caching.

No dependencies were removed merely because route splitting moved them off the initial load. No database indexes were added without a production query plan or schema inventory. No business rules or database schema changed in Phase 2.

## Validation

- POS and website production builds passed.
- Both frontend lint commands passed with warnings; remaining warnings include unused imports, Fast Refresh exports and existing hook dependencies.
- Backend test suite: 22 passing, including 20 Phase 1 tests and two catalogue performance/compatibility tests.
- `node scripts/measure-build.mjs scripts/phase2-after.json` measures manifest dependency closures and per-route JS.
- `node scripts/verify-performance.mjs` passed: responsive files and size metadata exist, generated preload script executes for mapped routes and trailing slashes, unrelated routes avoid preloads, and both initial JS bundles remain under 500 KB.
- No production DB, live checkout, camera hardware, print device, or browser Lighthouse run was exercised by these automated checks.

## Safe release and remaining measurements

1. Deploy backend card-query support and both builds to staging with production-like data. Check shop filtering, pagination, best-selling sort, product images and direct route refreshes.
2. Exercise login/session expiry, Billing barcode entry and camera, sale submit/retry, receipt export/print, quotations and exchange flows. Simulate a failed camera-chunk request and verify the cart survives.
3. Merge and validate the cache template against the actual nginx configuration (`nginx -t`). Confirm AVIF/WebP MIME types, compression, HTML revalidation and cache headers. Preserve previous hashed assets for already-open POS tabs; release HTML last or deploy atomically. Roll back HTML and backend together if necessary.
4. Repeat Lighthouse on identical mobile/desktop profiles and routes, preferably three runs each, recording medians, LCP element, CLS sources and network waterfall. Compare against the user's supplied scores; no score improvement is claimed here.
5. Investigate remaining storefront initial JS, asynchronous CMS/banner layout shifts, uploaded product images, and live API response sizes using those traces. Review slow-query logs and EXPLAIN plans before proposing indexes. This phase does not claim that all production performance findings are eliminated.
