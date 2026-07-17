import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import client from '../api/client';
import { useToast } from '../context/ToastContext';
import PageWrapper from '../components/PageWrapper';
import BarcodeScanner from '../components/BarcodeScanner';
import EmptyState from '../components/EmptyState';

function ScanIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
      <line x1="7" y1="12" x2="17" y2="12" />
    </svg>
  );
}

const STATUS_STYLES = {
  placed: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  paid: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  shipped: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  received: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function Purchasing() {
  const toast = useToast();
  const [suppliers, setSuppliers] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [products, setProducts] = useState([]);

  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ name: '', contact_person: '', phone: '', email: '' });
  const [showPOForm, setShowPOForm] = useState(false);
  const [poSupplierId, setPoSupplierId] = useState('');
  const [poItems, setPoItems] = useState([]);
  const [variantPick, setVariantPick] = useState('');
  const [variantQty, setVariantQty] = useState(1);
  const [error, setError] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const [scanMessage, setScanMessage] = useState(null);
  const productsRef = useRef([]);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [s, ls, po, p] = await Promise.all([
      client.get('/suppliers'), client.get('/products/low-stock'),
      client.get('/purchase-orders'), client.get('/products'),
    ]);
    setSuppliers(s.data.data); setLowStock(ls.data.data);
    setPurchaseOrders(po.data.data); setProducts(p.data.data);
    productsRef.current = p.data.data;
  }

  const handlePoScan = useCallback((code) => {
    const scanned = String(code).trim();
    const match = productsRef.current.find((p) => p.barcode && String(p.barcode).trim() === scanned);
    if (!match) { setScanMessage({ type: 'error', text: `Barcode not recognized: ${scanned}` }); return; }
    setPoItems((prev) => {
      const existing = prev.find((l) => l.variant_id === match.variant_id);
      if (existing) return prev.map((l) => (l.variant_id === match.variant_id ? { ...l, quantity: l.quantity + 1 } : l));
      return [...prev, { variant_id: match.variant_id, sku: match.sku, variant_label: match.variant_label, product_name: match.name, quantity: 1 }];
    });
    setScanMessage({ type: 'success', text: `Added: ${match.name} · ${match.variant_label}` });
  }, []);

  async function submitSupplier(e) {
    e.preventDefault(); setError('');
    try {
      await client.post('/suppliers', supplierForm);
      setSupplierForm({ name: '', contact_person: '', phone: '', email: '' });
      setShowSupplierForm(false); loadAll(); toast.success('Supplier added');
    } catch (err) { setError(err.response?.data?.message ?? 'Could not create supplier'); }
  }

  function addPoItem() {
    const variant = products.find((p) => String(p.variant_id) === variantPick);
    if (!variant || variantQty <= 0) return;
    setPoItems((prev) => {
      if (prev.some((l) => l.variant_id === variant.variant_id)) return prev;
      return [...prev, { variant_id: variant.variant_id, sku: variant.sku, variant_label: variant.variant_label, product_name: variant.name, quantity: variantQty }];
    });
    setVariantPick(''); setVariantQty(1);
  }

  function reorderFromLowStock(row) {
    setShowPOForm(true);
    setPoItems((prev) => {
      if (prev.some((l) => l.variant_id === row.variant_id)) return prev;
      return [...prev, { variant_id: row.variant_id, sku: row.sku, variant_label: row.variant_label, product_name: row.product_name, quantity: Number(row.suggested_reorder_qty) || 1 }];
    });
  }

  async function submitPO(e) {
    e.preventDefault(); setError('');
    if (!poSupplierId) return setError('Select a supplier');
    if (!poItems.length) return setError('Add at least one item');
    try {
      await client.post('/purchase-orders', { supplier_id: Number(poSupplierId), items: poItems.map((l) => ({ variant_id: l.variant_id, quantity: l.quantity })) });
      setPoItems([]); setPoSupplierId(''); setShowPOForm(false); loadAll(); toast.success('Purchase order created');
    } catch (err) { setError(err.response?.data?.message ?? 'Could not create purchase order'); }
  }

  const ic = 'rounded-xl border border-slate-200 px-2.5 py-1.5 text-sm outline-none transition focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white';

  return (
    <PageWrapper className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {lowStock.length > 0 && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-900/10">
              <h2 className="mb-3 text-sm font-semibold text-amber-800 dark:text-amber-400">Low stock ({lowStock.length})</h2>
              <div className="space-y-2">
                {lowStock.map((row) => (
                  <div key={row.variant_id} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm dark:bg-slate-900">
                    <div><span className="font-medium text-slate-900 dark:text-white">{row.product_name}</span><span className="text-slate-500 dark:text-slate-400"> · {row.variant_label} · <span className="font-mono">{row.sku}</span></span></div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-red-600 dark:text-red-400">{row.current_stock} left</span>
                      <span className="text-slate-400">suggest {row.suggested_reorder_qty}</span>
                      <button onClick={() => reorderFromLowStock(row)}
                        className="rounded-lg border border-amber-300 px-2.5 py-1 text-xs font-medium text-amber-800 transition hover:bg-amber-100 active:scale-[0.97] dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/30">Reorder</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {error && <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</div>}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Suppliers ({suppliers.length})</h2>
              <button onClick={() => setShowSupplierForm((v) => !v)} className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
                {showSupplierForm ? 'Cancel' : '+ Add supplier'}
              </button>
            </div>
            <AnimatePresence>
              {showSupplierForm && (
                <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  onSubmit={submitSupplier} className="mb-4 grid grid-cols-1 gap-3 overflow-hidden rounded-xl border border-slate-200 p-3 dark:border-slate-700 sm:grid-cols-2">
                  <input required placeholder="Supplier name" value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} className={ic} />
                  <input placeholder="Contact person" value={supplierForm.contact_person} onChange={(e) => setSupplierForm({ ...supplierForm, contact_person: e.target.value })} className={ic} />
                  <input placeholder="Phone" value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} className={ic} />
                  <input placeholder="Email" value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} className={ic} />
                  <button type="submit" className="col-span-full rounded-xl bg-brand-600 py-1.5 text-sm font-medium text-white transition hover:bg-brand-700 active:scale-[0.98]">Save supplier</button>
                </motion.form>
              )}
            </AnimatePresence>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {suppliers.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-medium text-slate-900 dark:text-white">{s.name}</span>
                  <span className="text-slate-500 dark:text-slate-400">{s.contact_person} {s.phone && `· ${s.phone}`}</span>
                </div>
              ))}
              {suppliers.length === 0 && <EmptyState icon="🏭" title="No suppliers yet" description="Add your first supplier" />}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Purchase orders ({purchaseOrders.length})</h2>
              <button onClick={() => setShowPOForm((v) => !v)} className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
                {showPOForm ? 'Cancel' : '+ New PO'}
              </button>
            </div>
            <AnimatePresence>
              {showPOForm && (
                <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  onSubmit={submitPO} className="mb-4 space-y-3 overflow-hidden rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <select required value={poSupplierId} onChange={(e) => setPoSupplierId(e.target.value)} className={`${ic} w-full`}>
                    <option value="">Select supplier...</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <select value={variantPick} onChange={(e) => setVariantPick(e.target.value)} className={`${ic} flex-1`}>
                      <option value="">Select product variant...</option>
                      {products.map((p) => <option key={p.variant_id} value={p.variant_id}>{p.name} - {p.variant_label} ({p.sku})</option>)}
                    </select>
                    <input type="number" min="1" value={variantQty} onChange={(e) => setVariantQty(Number(e.target.value))} className={`${ic} w-20`} />
                    <button type="button" onClick={addPoItem} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">Add</button>
                    <button type="button" onClick={() => { setScanMessage(null); setScanOpen(true); }}
                      className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-700 active:scale-[0.97]"><ScanIcon />Scan</button>
                  </div>
                  {poItems.length > 0 && (
                    <div className="space-y-1.5">
                      {poItems.map((l) => (
                        <div key={l.variant_id} className="flex items-center justify-between rounded-xl bg-slate-50 px-2.5 py-1.5 text-sm dark:bg-slate-800">
                          <span className="text-slate-700 dark:text-slate-300">{l.product_name} · {l.variant_label} · qty {l.quantity}</span>
                          <button type="button" onClick={() => setPoItems(prev => prev.filter(i => i.variant_id !== l.variant_id))} className="text-slate-400 hover:text-red-500">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button type="submit" className="w-full rounded-xl bg-brand-600 py-1.5 text-sm font-medium text-white transition hover:bg-brand-700 active:scale-[0.98]">Create purchase order</button>
                </motion.form>
              )}
            </AnimatePresence>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {purchaseOrders.map((po) => (
                <Link key={po.id} to={`/purchasing/${po.id}`} className="flex items-center justify-between py-2.5 text-sm transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <div><span className="font-mono font-medium text-slate-900 dark:text-white">{po.po_number}</span><span className="text-slate-500 dark:text-slate-400"> · {po.supplier_name}</span></div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[po.status]}`}>{po.status}</span>
                </Link>
              ))}
              {purchaseOrders.length === 0 && <EmptyState icon="📝" title="No purchase orders" description="Create your first PO" />}
            </div>
          </section>
        </div>
      </div>

      {scanOpen && (
        <BarcodeScanner title="Scan variant barcode" hint="Scan a product barcode to add it as a PO line item." onDetected={handlePoScan} onClose={() => setScanOpen(false)}>
          {scanMessage && (
            <div className={`mt-3 rounded-xl px-3 py-2 text-sm ${scanMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'}`}>{scanMessage.text}</div>
          )}
        </BarcodeScanner>
      )}
    </PageWrapper>
  );
}
