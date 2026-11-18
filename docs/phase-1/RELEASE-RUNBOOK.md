# Phase 1 release prerequisites (not deployment authorization)

Keep production unchanged until the owner approves a specific release. Use the
existing isolated launchers for tests. Required additive migrations are 018–021;
do not run older migrations blindly against the deployed schema.

## Legacy orders and stock cutover

1. Obtain the actual deployed source/configuration and current schema; the recorded
   `2255375a5440b73894e3f1ef6b445a8fc48ff6e5` commit is not present locally.
2. Rehearse on a separate, authorized sanitized copy. The read-only
   `node scripts/audit-staging-reservations.cjs` reports pending orders by variant,
   with ordered quantity, net sale/refund deductions, active holds and classification.
   It deliberately cannot connect to production or modify stock.
3. Preferred cutover: resolve all legacy pending website orders using the verified
   existing accept/cancel workflow before enabling the new checkout. Reconcile
   physical stock with movements. Already-deducted orders must not deduct again;
   cancellations must only restore net quantities actually deducted. Refund,
   partial, duplicate or missing movement history requires manual reconciliation.
4. If pending orders must remain, review an explicit order/variant mapping first.
   Hold only confirmed outstanding undeducted quantities; do not update physical
   stock when creating holds. Lock variants in ID order, subtract existing holds,
   reject shortages and ambiguous histories, and insert idempotently in a transaction.
   No automatic backfill or reservation expiry is implemented or authorized.
5. During an approved maintenance window, pause ALL stock writers: website/POS,
   chatbot, imports and background jobs. Take a restorable DB backup and matching
   uploads/original-media backup. Repeat reconciliation against that snapshot.
6. Apply reviewed migrations/configuration, release API and existing chatbot stock
   guards together, verify totals/availability and retry/cancel/accept flows, then
   reopen writers. Do not serve the old stock-writing API alongside the new one.

Rollback before reopening can restore the matching backup/release. After new orders
exist, never blindly restore an old DB: pause writers and reconcile new orders,
payments and movements first. Retain additive tables and old frontend assets.

## Tracking protection

The app shares 30 requests/minute/IP across tracking and repeat orders, in memory
per process; restarts reset it. This is not a shared multi-process quota. Review
`deployment/tracking-rate-limit.nginx.conf` for one public Nginx host with multiple
API workers. Multiple ingress hosts need a shared rate-limit service instead.
Only loopback proxies are trusted by Express. Confirm API binding/firewall, exact
proxy locations, CDN real-IP handling and source-header replacement; test forged
forwarding headers and 429 responses before release. No topology is assumed verified.

## Git/release sequence

After local acceptance, review the diff and create a codex/ integration branch from
the then-current main. Apply only application source, tests, migrations, approved
deployment configuration and current technical docs. Preserve main's product image;
resolve existing main documentation collisions explicitly. Keep review-prototype/
and superseded phase1-staging/ copies outside the application deliverable. Do not
include .staging/, credentials, test database files, uploads or generated build files.
Run tests/builds and a migration/rollback rehearsal; review the exact commit and
configuration with the owner. Staging/design approval is not live-release approval.

After an explicitly approved release: verify real cache headers, HTTPS/proxy,
public robots/sitemap/canonical/favicon access, payment/courier integrations and
mobile/desktop performance. Search Console recrawl and Google's icon display are
separate from code correctness. No release is currently accepted or deployed.

## Acceptance freeze and outstanding verification

New features and redesign are frozen. Only agreed-scope defects and release
preparation continue; appearance approval does not resolve technical release gates.
The local browser safety stop prevents automated rendered-page measurements.
Lighthouse/Playwright launched through another tool must not bypass that stop.
Bundle sizes and HTTP availability are not LCP, CLS, INP or frame-rate evidence.
Homepage, shop, product and checkout still need permitted browser measurements,
with viewport, CPU/network throttling, cache state and repeat runs recorded.

Dependency review (18 November 2026): picomatch 2.3.2 (backend development chain)
and 4.0.7 (Vite build chains) are affected by GHSA-fc5q-39xc-vjpf. This is glob-pattern
CPU exhaustion; anymatch/chokidar/readdirp and fdir/tinyglobby/Vite/plugin-react
findings are inherited paths, not distinct application endpoint vulnerabilities.
The registry still lists 4.0.7 as latest. Backend development minimatch 10.2.6 is
affected by GHSA-g3hv-75wg-m249; the patched 11.x line is outside nodemon's allowed
major range. No forced override/downgrade is approved. Newer unrelated UI packages
are not security fixes for these findings and are held during acceptance.
Mitigation: keep build/dev services private, process only trusted build inputs,
serve frontend dist files rather than Vite, and omit development dependencies from
the deployed API. These measures reduce exposure but do not clear the advisories.

Minimum production comparison inputs (read-only): current deployed HEAD and
tracked-change filenames; metadata and tracked application source for recorded
commit 2255375a5440b73894e3f1ef6b445a8fc48ff6e5; current source differences if HEAD
changed; confirmation that the running API/web roots use that checkout/build.
Do not include .env, credentials, private keys, database rows or uploads. Metadata
alone cannot establish source parity. Also confirm API-worker/server count, Nginx
and CDN topology, listen addresses and forwarding-header handling using only the
relevant redacted configuration snippets, not full environment/process dumps.
