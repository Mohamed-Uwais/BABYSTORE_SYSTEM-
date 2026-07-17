import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import client from '../api/client';
import { useToast } from '../context/ToastContext';
import PageWrapper from '../components/PageWrapper';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { ListSkeleton } from '../components/Skeleton';
import ShippingLabel from '../components/ShippingLabel';
import OrderTimeline from '../components/OrderTimeline';

function money(n, symbol = 'Rs.') {
  return `${symbol} ${Number(n || 0).toFixed(2)}`;
}

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' });
}

const STATUS_STYLES = {
  pending: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  refunded: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  partially_refunded: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const PAYMENT_LABELS = {
  cash: 'Cash', card: 'Card', bank_transfer: 'Bank Transfer',
  store_credit: 'Store Credit', online_gateway: 'Online',
};

export default function Orders() {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [refundOpen, setRefundOpen] = useState(false);
  const [refundItem, setRefundItem] = useState(null);
  const [refundQty, setRefundQty] = useState(1);
  const [refundReason, setRefundReason] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundRestock, setRefundRestock] = useState(true);
  const [refundError, setRefundError] = useState('');
  const [refundSubmitting, setRefundSubmitting] = useState(false);

  const [showLabel, setShowLabel] = useState(false);
  const [couriers, setCouriers] = useState([]);
  const [assignCourier, setAssignCourier] = useState('');
  const [assignTracking, setAssignTracking] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    loadOrders();
    client.get('/couriers').then(r => setCouriers(r.data.data || [])).catch(() => {});
  }, []);

  async function loadOrders() {
    setLoading(true);
    const res = await client.get('/orders');
    setOrders(res.data.data);
    setLoading(false);
  }

  async function openOrder(id) {
    setDetailLoading(true);
    setRefundOpen(false);
    const res = await client.get(`/orders/${id}`);
    setSelectedOrder(res.data.data);
    setDetailLoading(false);
  }

  function getMaxReturnable(item) {
    if (!selectedOrder?.returns) return item.quantity;
    const returned = selectedOrder.returns
      .filter((r) => r.order_item_id === item.id)
      .reduce((sum, r) => sum + r.quantity, 0);
    return item.quantity - returned;
  }

  function startRefund(item) {
    const max = getMaxReturnable(item);
    if (max <= 0) return;
    setRefundItem(item);
    setRefundQty(1);
    setRefundReason('');
    const perUnit = Number(item.line_total) / item.quantity;
    setRefundAmount(perUnit.toFixed(2));
    setRefundRestock(true);
    setRefundError('');
    setRefundOpen(true);
  }

  async function submitRefund(e) {
    e.preventDefault();
    setRefundError('');
    setRefundSubmitting(true);
    try {
      await client.post(`/orders/${selectedOrder.id}/refund`, {
        order_item_id: refundItem.id,
        quantity: refundQty,
        reason: refundReason,
        refund_amount: parseFloat(refundAmount),
        restock: refundRestock,
      });
      setRefundOpen(false);
      toast.success('Refund processed successfully');
      await openOrder(selectedOrder.id);
      loadOrders();
    } catch (err) {
      setRefundError(err.response?.data?.message || 'Refund failed');
    } finally {
      setRefundSubmitting(false);
    }
  }

  async function handleAssignCourier() {
    if (!assignCourier || !selectedOrder) return;
    setAssigning(true);
    try {
      await client.post('/couriers/assign', {
        order_id: selectedOrder.id,
        courier_code: assignCourier,
        tracking_number: assignTracking || null,
      });
      toast.success('Courier assigned');
      await openOrder(selectedOrder.id);
      setAssignCourier('');
      setAssignTracking('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Assignment failed');
    } finally { setAssigning(false); }
  }

  function printRefundReceipt(ret) {
    const win = window.open('', '_blank', 'width=320,height=400');
    win.document.write(`<!DOCTYPE html><html><head><title>Refund Receipt</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', monospace; font-size: 11px; line-height: 1.6; width: 72mm; padding: 4mm; }
        .center { text-align: center; } .bold { font-weight: bold; }
        .sep { border-top: 1px dashed #000; margin: 4px 0; }
        .row { display: flex; justify-content: space-between; }
        @page { margin: 0; size: 80mm auto; }
      </style></head><body>
      <p class="center bold">REFUND RECEIPT</p><div class="sep"></div>
      <div class="row"><span>Order:</span><span>${selectedOrder.order_number}</span></div>
      <div class="row"><span>Date:</span><span>${fmtDate(ret.created_at)}</span></div>
      <div class="row"><span>Processed by:</span><span>${ret.processed_by_name || 'N/A'}</span></div>
      <div class="sep"></div>
      <p class="bold">${ret.product_name}</p><p>${ret.variant_label} · ${ret.sku}</p>
      <div class="row"><span>Qty returned:</span><span>${ret.quantity}</span></div>
      <div class="row"><span>Reason:</span><span>${ret.reason || '—'}</span></div>
      <div class="row"><span>Restocked:</span><span>${ret.restock ? 'Yes' : 'No'}</span></div>
      <div class="sep"></div>
      <div class="row bold"><span>REFUND AMOUNT</span><span>Rs. ${Number(ret.refund_amount).toFixed(2)}</span></div>
    </body></html>`);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  }

  return (
    <PageWrapper className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Left: order list */}
        <div className={`${selectedOrder ? 'hidden md:block' : ''} overflow-y-auto border-r border-slate-200 p-4 dark:border-slate-800 md:w-1/2 md:p-5`}>
          <h1 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Order history</h1>
          {loading ? <ListSkeleton /> : orders.length === 0 ? (
            <EmptyState icon="📋" title="No orders yet" description="Completed sales will appear here" />
          ) : (
            <div className="space-y-2">
              {orders.map((o) => (
                <button key={o.id} onClick={() => openOrder(o.id)}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition hover:shadow-sm ${
                    selectedOrder?.id === o.id ? 'border-brand-500 bg-brand-50 dark:border-brand-600 dark:bg-brand-900/20' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
                  }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-medium text-slate-900 dark:text-white">{o.order_number}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[o.status] || ''}`}>
                      {o.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>{fmtDate(o.created_at)}</span>
                    <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{money(o.grand_total)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: order detail */}
        <div className={`${selectedOrder ? '' : 'hidden md:block'} flex-1 overflow-y-auto p-4 md:p-5`}>
          {selectedOrder && (
            <button onClick={() => setSelectedOrder(null)} className="mb-3 text-xs text-brand-600 dark:text-brand-400 md:hidden">← Back to list</button>
          )}
          {detailLoading ? (
            <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" /></div>
          ) : !selectedOrder ? (
            <EmptyState icon="📦" title="Select an order" description="Click an order from the list to view details" />
          ) : (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-mono text-lg font-semibold text-slate-900 dark:text-white">{selectedOrder.order_number}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{fmtDate(selectedOrder.created_at)}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[selectedOrder.status] || ''}`}>
                  {selectedOrder.status.replace('_', ' ')}
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 dark:border-slate-700 dark:bg-slate-900">
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Order Timeline</h3>
                <OrderTimeline orderId={selectedOrder.id} fulfillmentType={selectedOrder.fulfillment_type} />
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Cashier</span><span className="text-slate-900 dark:text-white">{selectedOrder.cashier_name || '—'}</span></div>
                {selectedOrder.customer_name && (
                  <div className="mt-1 flex justify-between"><span className="text-slate-500 dark:text-slate-400">Customer</span><span className="text-slate-900 dark:text-white">{selectedOrder.customer_name} · {selectedOrder.customer_phone}</span></div>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Items</h3>
                <div className="space-y-2">
                  {selectedOrder.items.map((item) => {
                    const maxRet = getMaxReturnable(item);
                    return (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <div className="flex-1">
                          <p className="font-medium text-slate-900 dark:text-white">{item.product_name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{item.variant_label} · <span className="font-mono">{item.sku}</span> · qty {item.quantity} × <span className="font-mono">{money(item.unit_price)}</span></p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium text-slate-900 dark:text-white">{money(item.line_total)}</span>
                          {maxRet > 0 && !['refunded', 'cancelled'].includes(selectedOrder.status) && (
                            <button onClick={() => startRefund(item)} className="rounded-lg border border-red-200 px-2 py-0.5 text-xs font-medium text-red-600 transition hover:bg-red-50 active:scale-[0.97] dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-900/20">
                              Refund
                            </button>
                          )}
                          {maxRet <= 0 && <span className="text-xs text-orange-600 dark:text-orange-400">returned</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Subtotal</span><span className="font-mono">{money(selectedOrder.subtotal)}</span></div>
                {Number(selectedOrder.discount_total) > 0 && (
                  <div className="flex justify-between text-red-600 dark:text-red-400"><span>Discount</span><span className="font-mono">-{money(selectedOrder.discount_total)}</span></div>
                )}
                <div className="mt-1 flex justify-between font-semibold text-slate-900 dark:text-white"><span>Total</span><span className="font-mono">{money(selectedOrder.grand_total)}</span></div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Payments</h3>
                {selectedOrder.payments.map((p, i) => (
                  <div key={i} className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">{PAYMENT_LABELS[p.payment_method] || p.payment_method}</span><span className="font-mono dark:text-white">{money(p.amount)}</span></div>
                ))}
              </div>

              {/* Delivery & Courier */}
              {selectedOrder.fulfillment_type && selectedOrder.fulfillment_type !== 'pickup' && (
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Delivery</h3>
                  <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Type</span><span className="text-slate-900 dark:text-white">{selectedOrder.fulfillment_type.replace('_', ' ')}</span></div>
                  {selectedOrder.delivery_address && <div className="mt-1 flex justify-between"><span className="text-slate-500 dark:text-slate-400">Address</span><span className="text-slate-900 dark:text-white">{selectedOrder.delivery_address}</span></div>}
                  {Number(selectedOrder.delivery_fee) > 0 && <div className="mt-1 flex justify-between"><span className="text-slate-500 dark:text-slate-400">Fee</span><span className="font-mono text-slate-900 dark:text-white">{money(selectedOrder.delivery_fee)}</span></div>}
                  {selectedOrder.delivery && (
                    <div className="mt-2 rounded-lg bg-slate-50 p-2 dark:bg-slate-800/50">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {selectedOrder.delivery.receiver_name && <span>To: {selectedOrder.delivery.receiver_name} </span>}
                        {selectedOrder.delivery.tracking_number && <span className="font-mono">· #{selectedOrder.delivery.tracking_number}</span>}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Courier assignment + shipping label */}
              <div className="flex flex-wrap gap-2">
                {couriers.length > 0 && (
                  <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
                    <select value={assignCourier} onChange={e => setAssignCourier(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                      <option value="">Assign courier...</option>
                      {couriers.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>
                    <input type="text" placeholder="Tracking #" value={assignTracking} onChange={e => setAssignTracking(e.target.value)}
                      className="w-28 rounded-lg border border-slate-200 px-2 py-1.5 font-mono text-xs outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                    <button onClick={handleAssignCourier} disabled={!assignCourier || assigning}
                      className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-40">
                      {assigning ? '...' : 'Assign'}
                    </button>
                  </div>
                )}
                <button onClick={() => setShowLabel(true)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">
                  Shipping Label
                </button>
              </div>

              {selectedOrder.returns?.length > 0 && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 dark:border-orange-900/40 dark:bg-orange-900/10">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400">Returns</h3>
                  {selectedOrder.returns.map((r) => (
                    <div key={r.id} className="mb-2 flex items-start justify-between rounded-lg bg-white p-2 text-sm last:mb-0 dark:bg-slate-900">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{r.product_name} · {r.variant_label}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">qty {r.quantity} · {r.reason || 'No reason'} · {r.restock ? 'restocked' : 'not restocked'}</p>
                        <p className="text-xs text-slate-400">{fmtDate(r.created_at)} by {r.processed_by_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-orange-700 dark:text-orange-400">{money(r.refund_amount)}</span>
                        <button onClick={() => printRefundReceipt(r)} className="rounded-lg border border-slate-200 px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Print</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Refund modal */}
      <Modal open={refundOpen && !!refundItem} onClose={() => setRefundOpen(false)} title="Process refund">
        {refundItem && (
          <form onSubmit={submitRefund} className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
              <p className="font-medium text-slate-900 dark:text-white">{refundItem.product_name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{refundItem.variant_label} · <span className="font-mono">{refundItem.sku}</span></p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Line total: <span className="font-mono">{money(refundItem.line_total)}</span> · Max returnable: {getMaxReturnable(refundItem)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Quantity</label>
                <input type="number" min="1" max={getMaxReturnable(refundItem)} value={refundQty}
                  onChange={(e) => { const q = Number(e.target.value); setRefundQty(q); setRefundAmount((Number(refundItem.line_total) / refundItem.quantity * q).toFixed(2)); }}
                  required className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Refund amount</label>
                <input type="number" step="0.01" min="0" max={refundItem.line_total} value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)} required
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Reason</label>
              <input type="text" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder="Customer changed mind, defective, etc."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={refundRestock} onChange={(e) => setRefundRestock(e.target.checked)} className="rounded" />
              Return items to stock
            </label>
            {refundError && <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{refundError}</div>}
            <button type="submit" disabled={refundSubmitting}
              className="w-full rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 active:scale-[0.98] disabled:opacity-50">
              {refundSubmitting ? 'Processing...' : 'Process refund'}
            </button>
          </form>
        )}
      </Modal>

      {showLabel && selectedOrder && (
        <ShippingLabel order={selectedOrder} onClose={() => setShowLabel(false)} />
      )}
    </PageWrapper>
  );
}
