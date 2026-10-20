# Littora Phase 1 stability changes

Implemented locally on 2026-09-10. No deployment, production database writes,
historical reconciliation, dependency upgrades, image work, or redesign performed.
Normal page layouts are unchanged. New messages only appear during failure/recovery.

## Significant changes

| Area | Change and reason | Main files |
| --- | --- | --- |
| Authentication | Check the current active account and role. Database outages return 503 rather than 401. Preserve the stored token on temporary failures, offer session retry, and wait for session restoration before default navigation. Ignore old-account responses after account changes. | backend/src/middleware/authMiddleware.js; frontend/src/context/AuthContext.jsx; frontend/src/api/client.js; frontend/src/App.jsx; frontend/src/components/PermissionRoute.jsx |
| Checkout retries | Browser submits a persistent per-attempt UUID, retained after a failed response. Concurrent clicks share one request. The database records the key/hash/order in the order transaction and replays successful results. Successful completion clears the browser key so the next identical legitimate sale remains possible. | frontend/src/api/requestSafety.js; website/src/api/requestSafety.js; backend/src/utils/checkoutRequest.js; backend/src/models/orderModel.js |
| Checkout correctness | Normalize numeric inputs, reject malformed quantities/payments, check combined quantities for repeated variants, and derive cashier identity from the session. Preserve zero-balance settlements. Save payment-slip metadata before commit. | backend/src/utils/validateOrder.js; backend/src/controllers/orderController.js; backend/src/models/orderModel.js |
| Website checkout | Use catalog/tier pricing and the existing promotion calculator, including free delivery. Atomically find/create customers by their existing unique phone key. Replay completed requests before re-evaluating expired promotions. Create receiver details needed by delivery tools. | backend/src/controllers/publicController.js |
| Stock lifecycle | Acceptance accounts for legacy chatbot deductions instead of deducting twice. Rejection restores recorded pending-order deductions within a transaction. Chatbot creation locks/checks stock and cancellation restores recorded stock in a transaction. Tier/delivery arithmetic uses numeric values. No historical balances are rewritten. | backend/src/models/orderModel.js; chatbot/src/services/orderService.js; chatbot/src/ai/toolExecutor.js |
| Exchanges | The existing return and replacement routines can join a single transaction. The POS sends one return/exchange operation containing the replacement. Replacement failure rolls back the return. Pure returns remain supported. | backend/src/models/orderModel.js; backend/src/controllers/orderController.js; frontend/src/pages/Billing.jsx |
| Receiving/repayment | Read and validate current status/balance under a transaction lock before stock/ledger writes. Repeated receipt of an already received PO does not add stock again. | backend/src/models/purchaseOrderModel.js; backend/src/models/customerModel.js |
| Numbering | Use bounded MySQL advisory locks around main order creation and chatbot order creation to prevent concurrent number allocation collisions within each numbering format. Locks are released on completion/failure. | backend/src/models/orderModel.js; chatbot/src/services/orderService.js |
| Requests/loaders | Deduplicate concurrent GETs without caching completed data; scope POS sharing to the current token. Abort obsolete storefront search/fee/promotion work. Debounce Shop search. Catch key POS loader failures and reliably finish loading states. Suppress report-only alert polling for unauthorized users. | Both API clients; Shop.jsx; Checkout.jsx; Billing.jsx; Orders.jsx; Inventory.jsx; Purchasing.jsx; PurchaseOrderDetail.jsx; Dashboard.jsx; Sidebar.jsx |
| Runtime recovery | Add provider-level error boundaries, remove automatic error redirects, validate saved cart shape, tolerate cart-storage write failure, clean up payment-slip previews, and define the missing toast.warning method using existing toast styling. Fix barcode pricing's stale callback. | Both main.jsx files and ErrorBoundary.jsx components; CartContext.jsx; ToastContext.jsx; Billing.jsx |
| API/database compatibility | Fix customer-export column aliases and grouped catalog price sorting, normalize order-list limits, and allow authenticated store-metadata reads needed by cashier receipts while retaining settings-write checks. Add a courier request deadline. | insightController.js; publicModel.js; orderModel.js; server.js; koombiyoService.js |
| Logging | Remove complete checkout payload logs, add request correlation/timing without query strings or bodies, redact unexpected API errors, and handle chatbot startup rejection explicitly. | backend/src/server.js; backend/src/middleware/errorHandler.js; orderController.js; chatbot/src/server.js |

