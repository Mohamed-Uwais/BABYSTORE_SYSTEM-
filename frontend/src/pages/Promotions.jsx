import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PageWrapper from '../components/PageWrapper';
import EmptyState from '../components/EmptyState';

const PROMO_TYPES = [
  { value: 'percentage_discount', label: 'Percentage Discount', icon: '🏷️', desc: 'X% off selected products' },
  { value: 'fixed_discount', label: 'Fixed Discount', icon: '💰', desc: 'Rs. X off selected products' },
  { value: 'buy_x_get_y', label: 'Buy X Get Y', icon: '🎁', desc: 'Buy 2 get 1 free' },
  { value: 'bundle_deal', label: 'Bundle Deal', icon: '📦', desc: 'Buy these together for a special price' },
  { value: 'coupon_code', label: 'Coupon Code', icon: '🎟️', desc: 'Customers enter a code for a discount' },
  { value: 'free_delivery', label: 'Free Delivery', icon: '🚚', desc: 'Free delivery on qualifying orders' },
];

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'expired', label: 'Expired' },
];

const BANNER_COLORS = [
  { value: '#ef4444', label: 'Red' },
  { value: '#f59e0b', label: 'Orange' },
  { value: '#10b981', label: 'Green' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
];

function getStatus(promo) {
  const now = new Date();
  const start = new Date(promo.starts_at);
  const end = new Date(promo.ends_at);
  if (!promo.is_active) return { label: 'Inactive', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' };
  if (now < start) return { label: 'Scheduled', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
  if (now > end) return { label: 'Expired', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
  return { label: 'Active', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' });
}

function generateCouponCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

const ic = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-brand-500';

export default function Promotions() {
  const { user } = useAuth();
  const toast = useToast();
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [detailData, setDetailData] = useState(null);

  const fetchPromos = useCallback(async () => {
    try {
      const r = await client.get('/promotions', { params: { status: statusFilter || undefined } });
      setPromos(r.data.data);
    } catch { toast.error('Failed to load promotions'); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetchPromos(); }, [fetchPromos]);

  function handleCreate() { setEditing(null); setShowForm(true); }
  function handleEdit(promo) { setEditing(promo); setShowForm(true); }

  async function handleToggleHomepage(promo) {
    try {
      await client.put(`/promotions/${promo.id}`, { ...promo, show_on_homepage: !promo.show_on_homepage });
      toast.success(promo.show_on_homepage ? 'Removed from homepage' : 'Added to homepage');
      fetchPromos();
    } catch { toast.error('Failed to update'); }
  }

  async function handleDeactivate(id) {
    try {
      await client.delete(`/promotions/${id}`);
      toast.success('Promotion deactivated');
      fetchPromos();
    } catch { toast.error('Failed to deactivate'); }
  }

  async function openDetail(id) {
    setDetailId(id);
    try {
      const r = await client.get(`/promotions/${id}/stats`);
      setDetailData(r.data.data);
    } catch { toast.error('Failed to load stats'); }
  }

  if (showForm) {
    return (
      <PageWrapper className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">
        <PromoForm
          existing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); fetchPromos(); }}
        />
      </PageWrapper>
    );
  }

  if (detailId && detailData) {
    return (
      <PageWrapper className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">
        <PromoDetail data={detailData} onClose={() => { setDetailId(null); setDetailData(null); }} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Promotions</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Manage discounts, coupons, and offers</p>
            </div>
            <button onClick={handleCreate}
              className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.97]">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
              Create Promotion
            </button>
          </div>

          <div className="mb-4 flex gap-1.5">
            {STATUS_TABS.map(t => (
              <button key={t.value} onClick={() => setStatusFilter(t.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  statusFilter === t.value
                    ? 'bg-brand-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => <div key={i} className="h-40 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />)}
            </div>
          ) : promos.length === 0 ? (
            <EmptyState icon="🏷️" title="No promotions yet" description="Create your first promotion to start driving sales" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {promos.map(p => {
                const status = getStatus(p);
                const typeInfo = PROMO_TYPES.find(t => t.value === p.promo_type);
                return (
                  <motion.div key={p.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{typeInfo?.icon}</span>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{p.title}</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{typeInfo?.desc}</p>
                        </div>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${status.color}`}>{status.label}</span>
                    </div>

                    <div className="mb-3 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <span>{fmtDate(p.starts_at)} — {fmtDate(p.ends_at)}</span>
                    </div>

                    {p.discount_value && (
                      <div className="mb-3">
                        <span className="rounded-lg bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-900/20 dark:text-brand-400">
                          {p.promo_type === 'percentage_discount' ? `${p.discount_value}% OFF` :
                           p.promo_type === 'fixed_discount' ? `Rs. ${Number(p.discount_value).toLocaleString()} OFF` :
                           p.promo_type === 'coupon_code' ? `Code: ${p.coupon_code}` : ''}
                        </span>
                      </div>
                    )}

                    {p.promo_type === 'buy_x_get_y' && (
                      <div className="mb-3">
                        <span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                          Buy {p.buy_quantity} Get {p.get_quantity} Free
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span>{p.usage_count || 0} uses</span>
                        <button onClick={() => handleToggleHomepage(p)}
                          className={`flex items-center gap-1 transition ${p.show_on_homepage ? 'text-brand-600 dark:text-brand-400' : 'hover:text-slate-600'}`}>
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill={p.show_on_homepage ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                            <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" />
                          </svg>
                          {p.show_on_homepage ? 'On homepage' : 'Homepage'}
                        </button>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openDetail(p.id)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800" title="Stats">
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6m8 0V9a2 2 0 012-2h2a2 2 0 012 2v10m4 0v-4a2 2 0 00-2-2h-2a2 2 0 00-2 2v4" /></svg>
                        </button>
                        <button onClick={() => handleEdit(p)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800" title="Edit">
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        {status.label === 'Active' && (
                          <button onClick={() => handleDeactivate(p.id)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20" title="Deactivate">
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" /></svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}

function PromoForm({ existing, onClose, onSaved }) {
  const toast = useToast();
  const [step, setStep] = useState(existing ? 1 : 0);
  const [saving, setSaving] = useState(false);

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    client.get('/catalog/categories').then(r => setCategories(r.data.data || [])).catch(() => {});
    client.get('/catalog/brands').then(r => setBrands(r.data.data || [])).catch(() => {});
    client.get('/products').then(r => setProducts(r.data.data || [])).catch(() => {});
  }, []);

  const [form, setForm] = useState(() => {
    if (existing) {
      return {
        promo_type: existing.promo_type,
        title: existing.title || '',
        description: existing.description || '',
        discount_value: existing.discount_value || '',
        buy_quantity: existing.buy_quantity || 2,
        get_quantity: existing.get_quantity || 1,
        bundle_price: existing.bundle_price || '',
        coupon_code: existing.coupon_code || '',
        max_uses: existing.max_uses || '',
        min_order_amount: existing.min_order_amount || '',
        target_type: 'all',
        target_ids: [],
        bundle_items: [],
        starts_at: existing.starts_at ? new Date(existing.starts_at).toISOString().slice(0, 16) : '',
        ends_at: existing.ends_at ? new Date(existing.ends_at).toISOString().slice(0, 16) : '',
        start_now: false,
        is_active: existing.is_active !== false,
        banner_text: existing.banner_text || '',
        banner_color: existing.banner_color || '#3b82f6',
        show_on_homepage: existing.show_on_homepage || false,
      };
    }
    return {
      promo_type: '', title: '', description: '',
      discount_value: '', buy_quantity: 2, get_quantity: 1,
      bundle_price: '', coupon_code: '', max_uses: '',
      min_order_amount: '', target_type: 'all', target_ids: [],
      bundle_items: [],
      starts_at: '', ends_at: '', start_now: true,
      is_active: true,
      banner_text: '', banner_color: '#3b82f6', show_on_homepage: false,
    };
  });

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const typeInfo = PROMO_TYPES.find(t => t.value === form.promo_type);

  function addBundleItem(variant) {
    if (form.bundle_items.some(bi => bi.variant_id === variant.variant_id)) return;
    set('bundle_items', [...form.bundle_items, {
      variant_id: variant.variant_id,
      product_name: variant.name || variant.product_name,
      variant_label: variant.variant_label,
      retail_price: variant.retail_price,
      quantity: 1,
    }]);
  }

  function updateBundleQty(vid, qty) {
    set('bundle_items', form.bundle_items.map(bi =>
      bi.variant_id === vid ? { ...bi, quantity: Math.max(1, qty) } : bi
    ));
  }

  function removeBundleItem(vid) {
    set('bundle_items', form.bundle_items.filter(bi => bi.variant_id !== vid));
  }

  const bundleRegularPrice = form.bundle_items.reduce((s, bi) => s + Number(bi.retail_price) * bi.quantity, 0);

  async function handleSave(asDraft = false) {
    setSaving(true);
    try {
      const targets = [];
      if (form.target_type === 'all') {
        targets.push({ target_type: 'all', target_id: null });
      } else {
        form.target_ids.forEach(id => targets.push({ target_type: form.target_type, target_id: id }));
      }

      const payload = {
        title: form.title,
        description: form.description,
        promo_type: form.promo_type,
        discount_value: form.discount_value || null,
        buy_quantity: form.promo_type === 'buy_x_get_y' ? form.buy_quantity : null,
        get_quantity: form.promo_type === 'buy_x_get_y' ? form.get_quantity : null,
        bundle_price: form.promo_type === 'bundle_deal' ? form.bundle_price : null,
        coupon_code: form.promo_type === 'coupon_code' ? form.coupon_code : null,
        max_uses: form.promo_type === 'coupon_code' && form.max_uses ? Number(form.max_uses) : null,
        min_order_amount: form.min_order_amount || null,
        starts_at: form.start_now ? new Date().toISOString().slice(0, 19).replace('T', ' ') : form.starts_at?.replace('T', ' '),
        ends_at: form.ends_at?.replace('T', ' '),
        is_active: asDraft ? false : form.is_active,
        banner_text: form.banner_text || form.title,
        banner_color: form.banner_color,
        show_on_homepage: form.show_on_homepage,
        targets,
        bundle_items: form.promo_type === 'bundle_deal' ? form.bundle_items.map(bi => ({
          variant_id: bi.variant_id, quantity: bi.quantity,
        })) : [],
      };

      if (existing) {
        await client.put(`/promotions/${existing.id}`, payload);
        toast.success('Promotion updated');
      } else {
        await client.post('/promotions', payload);
        toast.success(asDraft ? 'Saved as draft' : 'Promotion created');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  }

  const canGoNext = () => {
    if (step === 0) return !!form.promo_type;
    if (step === 1) {
      if (!form.title.trim()) return false;
      if (['percentage_discount', 'fixed_discount'].includes(form.promo_type) && !form.discount_value) return false;
      if (form.promo_type === 'coupon_code' && (!form.coupon_code || !form.discount_value)) return false;
      if (form.promo_type === 'bundle_deal' && (form.bundle_items.length < 2 || !form.bundle_price)) return false;
      return true;
    }
    if (step === 2) return form.ends_at && (form.start_now || form.starts_at);
    return true;
  };

  const STEPS = ['Type', 'Configure', 'Schedule', 'Display', 'Review'];

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <button onClick={onClose} className="mb-1 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 19l-7-7 7-7" /></svg>
              Back to list
            </button>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {existing ? 'Edit Promotion' : 'Create Promotion'}
            </h1>
          </div>
        </div>

        <div className="mb-6 flex items-center gap-1">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <button onClick={() => i <= step && setStep(i)} disabled={i > step}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  i === step ? 'bg-brand-600 text-white' :
                  i < step ? 'bg-brand-100 text-brand-700 hover:bg-brand-200 dark:bg-brand-900/30 dark:text-brand-400' :
                  'bg-slate-100 text-slate-400 dark:bg-slate-800'
                }`}>
                <span className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold bg-white/20">{i + 1}</span>
                <span className="hidden sm:inline">{s}</span>
              </button>
              {i < STEPS.length - 1 && <div className="mx-1 h-px w-4 bg-slate-200 dark:bg-slate-700" />}
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          {step === 0 && (
            <div>
              <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">Choose Promotion Type</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {PROMO_TYPES.map(t => (
                  <motion.button key={t.value} whileTap={{ scale: 0.97 }}
                    onClick={() => { set('promo_type', t.value); if (!form.title) set('title', ''); }}
                    className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                      form.promo_type === t.value
                        ? 'border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-900/20'
                        : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                    }`}>
                    <span className="text-2xl">{t.icon}</span>
                    <div>
                      <p className={`text-sm font-semibold ${form.promo_type === t.value ? 'text-brand-700 dark:text-brand-300' : 'text-slate-700 dark:text-slate-300'}`}>{t.label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{t.desc}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Configure {typeInfo?.label}</h2>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Promotion Title *</label>
                <input type="text" value={form.title} onChange={e => set('title', e.target.value)} className={ic}
                  placeholder={`e.g. ${typeInfo?.desc}`} />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Description (optional)</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)} className={ic} rows={2} />
              </div>

              {['percentage_discount', 'fixed_discount', 'coupon_code'].includes(form.promo_type) && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Discount Value * {form.promo_type === 'percentage_discount' || (form.promo_type === 'coupon_code' && Number(form.discount_value) <= 100) ? '(%)' : '(Rs.)'}
                  </label>
                  <input type="number" value={form.discount_value} onChange={e => set('discount_value', e.target.value)} className={ic}
                    placeholder={form.promo_type === 'percentage_discount' ? 'e.g. 20' : 'e.g. 500'} min="0" />
                </div>
              )}

              {form.promo_type === 'coupon_code' && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Coupon Code *</label>
                    <div className="flex gap-2">
                      <input type="text" value={form.coupon_code} onChange={e => set('coupon_code', e.target.value.toUpperCase())}
                        className={`${ic} flex-1 font-mono uppercase`} placeholder="e.g. SAVE20" />
                      <button onClick={() => set('coupon_code', generateCouponCode())}
                        className="rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">
                        Generate
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Max Uses (blank = unlimited)</label>
                    <input type="number" value={form.max_uses} onChange={e => set('max_uses', e.target.value)} className={ic} placeholder="100" min="1" />
                  </div>
                </>
              )}

              {form.promo_type === 'buy_x_get_y' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Buy Quantity</label>
                    <input type="number" value={form.buy_quantity} onChange={e => set('buy_quantity', Number(e.target.value))} className={ic} min="1" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Get Free Quantity</label>
                    <input type="number" value={form.get_quantity} onChange={e => set('get_quantity', Number(e.target.value))} className={ic} min="1" />
                  </div>
                  <p className="col-span-2 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                    Customers buy {form.buy_quantity} items and get {form.get_quantity} free. The cheapest qualifying item is free.
                  </p>
                </div>
              )}

              {form.promo_type === 'bundle_deal' && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Bundle Items (add 2+ products)</label>
                  <select className={`${ic} mb-2`} value="" onChange={e => {
                    const v = products.find(p => p.variant_id === Number(e.target.value));
                    if (v) addBundleItem(v);
                  }}>
                    <option value="">Add product to bundle...</option>
                    {products.map(p => (
                      <option key={p.variant_id} value={p.variant_id}>
                        {p.name} — {p.variant_label} (Rs. {Number(p.retail_price).toLocaleString()})
                      </option>
                    ))}
                  </select>
                  {form.bundle_items.length > 0 && (
                    <div className="space-y-2">
                      {form.bundle_items.map(bi => (
                        <div key={bi.variant_id} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-800/50">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-300">{bi.product_name}</p>
                            <p className="text-[10px] text-slate-400">{bi.variant_label} · Rs. {Number(bi.retail_price).toLocaleString()}</p>
                          </div>
                          <input type="number" value={bi.quantity} onChange={e => updateBundleQty(bi.variant_id, Number(e.target.value))}
                            className="w-14 rounded-lg border border-slate-200 px-2 py-1 text-center text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white" min="1" />
                          <button onClick={() => removeBundleItem(bi.variant_id)} className="text-slate-400 hover:text-red-500">
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      ))}
                      <div className="flex items-center justify-between rounded-lg bg-brand-50 p-2 dark:bg-brand-900/20">
                        <span className="text-xs text-slate-600 dark:text-slate-400">Regular: Rs. {bundleRegularPrice.toLocaleString()}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Bundle Price:</span>
                          <input type="number" value={form.bundle_price} onChange={e => set('bundle_price', e.target.value)}
                            className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-right font-mono text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder="0" />
                        </div>
                      </div>
                      {form.bundle_price && (
                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          Save Rs. {(bundleRegularPrice - Number(form.bundle_price)).toLocaleString()}!
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {form.promo_type === 'free_delivery' && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Minimum Order Amount (Rs.)</label>
                  <input type="number" value={form.min_order_amount} onChange={e => set('min_order_amount', e.target.value)} className={ic}
                    placeholder="e.g. 5000" min="0" />
                </div>
              )}

              {!['bundle_deal', 'free_delivery'].includes(form.promo_type) && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Apply To</label>
                  <select value={form.target_type} onChange={e => { set('target_type', e.target.value); set('target_ids', []); }} className={ic}>
                    <option value="all">All Products</option>
                    <option value="category">Specific Category</option>
                    <option value="brand">Specific Brand</option>
                    <option value="product">Specific Products</option>
                  </select>

                  {form.target_type === 'category' && (
                    <select className={`${ic} mt-2`} value={form.target_ids[0] || ''} onChange={e => set('target_ids', [Number(e.target.value)])}>
                      <option value="">Select category...</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  )}
                  {form.target_type === 'brand' && (
                    <select className={`${ic} mt-2`} value={form.target_ids[0] || ''} onChange={e => set('target_ids', [Number(e.target.value)])}>
                      <option value="">Select brand...</option>
                      {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  )}
                  {form.target_type === 'product' && (
                    <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                      {products.map(p => (
                        <label key={p.variant_id} className="flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-slate-50 dark:hover:bg-slate-800">
                          <input type="checkbox" checked={form.target_ids.includes(p.product_id)}
                            onChange={e => {
                              const ids = e.target.checked
                                ? [...new Set([...form.target_ids, p.product_id])]
                                : form.target_ids.filter(id => id !== p.product_id);
                              set('target_ids', ids);
                            }} />
                          <span className="text-slate-700 dark:text-slate-300">{p.name} — {p.variant_label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {['percentage_discount', 'fixed_discount', 'coupon_code'].includes(form.promo_type) && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Minimum Order Amount (optional, Rs.)</label>
                  <input type="number" value={form.min_order_amount} onChange={e => set('min_order_amount', e.target.value)} className={ic}
                    placeholder="No minimum" min="0" />
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Schedule</h2>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input type="checkbox" checked={form.start_now} onChange={e => set('start_now', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                Start immediately
              </label>
              {!form.start_now && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Start Date & Time *</label>
                  <input type="datetime-local" value={form.starts_at} onChange={e => set('starts_at', e.target.value)} className={ic} />
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">End Date & Time *</label>
                <input type="datetime-local" value={form.ends_at} onChange={e => set('ends_at', e.target.value)} className={ic} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Display Settings</h2>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input type="checkbox" checked={form.show_on_homepage} onChange={e => set('show_on_homepage', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                Show banner on website homepage
              </label>
              {form.show_on_homepage && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Banner Text</label>
                    <input type="text" value={form.banner_text || form.title} onChange={e => set('banner_text', e.target.value)} className={ic} />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-400">Banner Color</label>
                    <div className="flex gap-2">
                      {BANNER_COLORS.map(c => (
                        <button key={c.value} onClick={() => set('banner_color', c.value)}
                          className={`h-8 w-8 rounded-full transition-all ${form.banner_color === c.value ? 'ring-2 ring-offset-2 ring-brand-500 scale-110' : 'hover:scale-105'}`}
                          style={{ backgroundColor: c.value }} title={c.label} />
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl p-4 text-center text-sm font-semibold text-white" style={{ backgroundColor: form.banner_color }}>
                    {form.banner_text || form.title}
                  </div>
                </>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Review</h2>
              <div className="space-y-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{typeInfo?.icon}</span>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{form.title}</p>
                    <p className="text-xs text-slate-500">{typeInfo?.label}</p>
                  </div>
                </div>
                {form.description && <p className="text-sm text-slate-600 dark:text-slate-400">{form.description}</p>}

                <div className="grid gap-2 text-xs sm:grid-cols-2">
                  {form.discount_value && (
                    <div className="rounded-lg bg-white p-2 dark:bg-slate-800">
                      <span className="text-slate-400">Discount:</span>{' '}
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {form.promo_type === 'percentage_discount' ? `${form.discount_value}%` : `Rs. ${Number(form.discount_value).toLocaleString()}`}
                      </span>
                    </div>
                  )}
                  {form.coupon_code && (
                    <div className="rounded-lg bg-white p-2 dark:bg-slate-800">
                      <span className="text-slate-400">Code:</span>{' '}
                      <span className="font-mono font-medium text-brand-600 dark:text-brand-400">{form.coupon_code}</span>
                    </div>
                  )}
                  {form.promo_type === 'buy_x_get_y' && (
                    <div className="rounded-lg bg-white p-2 dark:bg-slate-800">
                      <span className="text-slate-400">Deal:</span>{' '}
                      <span className="font-medium text-slate-700 dark:text-slate-300">Buy {form.buy_quantity} Get {form.get_quantity} Free</span>
                    </div>
                  )}
                  {form.bundle_price && (
                    <div className="rounded-lg bg-white p-2 dark:bg-slate-800">
                      <span className="text-slate-400">Bundle:</span>{' '}
                      <span className="font-medium text-slate-700 dark:text-slate-300">Rs. {Number(form.bundle_price).toLocaleString()}</span>
                      <span className="ml-1 text-slate-400 line-through">Rs. {bundleRegularPrice.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="rounded-lg bg-white p-2 dark:bg-slate-800">
                    <span className="text-slate-400">Schedule:</span>{' '}
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {form.start_now ? 'Now' : fmtDate(form.starts_at)} — {fmtDate(form.ends_at)}
                    </span>
                  </div>
                  <div className="rounded-lg bg-white p-2 dark:bg-slate-800">
                    <span className="text-slate-400">Applies to:</span>{' '}
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {form.target_type === 'all' ? 'All Products' : `${form.target_ids.length} ${form.target_type}(s)`}
                    </span>
                  </div>
                </div>

                {form.show_on_homepage && (
                  <div className="rounded-xl p-3 text-center text-sm font-semibold text-white" style={{ backgroundColor: form.banner_color }}>
                    {form.banner_text || form.title}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          {step > 0 ? (
            <button onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 19l-7-7 7-7" /></svg>
              Back
            </button>
          ) : <div />}

          {step < 4 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={!canGoNext()}
              className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.97] disabled:opacity-40">
              Continue
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => handleSave(true)} disabled={saving}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">
                Save as Draft
              </button>
              <button onClick={() => handleSave(false)} disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.97] disabled:opacity-50">
                {saving && <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                {existing ? 'Update' : 'Activate Now'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PromoDetail({ data, onClose }) {
  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6">
      <div className="mx-auto max-w-3xl">
        <button onClick={onClose} className="mb-4 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 19l-7-7 7-7" /></svg>
          Back to list
        </button>

        <h1 className="mb-6 text-xl font-bold text-slate-900 dark:text-white">{data.title} — Stats</h1>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard label="Times Used" value={data.times_used || 0} />
          <StatCard label="Orders Affected" value={data.order_count || 0} />
          <StatCard label="Total Discount Given" value={`Rs. ${Number(data.total_discount || 0).toLocaleString()}`} />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Recent Usage</h3>
          </div>
          {data.recent_usage?.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-400">No usage yet</div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-slate-800">
              {data.recent_usage?.map(u => (
                <div key={u.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {u.order_number} {u.customer_name && <span className="text-slate-400">· {u.customer_name}</span>}
                    </p>
                    <p className="text-xs text-slate-400">{fmtDate(u.used_at)}</p>
                  </div>
                  <span className="font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    −Rs. {Number(u.discount_applied).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}
