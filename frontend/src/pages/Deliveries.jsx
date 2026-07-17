import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import client from '../api/client';
import { useToast } from '../context/ToastContext';
import PageWrapper, { staggerContainer, fadeUp } from '../components/PageWrapper';
import EmptyState from '../components/EmptyState';
import ShippingLabel from '../components/ShippingLabel';

function money(n) {
  return `Rs. ${Number(n || 0).toFixed(2)}`;
}

const STATUS_OPTIONS = ['confirmed', 'processing', 'packed', 'shipped', 'delivered'];

const STATUS_COLORS = {
  confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  processing: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  packed: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  shipped: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function Deliveries() {
  const toast = useToast();
  const [tab, setTab] = useState('active');
  const [koombiyoBusy, setKoombiyoBusy] = useState(null);
  const [koombiyoTrack, setKoombiyoTrack] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [methodFilter, setMethodFilter] = useState('');
  const [search, setSearch] = useState('');
  const [labelOrder, setLabelOrder] = useState(null);
  const [trackingModal, setTrackingModal] = useState(null);
  const [trackingInput, setTrackingInput] = useState('');
  const [statusModal, setStatusModal] = useState(null);
  const [statusInput, setStatusInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, [tab, methodFilter]);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ tab });
      if (methodFilter) params.set('method', methodFilter);
      const r = await client.get(`/deliveries?${params}`);
      setOrders(r.data.data || []);
    } catch { setOrders([]); }
    finally { setLoading(false); }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.toLowerCase();
    return orders.filter(o =>
      o.order_number?.toLowerCase().includes(q) ||
      o.customer_name?.toLowerCase().includes(q) ||
      o.receiver_name?.toLowerCase().includes(q) ||
      o.tracking_number?.toLowerCase().includes(q)
    );
  }, [orders, search]);

  const stats = useMemo(() => {
    const total = orders.length;
    const withTracking = orders.filter(o => o.tracking_number).length;
    const selfDelivery = orders.filter(o => o.fulfillment_type === 'self_delivery').length;
    const courier = orders.filter(o => o.fulfillment_type === 'courier_delivery').length;
    return { total, withTracking, selfDelivery, courier };
  }, [orders]);

  async function saveTracking() {
    if (!trackingModal || !trackingInput.trim()) return;
    setSaving(true);
    try {
      await client.put(`/deliveries/${trackingModal.id}/tracking`, { tracking_number: trackingInput.trim() });
      setTrackingModal(null);
      setTrackingInput('');
      load();
    } catch {} finally { setSaving(false); }
  }

  async function saveStatus() {
    if (!statusModal || !statusInput) return;
    setSaving(true);
    try {
      await client.put(`/insights/orders/${statusModal.id}/status`, { status: statusInput, notes: `Status updated to ${statusInput}` });
      setStatusModal(null);
      setStatusInput('');
      load();
    } catch {} finally { setSaving(false); }
  }

  function openTracking(order) {
    setTrackingInput(order.tracking_number || '');
    setTrackingModal(order);
  }

  function openStatus(order) {
    const nextIdx = STATUS_OPTIONS.indexOf(order.status);
    setStatusInput(STATUS_OPTIONS[Math.min(nextIdx + 1, STATUS_OPTIONS.length - 1)] || 'shipped');
    setStatusModal(order);
  }

  function getTrackUrl(order) {
    if (!order.tracking_number || !order.tracking_url_template) return null;
    return order.tracking_url_template.replace('{tracking_number}', order.tracking_number);
  }

  async function koombiyoCreateWaybill(order) {
    setKoombiyoBusy(order.id);
    try {
      const r = await client.post('/koombiyo/create-waybill', { order_id: order.id });
      if (r.data.data?.waybill_no) {
        toast.success(`Waybill created: ${r.data.data.waybill_no}`);
        load();
      } else {
        toast.error(r.data.data?.message || 'Waybill creation failed');
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Koombiyo API error'); }
    finally { setKoombiyoBusy(null); }
  }

  async function koombiyoTrackOrder(waybillNo) {
    try {
      const r = await client.get(`/koombiyo/track/${waybillNo}`);
      setKoombiyoTrack({ waybill: waybillNo, data: r.data.data });
    } catch (err) { toast.error('Could not track shipment'); }
  }

  async function koombiyoCancelWaybill(waybillNo) {
    try {
      await client.post(`/koombiyo/cancel/${waybillNo}`);
      toast.success('Shipment cancelled');
      load();
    } catch (err) { toast.error('Could not cancel shipment'); }
  }

  async function koombiyoPrintLabel(waybillNo) {
    try {
      const r = await client.get(`/koombiyo/label/${waybillNo}`);
      if (r.data.data?.url) window.open(r.data.data.url, '_blank');
    } catch { toast.error('Could not get label'); }
  }

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <PageWrapper className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <motion.div {...staggerContainer} className="mx-auto max-w-6xl">
          <motion.div {...fadeUp} className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Deliveries</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Track and manage all delivery orders</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                  className="w-48 rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div {...fadeUp} className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Total', value: stats.total, color: 'text-slate-900 dark:text-white' },
              { label: 'With Tracking', value: stats.withTracking, color: 'text-cyan-600 dark:text-cyan-400' },
              { label: 'Our Delivery', value: stats.selfDelivery, color: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Courier', value: stats.courier, color: 'text-blue-600 dark:text-blue-400' },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-xs text-slate-400">{s.label}</p>
                <p className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </motion.div>

          {/* Tabs + filters */}
          <motion.div {...fadeUp} className="mb-4 flex flex-wrap items-center gap-2">
            <button onClick={() => setTab('active')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${tab === 'active' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
              Active
            </button>
            <button onClick={() => setTab('completed')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${tab === 'completed' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
              Completed
            </button>
            <div className="mx-2 h-5 w-px bg-slate-200 dark:bg-slate-700" />
            <button onClick={() => setMethodFilter('')}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${!methodFilter ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
              All
            </button>
            <button onClick={() => setMethodFilter('our_delivery')}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${methodFilter === 'our_delivery' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
              Our Delivery
            </button>
            <button onClick={() => setMethodFilter('koombiyo')}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${methodFilter === 'koombiyo' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
              Koombiyo
            </button>
            <button onClick={() => setMethodFilter('fardar')}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${methodFilter === 'fardar' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
              Fardar
            </button>
          </motion.div>

          {/* Cards */}
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-40 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon="📦" title="No deliveries found" description={tab === 'active' ? 'No active delivery orders' : 'No completed deliveries'} />
          ) : (
            <motion.div {...staggerContainer} className="space-y-3">
              <AnimatePresence initial={false}>
                {filtered.map(order => (
                  <motion.div key={order.id} {...fadeUp} layout
                    className="rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    {/* Header row */}
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">{order.order_number}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLORS[order.status] || 'bg-slate-100 text-slate-600'}`}>
                            {order.status}
                          </span>
                          {order.fulfillment_type === 'self_delivery' ? (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">Our Delivery</span>
                          ) : order.courier_name ? (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">{order.courier_name}</span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-slate-400">{timeAgo(order.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm font-semibold text-slate-900 dark:text-white">{money(order.grand_total)}</p>
                        {order.delivery_fee > 0 && (
                          <p className="text-[10px] text-slate-400">Delivery: {money(order.delivery_fee)}</p>
                        )}
                      </div>
                    </div>

                    {/* Receiver info */}
                    <div className="mb-3 rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/50">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {order.receiver_name || order.customer_name || 'No receiver'}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {order.receiver_phone || order.customer_phone || ''}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {order.receiver_address || order.delivery_address || 'No address'}
                          </p>
                        </div>
                        {order.tracking_number && (
                          <div className="text-right">
                            <p className="text-[10px] text-slate-400">Tracking</p>
                            <p className="font-mono text-xs font-medium text-slate-700 dark:text-slate-300">{order.tracking_number}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Items */}
                    {order.items?.length > 0 && (
                      <div className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                        {order.items.slice(0, 3).map((item, i) => (
                          <span key={i}>{i > 0 ? ' · ' : ''}{item.quantity}x {item.product_name}</span>
                        ))}
                        {order.items.length > 3 && <span> +{order.items.length - 3} more</span>}
                      </div>
                    )}

                    {/* COD indicator */}
                    <div className="mb-3">
                      {order.delivery_fee > 0 && order.grand_total > 0 ? (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          COD {money(order.grand_total)}
                        </span>
                      ) : (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          PAID
                        </span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-1.5">
                      {order.fulfillment_type === 'courier_delivery' && (
                        <button onClick={() => openTracking(order)}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>
                          {order.tracking_number ? 'Edit Tracking' : 'Add Tracking'}
                        </button>
                      )}
                      {tab === 'active' && (
                        <button onClick={() => openStatus(order)}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                          Update Status
                        </button>
                      )}
                      <button onClick={() => setLabelOrder(order)}
                        className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2z" /></svg>
                        Print Label
                      </button>
                      {getTrackUrl(order) && (
                        <a href={getTrackUrl(order)} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1.5 text-xs font-medium text-cyan-700 transition hover:bg-cyan-100 dark:border-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" /></svg>
                          Track Parcel
                        </a>
                      )}
                      {/* Koombiyo actions */}
                      {!order.tracking_number && order.status !== 'delivered' && (
                        <button onClick={() => koombiyoCreateWaybill(order)} disabled={koombiyoBusy === order.id}
                          className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100 disabled:opacity-50 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                          {koombiyoBusy === order.id ? 'Creating...' : 'Koombiyo Waybill'}
                        </button>
                      )}
                      {order.tracking_number && order.courier_name?.toLowerCase().includes('koombiyo') && (
                        <>
                          <button onClick={() => koombiyoTrackOrder(order.tracking_number)}
                            className="flex items-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1.5 text-xs font-medium text-cyan-700 transition hover:bg-cyan-100 dark:border-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400">
                            Track (Koombiyo)
                          </button>
                          <button onClick={() => koombiyoPrintLabel(order.tracking_number)}
                            className="flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1.5 text-xs font-medium text-purple-700 transition hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
                            Thermal Label
                          </button>
                          {order.status !== 'delivered' && (
                            <button onClick={() => koombiyoCancelWaybill(order.tracking_number)}
                              className="flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:text-red-400">
                              Cancel Waybill
                            </button>
                          )}
                        </>
                      )}
                      {(order.receiver_phone || order.customer_phone) && (
                        <>
                          <a href={`tel:${order.receiver_phone || order.customer_phone}`}
                            className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                            Call
                          </a>
                          <a href={`https://wa.me/${(order.receiver_phone || order.customer_phone).replace(/[^0-9]/g, '')}`}
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700 transition hover:bg-green-100 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.612.638l4.71-1.247A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.94 9.94 0 01-5.39-1.584l-.386-.239-2.793.739.753-2.748-.262-.416A9.935 9.935 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                            WhatsApp
                          </a>
                        </>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Tracking modal */}
      <AnimatePresence>
        {trackingModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setTrackingModal(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="mx-4 w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900" onClick={e => e.stopPropagation()}>
              <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
                {trackingModal.tracking_number ? 'Edit' : 'Add'} Tracking — {trackingModal.order_number}
              </h3>
              <input type="text" value={trackingInput} onChange={e => setTrackingInput(e.target.value)}
                placeholder="Enter tracking number"
                className="mb-3 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                autoFocus />
              <div className="flex justify-end gap-2">
                <button onClick={() => setTrackingModal(null)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">Cancel</button>
                <button onClick={saveTracking} disabled={saving || !trackingInput.trim()}
                  className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status modal */}
      <AnimatePresence>
        {statusModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setStatusModal(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="mx-4 w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900" onClick={e => e.stopPropagation()}>
              <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
                Update Status — {statusModal.order_number}
              </h3>
              <p className="mb-2 text-xs text-slate-400">Current: <span className="font-medium text-slate-600 dark:text-slate-300">{statusModal.status}</span></p>
              <select value={statusInput} onChange={e => setStatusInput(e.target.value)}
                className="mb-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
              <div className="flex justify-end gap-2">
                <button onClick={() => setStatusModal(null)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">Cancel</button>
                <button onClick={saveStatus} disabled={saving}
                  className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Update'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Koombiyo tracking result modal */}
      <AnimatePresence>
        {koombiyoTrack && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setKoombiyoTrack(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="mx-4 w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900" onClick={e => e.stopPropagation()}>
              <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
                Koombiyo Tracking — {koombiyoTrack.waybill}
              </h3>
              <pre className="max-h-64 overflow-y-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {JSON.stringify(koombiyoTrack.data, null, 2)}
              </pre>
              <div className="mt-3 flex justify-end">
                <button onClick={() => setKoombiyoTrack(null)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-500 dark:border-slate-700">Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {labelOrder && <ShippingLabel order={labelOrder} onClose={() => setLabelOrder(null)} />}
    </PageWrapper>
  );
}
