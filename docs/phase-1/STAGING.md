> Historical snapshot: setup/status statements below are not current. See CATALOGUE-AND-STUDIO.md for implemented controls and RELEASE-RUNBOOK.md for current release prerequisites.

# Local staging — configured, application launch pending

Update, 14 November 2026: the owner requested localhost testing. Local API, website and POS are now started with isolated launchers, fictional test data and no production credentials. See LOCALHOST-TESTING.md for current URLs, verification and limitations. The initial setup notes below describe the state before this localhost increment.

## Verified state

- Separate managed worktree; original checkout and production code/deployment are untouched.
- Independent MySQL process, bound to `127.0.0.1:13307`, with separate `.staging/mysql-data` directory.
- Database `littora_phase1_staging`; generated application user is restricted to that database. Independent root/JWT secrets generated locally, not copied from live.
- Ignored `.staging/` holds credentials, process metadata and database files. Do not share or commit it. No secret values are printed in this document or test output.
- Canonical repository schema imported without seed rows/accounts. Additive migrations 017/018 loaded into this test database only. Historic migration compatibility still needs mapping against the deployed schema.
- Real MySQL content tests passed: instance identity, empty business tables, concurrent draft conflicts, draft isolation, publication history and restore-to-draft. Only synthetic STAGING TEST website content was inserted. No customers, products, stock, orders or payments imported.
- Backend, website, POS, chatbot and external integrations are not running. No production database or service was contacted.

## Safe API launch preparation

Use `node scripts/start-staging-api.cjs` from this checkout only, after installing/reusing the checked dependency versions and reviewing schema compatibility. Do not launch the ordinary application against an inherited production environment.

The launcher loads `.staging/backend.env` with a minimal child environment, rejects a backend `.env`, and loads a TCP guard before application dependencies. Only the isolated DB/API ports are allowed; external services and other local DB/API ports are blocked. Staging API binds loopback only. Notifications, couriers and payment services have no copied credentials. The Studio feature flag remains disabled pending UI integration. Existing configuration flags alone do not provide isolation; the launcher and guard must be used together.

Storefront/POS Vite configurations now select loopback-only ports 15174/15173 and API port 15001 when APP_ENV=staging. Ordinary development defaults remain unchanged. No frontend server has been started. Set APP_ENV=staging before browser testing; do not point test frontends at live domains or the existing local API.

## Access needed next

No live login or database password is needed for the synthetic local setup. To verify deployment compatibility later, provide the deployed commit/version, a schema-only export (no rows), migration inventory and service names/versions. A sanitised catalogue/content export is useful for realistic performance and filtering tests. Real customers, addresses, payment slips, access tokens and order histories are not required at this stage.

Secure handoff: place reviewed schema/export files in this checkout's ignored `.staging/imports/` directory and share the file path, not database credentials or SQL contents in chat. If remote inspection becomes necessary, use a temporary least-privilege review account through an agreed secure credential-sharing channel; revoke it after use. Never commit exports or secrets.

## Limitations and next checks

The local database is isolated but does not yet establish full application parity, staff logins, website access or a complete staging shopping journey. Compare canonical/deployed schemas before adding missing tables. Populate clearly fictional test users/catalogue only. Verify uploads stay in this checkout and configure both frontend proxies before app launch. Test payment/courier/notification blocking before exercising orders. Do not run the chatbot. Back up staging before subsequent migration rehearsals.

`.staging/instance.json` records the local MySQL PID and data path. It is a local process, not a Windows service. It may need an explicitly reviewed restart after reboot; setup refuses to reinitialise an existing directory. Do not delete/reinitialise its data to restart it. Production launch remains a separate owner approval.
