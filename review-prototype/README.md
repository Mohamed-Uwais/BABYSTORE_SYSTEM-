# LITTORA proposal preview

## Category filter demonstration — revision 03

Visual direction is approved. Open the updated desktop/mobile portable previews and select Diapers, Toys, or Flowers and décor to see only the relevant filters. Multiple options in one filter are OR; different filters and price bounds are AND. In POS website studio → Categories & filters, add categories, attributes and options. Under Products, assign category-specific values, then preview or publish in demo. Changes remain local to this browser.

See `../docs/phase-1/WEBSITE-AND-FILTER-SCOPE.md` for the existing-site upgrade strategy and final-scope additions. Five filter-logic tests pass; browser visual QA and staging integration remain outstanding. Rebuild portable files using `python review-prototype/build_preview.py` from the repository root.

## Revised visual theme — revision 02

Open `desktop-preview.html` or `mobile-preview.html` directly in your browser for a self-contained interactive preview; no local server is required. Both include the revised LITTORA blue/white/mint theme, existing logo, Inter typography and family imagery. See BRAND-REVISION.md for the design basis and current verification limits. These are design review files, not an approved implementation.

From the repository root, run:

```powershell
python -m http.server 4178 --bind 127.0.0.1
```

Open http://127.0.0.1:4178/review-prototype/ in your local browser. Keep the server root at BABYSTORE-POS so existing image paths resolve. Stop the server with Ctrl+C when finished. This server is for local review only; do not expose the repository root publicly.

Read PROPOSAL.md for the review, scope, phased budget, timeline, dependencies, acceptance criteria and limitations.

Suggested walkthrough:

1. View the desktop layout, then choose Mobile; also resize the actual browser.
2. Scroll between sections and use the sticky navigation.
3. Search `diapr`; combine category, brand, size, price and stock filters. Clear filters.
4. Open a product, add it to Bag, remove an item, and simulate checkout. No live order is created.
5. Open POS website studio. Edit the hero, preview it, then reopen Studio and Publish in demo.
6. Under Products, set a product's stock to zero and preview with automatic hiding enabled. Restock and preview again.
7. Turn manual visibility off, restock and preview; the product stays hidden.
8. Select animation None. Reduced-motion device settings also suppress transitions and smooth scrolling.
9. Reset demo to restore defaults and discard browser-local edits.

Verification: JavaScript syntax check, local file/asset existence checks passed. HTTP readiness could not be verified. Browser preview failed because the in-app browser could not reach loopback. Desktop/mobile visual QA, real-device accessibility and live-system testing remain outstanding. No Lighthouse score or production performance improvement is claimed.

This is a browser-local interaction prototype. Product photos are existing repository assets; toy/home items use illustrative icons. Studio's structural content/media fields demonstrate intended scope and do not implement production uploads, full page generation, permissions or a backend. No credentials, payment data or customer information is requested.
