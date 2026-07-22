import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import client from '../api/client';
import PageWrapper, { staggerContainer, fadeUp } from '../components/PageWrapper';
import { useToast } from '../context/ToastContext';

export default function StockToggle() {
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState({});
  const { addToast } = useToast();

  useEffect(() => { fetchVariants(); }, []);

  async function fetchVariants() {
    try {
      const res = await client.get('/inventory/variants');
      setVariants(res.data.data);
    } catch { addToast('Failed to load variants', 'error'); }
    finally { setLoading(false); }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return variants;
    const q = search.toLowerCase();
    return variants.filter(v =>
      v.product_name.toLowerCase().includes(q) ||
      v.sku.toLowerCase().includes(q) ||
      (v.variant_label || '').toLowerCase().includes(q)
    );
  }, [variants, search]);

  async function handleToggle(variant, newStock) {
    const val = parseInt(newStock, 10);
    if (isNaN(val) || val < 0) return;
    setSaving(s => ({ ...s, [variant.variant_id]: true }));
    try {
      await client.post('/inventory/stock-toggle', { variant_id: variant.variant_id, new_stock: val });
      setVariants(prev => prev.map(v =>
        v.variant_id === variant.variant_id ? { ...v, current_stock: val } : v
      ));
      addToast(`${variant.product_name} stock updated to ${val}`, 'success');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update stock', 'error');
    } finally {
      setSaving(s => ({ ...s, [variant.variant_id]: false }));
    }
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <PageWrapper className="flex flex-1 flex-col overflow-hidden">
        <div className="mx-auto w-full max-w-2xl shrink-0 space-y-4 px-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Quick Stock</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Tap to adjust stock levels</p>
            </div>
          </div>
          <input
            type="text"
            placeholder="Search by name, SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-brand-500 dark:focus:ring-brand-900/30"
          />
        </div>
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-4 pb-4 pt-4">

          {loading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <motion.div variants={fadeUp} className="rounded-xl border border-dashed border-slate-300 py-12 text-center dark:border-slate-700">
              <p className="text-sm text-slate-400 dark:text-slate-500">No variants found</p>
            </motion.div>
          ) : (
            <div className="space-y-2">
              {filtered.map(v => (
                <motion.div
                  key={v.variant_id}
                  variants={fadeUp}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                      {v.product_name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {v.variant_label} &middot; <span className="font-mono">{v.sku}</span>
                    </p>
                  </div>
                  <div className="ml-3 flex items-center gap-2">
                    <button
                      disabled={saving[v.variant_id] || v.current_stock <= 0}
                      onClick={() => handleToggle(v, v.current_stock - 1)}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-lg font-bold text-slate-600 transition hover:bg-slate-50 active:scale-95 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={v.current_stock}
                      onChange={e => handleToggle(v, e.target.value)}
                      className={`h-10 w-16 rounded-lg border text-center font-mono text-sm font-semibold outline-none transition ${
                        v.current_stock <= 5
                          ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'
                          : 'border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white'
                      }`}
                    />
                    <button
                      disabled={saving[v.variant_id]}
                      onClick={() => handleToggle(v, v.current_stock + 1)}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-lg font-bold text-slate-600 transition hover:bg-slate-50 active:scale-95 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      +
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </PageWrapper>
    </div>
  );
}