## Required schema addition

`database/migrations/017_checkout_requests.sql` adds one independent InnoDB table.
It stores a request key, payload hash, committed order ID, and creation timestamp.
It does not alter existing business tables or require historical backfill.

Durable retry protection cannot be implemented reliably using only a disabled
button or a process-local cache. The table is therefore required for this change.
The migration has NOT been executed against any database during this work.

## Validation completed

- `frontend`: `npm run lint` and `npm run build` passed.
- `website`: `npm run lint` and `npm run build` passed.
- `backend`: `npm test` passed, 20 tests.
- All backend and chatbot source JavaScript files passed `node --check`.
- Existing unused-code/hook lint warnings remain. The POS build still warns about
  its large bundle; code splitting and image optimization are outside Phase 1.

Tests cover numeric validation, split/zero payments, authentication outages and
disabled accounts, duplicate request replay/conflicts, browser timeout retries,
concurrent GET sharing, stock aggregation, rollback/connection release, payment-slip
commit order, chatbot acceptance, atomic exchange success/failure, website promotions,
and repayment locking.

The database-facing tests use isolated mocks. They do not establish production
MySQL lock behavior, migration compatibility, or a full browser/payment/courier E2E pass.
No production credentials or services are used by the tests.

## Safe rollout

1. Take a verified backup and use a restored staging database. Confirm the deployed
   baseline and existing migrations, including payment-slip and stock-history columns.
2. Apply migration 017 in staging, then run the targeted tests and the checks below.
   Do not blindly replay all legacy schema or repair scripts.
3. Check two simultaneous sales of the last units, repeated submission with the same
   key, a lost response after commit, a changed payload with a reused key, simultaneous
   receiving and repayment, and API restart followed by a retry.
4. Check website COD/bank transfer, tier quantities, coupon/free-delivery checkout,
   payment-slip upload, POS split payments, wholesale barcode scanning, zero-balance
   exchange, and a deliberately failed replacement. Confirm totals and stock/ledger
   movements against the staging database.
5. Check account deactivation, temporary DB outage/recovery, cashier receipt settings,
   dashboard/purchasing/inventory API failures, and rapid Shop/zone changes in a browser.
6. Deploy the additive migration first, then backend, then both frontends and chatbot.
   The new exchange frontend requires the updated backend; do not reverse this order.
   Drain old backend workers before enabling the new clients, since old workers do
   not participate in submission-key protection or the new number lock.
7. Monitor checkout errors, lock-wait duration, and duplicate/stock reports. Advisory
   locks serialize order creation for each format; measure throughput before scaling.

For rollback, restore the previous frontend before restoring its backend. Keep the
additive request table and its records; do not drop it or run balance repairs as part
of rollback. Database changes made by legitimate completed sales remain valid data.

## Scope limits

This is a targeted stability release, not a claim that every audit finding is fixed.
Durable replay applies to website checkout and POS sale checkout. Other legacy
clients without keys and independent chatbot messages still need separate deduplication.
Pure returns/exchanges are atomic/quantity-checked but do not have durable result replay.
Browser keys survive retries within the tab/session; independently started orders in
different tabs are separate attempts. No automatic write retries were added.

Financial report definitions, historical stock/credit corrections, comprehensive
refund/settlement/quotation workflows, broad permission redesign, webhook authenticity,
chatbot ownership authorization, upload/print security hardening, and performance work
remain separate audit follow-ups. Those existing risks should still inform deployment
readiness. No later phase has been started.
