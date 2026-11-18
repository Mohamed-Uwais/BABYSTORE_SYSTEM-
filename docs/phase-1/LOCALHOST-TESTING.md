> Historical snapshot: setup/status statements below are not current. See CATALOGUE-AND-STUDIO.md for implemented controls and RELEASE-RUNBOOK.md for current release prerequisites.

# Localhost testing — ready for baseline review

Latest availability check, 16 November 2026: the website, POS and API ports returned ECONNREFUSED. These web servers are currently stopped. The earlier successful checks below are historical test results, not a claim of current availability. Use the isolated restart commands after confirming the independent MySQL instance is running.

Prepared 14 November 2026. This environment runs the existing application plus initial backend foundations. It is not the completed Phase 1 redesign. Configurable category filters and full Website Studio UI remain implementation work; their portable prototype is a separate review artifact.

## Local addresses

- Website: http://127.0.0.1:15174/
- Test shop: http://127.0.0.1:15174/shop
- POS: http://127.0.0.1:15173/login
- API: http://127.0.0.1:15001/api/health

Only the current PC can access these loopback listeners. They are not publicly deployed and are not phone-accessible URLs.

## Login and sample data

Use username `local_owner`. The generated test-only password is stored locally in `.staging/test-account.json` (ignored by Git). Do not use live credentials. A fictional LOCAL TEST Brand, LOCAL TEST Diapers category and LOCAL TEST Diapers M variant were created with ten units of test stock and a sample price. No production customers, orders, payment slips or stock values were copied.

## Isolation and preparation

- Dependencies installed at the versions pinned by each project's lockfile. Install lifecycle scripts were disabled.
- Full local staging backup saved as `.staging/before-localhost.sql` before parity DDL.
- Added missing VPS structures/columns to the verified local test instance; aligned website-critical order statuses, blog excerpt and product-image definitions.
- Staging-only Studio tables and history retained. Broader POS definitions are not claimed fully identical to production.
- API uses `.staging/backend.env`, separate JWT/database credentials and a minimal child environment. Outbound TCP destinations are restricted to the isolated local database/API ports. No live service credentials were inherited.
- Frontend launchers refuse environment files and set APP_ENV=staging, forcing separate loopback ports/proxies. Regular dev defaults are not used for this session.
- Studio APIs remain disabled until their POS interface is integrated. Existing content edits within this test environment affect only test content.

## Verification completed

- Website and POS served HTTP 200 on their local ports.
- Website proxy returned the fictional product from the isolated database.
- Test owner authenticated successfully through the POS proxy.
- Authenticated /me, /catalog/categories, /settings/content and /products checks returned successful responses.
- All 32 backend tests passed, including staging network/configuration guards and draft/publication service tests.
- Browser confirmed the local shop and fictional catalogue controls, plus the POS login screen. Full UI workflows, mobile layouts, printing and checkout/concurrent stock testing are not yet complete.
- Screenshot: `.staging/localhost-shop.png`.

## Review sequence

1. Browse the local shop, open the fictional product and inspect cart behaviour.
2. Log into the local POS with the test account; check inventory and current Website Content screen.
3. Record baseline defects separately from features still to implement.
4. Add further synthetic fixtures for toys, décor, variant combinations and unavailable/hidden items during category-filter implementation.
5. Complete stock, checkout, retry, receipt and publication tests before acceptance. Localhost success alone does not establish production performance or release readiness.

## Restart commands

From this isolated checkout, after verifying the independent MySQL instance is running, use separate terminals:

```powershell
node scripts/start-staging-api.cjs
node scripts/start-local-frontend.cjs website
node scripts/start-local-frontend.cjs pos
```

These processes were started and checked during the initial localhost setup; restart them only when stopped. Do not launch duplicates. Frontends use strict ports and will refuse occupied ports. Stop a server with Ctrl+C in its owning terminal when testing is finished. The MySQL instance has its own lifecycle; do not reinitialise its data directory to restart it.

No live website/POS deployment has been made. Production launch requires the owner's separate explicit approval after the full Phase 1 package is complete.
