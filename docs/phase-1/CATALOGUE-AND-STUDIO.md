# Website catalogue and content operations

Run only in the isolated worktree with the separate staging database. The launchers
verify database identity, bind loopback, and prevent outbound API integrations.

```powershell
node scripts/start-staging-mysql.cjs
node scripts/start-staging-api.cjs
node scripts/start-local-frontend.cjs website
node scripts/start-local-frontend.cjs pos
```

Use separate terminals; do not start a second instance on an occupied port.
Storefront: http://127.0.0.1:15174/ . POS: http://127.0.0.1:15173/ .
Use the existing local POS account; do not copy production credentials.

Inventory permission protects `/inventory/website-filters`: category definitions,
product/variant assignments, product specifications and media. Product attributes
are stored once; AND combinations of variant attributes match one available variant.
Incompatible category moves and removal of assigned options are rejected.

Settings permission protects `/settings/content`: draft page/article/homepage
content, banners, menus, supported appearance settings and media. Save all drafts,
open the desktop/mobile preview, then explicitly publish. Restoring a revision
changes the draft only. Product prices/stock/visibility continue through existing
inventory workflows; these are operational changes, not content draft revisions.

Preview links expire after ten minutes and are version-specific, read-only tokens.
They survive navigation within the preview tab. Reloading a URL without its token
returns published content. Preview responses are not cacheable or indexable.

Content limits: 64 KB per section; 50 managed article overrides; 20 media items
per media field; images 5 MB / 40 megapixels; MP4/WebM videos 30 MB. New raster
CMS uploads produce responsive WebP files while originals remain under
`backend/storage/website-originals/`, outside public uploads. Back up that directory
and `backend/uploads/` together. Legacy article records and URLs remain intact;
plain-text body edits are safely rendered without author-supplied HTML execution.

Website orders reserve sellable stock at checkout and deduct physical stock once
on acceptance. Cancellation releases holds without adding undeducted stock. POS,
existing chatbot sales and stock repairs respect holds. No automatic expiry is
introduced. Before an approved release, reconcile legacy pending orders that
predate reservations and verify the deployed baseline. Ship the essential chatbot
stock guard with the API change if that existing sales channel is enabled.

Checkout and cart use server quotes. Checkout revalidates item prices, discounts,
delivery fee and availability; changed quotes require review. Existing delivery
functions remain authoritative. Tracking/repeat orders require matching normalized
mobile numbers, omit recipient details/internal notes, and share an IP rate limit.
Only loopback reverse proxies are trusted; review actual proxy topology before release.

Required additive migrations: 018–021. Staging already has these. Set
`WEBSITE_STUDIO_ENABLED=true` and the matching `PUBLIC_URL`; package `shared/` with
both apps and API. Install backend dependencies including Sharp with the lockfile
on the target platform. Never run live migrations or publish a release without approval.

```powershell
node --test backend/test/*.test.cjs website/test/*.test.mjs
node scripts/test-staging-catalog.cjs
node scripts/test-staging-orders.cjs
node scripts/test-staging-studio.cjs
```

Integration scripts create disposable actors/fixtures and clean them by ID.
Run serially with no concurrent content editing. Browser verification remains pending:
do not bypass the CookieConsent browser filter or the browser safety restriction.
