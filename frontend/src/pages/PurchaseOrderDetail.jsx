import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import client from '../api/client';
import { useToast } from '../context/ToastContext';
import PageWrapper from '../components/PageWrapper';

const STATUS_STYLES = {
  placed: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  paid: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  shipped: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  received: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function money(n) {
  return `Rs. ${Number(n || 0).toFixed(2)}`;
}

const ic = 'rounded-xl border border-slate-200 px-2.5 py-1.5 text-sm outline-none transition focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white';

export default function PurchaseOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [po, setPo] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [transportCharge, setTransportCharge] = useState('0');
  const [costs, setCosts] = useState({});

  const [editing, setEditing] = useState(false);
  const [editSupplier, setEditSupplier] = useState('');
  const [editItems, setEditItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [allVariants, setAllVariants] = useState([]);
  const [variantSearch, setVariantSearch] = useState('');

  const [editingCosts, setEditingCosts] = useState(false);
  const [editCosts, setEditCosts] = useState({});
  const [editTransport, setEditTransport] = useState('0');

  useEffect(() => { load(); }, [id]);

  async function load() {
    try {
      const res = await client.get(`/purchase-orders/${id}`);
      setPo(res.data.data);
      setEditing(false);
      setEditingCosts(false);
    } catch (err) { setError(err.response?.data?.message ?? 'Could not load purchase order'); }
  }

  function startEditPlaced() {
    setEditSupplier(String(po.supplier_id));
    setEditItems(po.items.map(it => ({ variant_id: it.variant_id, quantity: it.quantity, label: `${it.product_name} · ${it.variant_label}` })));
    setEditing(true);
    Promise.all([
      client.get('/suppliers'),
      client.get('/products'),
    ]).then(([s, p]) => {
      setSuppliers(s.data.data);
      const variants = [];
      for (const row of p.data.data) {
        if (row.variant_id) variants.push({ variant_id: row.variant_id, sku: row.sku, label: `${row.name} · ${row.variant_label}` });
      }
      setAllVariants(variants);
    });
  }

  function startEditCosts() {
    const c = {};
    for (const it of po.items) c[it.id] = String(it.unit_cost_price || 0);
    setEditCosts(c);
    setEditTransport(String(po.transport_charge || 0));
    setEditingCosts(true);
  }

  async function saveEditPlaced() {
    setError(''); setBusy(true);
    try {
      await client.put(`/purchase-orders/${id}`, {
        supplier_id: Number(editSupplier),
        items: editItems.map(it => ({ variant_id: it.variant_id, quantity: Number(it.quantity) })),
      });
      toast.success('Purchase order updated');
      await load();
    } catch (err) { setError(err.response?.data?.message ?? 'Update failed'); }
    finally { setBusy(false); }
  }

  async function saveEditCosts() {
    setError(''); setBusy(true);
    try {
      await client.patch(`/purchase-orders/${id}/costs`, {
        transport_charge: parseFloat(editTransport) || 0,
        items: po.items.map(it => ({ item_id: it.id, unit_cost_price: parseFloat(editCosts[it.id]) || 0 })),
      });
      toast.success('Costs updated');
      await load();
    } catch (err) { setError(err.response?.data?.message ?? 'Update failed'); }
    finally { setBusy(false); }
  }

  async function submitPay(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      await client.patch(`/purchase-orders/${id}/pay`, {
        transport_charge: parseFloat(transportCharge) || 0,
        items: po.items.map((it) => ({ item_id: it.id, unit_cost_price: parseFloat(costs[it.id]) || 0 })),
      });
      toast.success('Payment confirmed');
      await load();
    } catch (err) { setError(err.response?.data?.message ?? 'Could not mark as paid'); }
    finally { setBusy(false); }
  }

  async function doShip() {
    setError(''); setBusy(true);
    try { await client.patch(`/purchase-orders/${id}/ship`); toast.success('Marked as shipped'); await load(); }
    catch (err) { setError(err.response?.data?.message ?? 'Could not mark as shipped'); }
    finally { setBusy(false); }
  }

  async function doReceive() {
    setError(''); setBusy(true);
    try { await client.patch(`/purchase-orders/${id}/receive`); toast.success('Stock received and updated'); await load(); }
    catch (err) { setError(err.response?.data?.message ?? 'Could not mark as received'); }
    finally { setBusy(false); }
  }

  async function doDelete() {
    setError('');
    try { await client.delete(`/purchase-orders/${id}`); toast.info('Purchase order deleted'); navigate('/purchasing'); }
    catch (err) { setError(err.response?.data?.message ?? 'Could not delete purchase order'); }
  }

  function whatsappShareUrl() {
    if (!po) return '#';
    const lines = [`*${po.po_number}* — ${po.supplier_name}`, '', ...po.items.map((it) => `• ${it.product_name} (${it.variant_label}) x${it.quantity}`), '', `Status: ${po.status}`];
    const phone = (po.supplier_phone || '').replace(/[^0-9]/g, '');
    return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`;
  }

  function addVariantToEdit(v) {
    if (editItems.some(it => it.variant_id === v.variant_id)) return;
    setEditItems(prev => [...prev, { variant_id: v.variant_id, quantity: 1, label: v.label }]);
    setVariantSearch('');
  }

  const filteredVariants = variantSearch.length >= 2
    ? allVariants.filter(v => v.label.toLowerCase().includes(variantSearch.toLowerCase()) || v.sku.toLowerCase().includes(variantSearch.toLowerCase())).slice(0, 8)
    : [];

  const canEdit = po?.status === 'placed' || po?.status === 'paid';

  if (!po) {
    return (
      <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">
        <div className="p-6 text-sm text-slate-400">{error || 'Loading...'}</div>
      </div>
    );
  }

  return (
    <PageWrapper className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl space-y-5">
          <button onClick={() => navigate('/purchasing')} className="text-sm text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-300">← Back to purchasing</button>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h1 className="font-mono text-lg font-semibold text-slate-900 dark:text-white">{po.po_number}</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">{po.supplier_name}{po.supplier_phone && ` · ${po.supplier_phone}`}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[po.status]}`}>{po.status}</span>
                {canEdit && !editing && !editingCosts && (
                  <button onClick={po.status === 'placed' ? startEditPlaced : startEditCosts}
                    className="rounded-xl border border-brand-200 px-3 py-1 text-xs font-medium text-brand-600 transition hover:bg-brand-50 dark:border-brand-800 dark:text-brand-400 dark:hover:bg-brand-900/20">
                    Edit
                  </button>
                )}
              </div>
            </div>

            {editing ? (
              <div className="space-y-3">
                <select value={editSupplier} onChange={(e) => setEditSupplier(e.target.value)} className={`${ic} w-full`}>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>

                <div className="space-y-2">
                  {editItems.map((it, idx) => (
                    <div key={it.variant_id} className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-300">{it.label}</span>
                      <input type="number" min="1" value={it.quantity}
                        onChange={(e) => setEditItems(prev => prev.map((x, i) => i === idx ? { ...x, quantity: e.target.value } : x))}
                        className={`${ic} w-20 text-right font-mono`} />
                      <button type="button" onClick={() => setEditItems(prev => prev.filter((_, i) => i !== idx))}
                        className="text-red-400 hover:text-red-600">×</button>
                    </div>
                  ))}
                </div>

                <div className="relative">
                  <input placeholder="Search products to add..." value={variantSearch} onChange={(e) => setVariantSearch(e.target.value)} className={`${ic} w-full`} />
                  {filteredVariants.length > 0 && (
                    <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                      {filteredVariants.map(v => (
                        <button key={v.variant_id} type="button" onClick={() => addVariantToEdit(v)}
                          className="w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700">
                          {v.label} <span className="font-mono text-slate-400">({v.sku})</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setEditing(false)} className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400">Cancel</button>
                  <button onClick={saveEditPlaced} disabled={busy || editItems.length === 0}
                    className="flex-1 rounded-xl bg-brand-600 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50">
                    {busy ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : editingCosts ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Edit cost prices & transport</p>
                {po.items.map((it) => (
                  <div key={it.id} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-600 dark:text-slate-400">{it.product_name} · {it.variant_label} <span className="font-mono text-slate-400">×{it.quantity}</span></span>
                    <input type="number" step="0.01" value={editCosts[it.id] ?? ''}
                      onChange={(e) => setEditCosts(prev => ({ ...prev, [it.id]: e.target.value }))}
                      className={`${ic} w-32 text-right font-mono`} />
                  </div>
                ))}
                <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Transport charge</span>
                  <input type="number" step="0.01" value={editTransport}
                    onChange={(e) => setEditTransport(e.target.value)}
                    className={`${ic} w-32 text-right font-mono`} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingCosts(false)} className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400">Cancel</button>
                  <button onClick={saveEditCosts} disabled={busy}
                    className="flex-1 rounded-xl bg-brand-600 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50">
                    {busy ? 'Saving...' : 'Save Costs'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                        <th className="pb-2">Item</th><th className="pb-2 text-right">Qty</th><th className="pb-2 text-right">Unit cost</th><th className="pb-2 text-right">Landed cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {po.items.map((it) => (
                        <tr key={it.id} className="border-b border-slate-50 dark:border-slate-800/50">
                          <td className="py-2 text-slate-700 dark:text-slate-300">{it.product_name} <span className="text-slate-400">· {it.variant_label}</span></td>
                          <td className="py-2 text-right font-mono dark:text-slate-300">{it.quantity}</td>
                          <td className="py-2 text-right font-mono text-slate-500 dark:text-slate-400">{it.unit_cost_price != null ? money(it.unit_cost_price) : '—'}</td>
                          <td className="py-2 text-right font-mono text-slate-500 dark:text-slate-400">{it.landed_unit_cost != null ? money(it.landed_unit_cost) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {po.transport_charge != null && <p className="mt-2 text-right font-mono text-xs text-slate-400">Transport charge: {money(po.transport_charge)}</p>}
              </>
            )}

            {!editing && !editingCosts && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <a href={whatsappShareUrl()} target="_blank" rel="noreferrer"
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">Share via WhatsApp</a>
                {po.status === 'placed' && (
                  <button onClick={doDelete} className="rounded-xl border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 active:scale-[0.97] dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-900/20">Delete PO</button>
                )}
              </div>
            )}
          </div>

          {error && <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</div>}

          {!editing && !editingCosts && po.status === 'placed' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Mark as paid</h2>
              <form onSubmit={submitPay} className="space-y-3">
                {po.items.map((it) => (
                  <div key={it.id} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-600 dark:text-slate-400">{it.product_name} · {it.variant_label}</span>
                    <input type="number" step="0.01" required placeholder="Unit cost" value={costs[it.id] ?? ''}
                      onChange={(e) => setCosts({ ...costs, [it.id]: e.target.value })} className={`${ic} w-32 text-right font-mono`} />
                  </div>
                ))}
                <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Transport charge (total)</span>
                  <input type="number" step="0.01" value={transportCharge} onChange={(e) => setTransportCharge(e.target.value)} className={`${ic} w-32 text-right font-mono`} />
                </div>
                <button type="submit" disabled={busy}
                  className="w-full rounded-xl bg-brand-600 py-2 text-sm font-medium text-white transition hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50">Confirm payment</button>
              </form>
            </div>
          )}

          {!editing && !editingCosts && po.status === 'paid' && (
            <button onClick={doShip} disabled={busy}
              className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50">Mark as shipped</button>
          )}

          {!editing && !editingCosts && po.status === 'shipped' && (
            <button onClick={doReceive} disabled={busy}
              className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50">Mark as received (adds stock)</button>
          )}

          {po.status === 'received' && (
            <p className="text-center text-sm text-emerald-600 dark:text-emerald-400">
              Received on {new Date(po.received_at).toLocaleString()} — stock has been updated.
            </p>
          )}
        </motion.div>
      </div>
    </PageWrapper>
  );
}
