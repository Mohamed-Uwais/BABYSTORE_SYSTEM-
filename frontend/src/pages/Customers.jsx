import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PageWrapper from '../components/PageWrapper';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { ListSkeleton } from '../components/Skeleton';

function money(n) { return `Rs. ${Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`; }

const TIER_STYLES = {
  none: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  silver: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  gold: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  platinum: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const TYPE_STYLES = {
  walk_in: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  loyalty: 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400',
};

const STATUS_COLORS = {
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  refunded: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  partially_refunded: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
};

export default function Customers() {
  const { user } = useAuth();
  const toast = useToast();

  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState('orders');

  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [form, setForm] = useState({ phone: '', full_name: '', email: '', address: '', city: '', customer_type: 'walk_in' });
  const [formError, setFormError] = useState('');
  const [formSaving, setFormSaving] = useState(false);

  const [repayOpen, setRepayOpen] = useState(false);
  const [repayAmount, setRepayAmount] = useState('');
  const [repayNote, setRepayNote] = useState('');
  const [repayMethod, setRepayMethod] = useState('cash');
  const [repaySaving, setRepaySaving] = useState(false);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await client.get('/customers');
      setCustomers(res.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  async function loadDetail(id) {
    setSelected(id);
    setDetailLoading(true);
    setDetailTab('orders');
    try {
      const res = await client.get(`/customers/${id}`);
      setDetail(res.data.data);
    } catch (e) { console.error(e); }
    finally { setDetailLoading(false); }
  }

  const filtered = customers.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (c.full_name || '').toLowerCase().includes(q) || (c.phone || '').includes(q);
  });

  function openAddForm() {
    setEditingCustomer(null);
    setForm({ phone: '', full_name: '', email: '', address: '', city: '', customer_type: 'walk_in' });
    setFormError('');
    setFormOpen(true);
  }

  function openEditForm() {
    if (!detail) return;
    setEditingCustomer(detail);
    setForm({ phone: detail.phone || '', full_name: detail.full_name || '', email: detail.email || '', address: detail.address || '', city: detail.city || '', customer_type: detail.customer_type });
    setFormError('');
    setFormOpen(true);
  }

  async function saveForm(e) {
    e.preventDefault();
    if (!form.phone.trim()) { setFormError('Phone number is required'); return; }
    setFormSaving(true);
    setFormError('');
    try {
      if (editingCustomer) {
        await client.put(`/customers/${editingCustomer.id}`, form);
        toast.success('Customer updated');
      } else {
        await client.post('/customers', form);
        toast.success('Customer added');
      }
      setFormOpen(false);
      await fetchCustomers();
      if (editingCustomer) await loadDetail(editingCustomer.id);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save customer');
    } finally { setFormSaving(false); }
  }

  async function handleConvertLoyalty() {
    if (!detail) return;
    try {
      await client.patch(`/customers/${detail.id}/convert-loyalty`);
      toast.success('Converted to loyalty member');
      await fetchCustomers();
      await loadDetail(detail.id);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to convert'); }
  }

  function openRepayment(customerOverride) {
    const target = customerOverride || detail;
    if (customerOverride && customerOverride.id !== detail?.id) {
      loadDetail(customerOverride.id);
    }
    setRepayAmount('');
    setRepayNote('');
    setRepayMethod('cash');
    setRepayOpen(true);
  }

  async function submitRepayment(e) {
    e.preventDefault();
    const amt = parseFloat(repayAmount);
    if (!amt || amt <= 0) return;
    setRepaySaving(true);
    const methodLabel = { cash: 'Cash', card: 'Card', bank_transfer: 'Bank Transfer' }[repayMethod] || repayMethod;
    const note = [methodLabel, repayNote].filter(Boolean).join(' — ');
    try {
      await client.post(`/customers/${detail.id}/repayment`, { amount: amt, notes: note });
      setRepayOpen(false);
      const remaining = Math.max(0, Math.abs(Number(detail.credit_balance)) - amt);
      toast.success(`Payment of ${money(amt)} recorded. Remaining balance: ${money(remaining)}`);
      await fetchCustomers();
      await loadDetail(detail.id);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to record repayment'); }
    finally { setRepaySaving(false); }
  }

  const inputClass = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-brand-500";

  return (
    <PageWrapper className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto flex max-w-[1440px] gap-0 p-4 lg:gap-4 lg:p-6" style={{ height: 'calc(100vh - 57px)' }}>

        {/* LEFT: Customer List */}
        <div className={`${selected ? 'hidden lg:flex' : 'flex'} w-full shrink-0 flex-col rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800 lg:w-[420px]`}>
          <div className="flex items-center gap-2 border-b border-slate-100 p-4 dark:border-slate-800">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or phone..."
                className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-brand-500" />
            </div>
            <button onClick={openAddForm} className="shrink-0 rounded-xl bg-brand-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.97]">+ Add</button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? <ListSkeleton /> : filtered.length === 0 ? (
              <EmptyState icon="👥" title={search ? 'No matches' : 'No customers yet'} description={search ? 'Try a different search' : 'Add your first customer!'} />
            ) : (
              filtered.map(c => (
                <button key={c.id} onClick={() => loadDetail(c.id)}
                  className={`flex w-full items-center gap-3 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-slate-50 dark:border-slate-800/50 dark:hover:bg-slate-800/50 ${selected === c.id ? 'bg-brand-50 dark:bg-brand-900/20' : ''}`}>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                    {(c.full_name || c.phone)?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-slate-900 dark:text-white">{c.full_name || 'Unnamed'}</span>
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${TYPE_STYLES[c.customer_type]}`}>
                        {c.customer_type === 'loyalty' ? 'Loyalty' : 'Walk-in'}
                      </span>
                      {c.loyalty_tier !== 'none' && (
                        <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize ${TIER_STYLES[c.loyalty_tier]}`}>{c.loyalty_tier}</span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-400">
                      <span>{c.phone}</span>
                      <span>{c.total_orders} orders</span>
                      <span className="font-mono">{money(c.total_spent)}</span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* RIGHT: Customer Detail */}
        <div className={`${selected ? 'flex' : 'hidden lg:flex'} flex-1 flex-col rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800`}>
          {!detail && !detailLoading ? (
            <EmptyState icon={<svg className="h-12 w-12 text-slate-200 dark:text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
              title="Select a customer" description="Click a customer from the list to view details" />
          ) : detailLoading ? (
            <div className="flex flex-1 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" /></div>
          ) : detail && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-1 flex-col overflow-hidden">
              <button onClick={() => { setSelected(null); setDetail(null); }}
                className="flex items-center gap-1 border-b border-slate-100 px-4 py-2 text-xs text-brand-600 dark:border-slate-800 dark:text-brand-400 lg:hidden">
                ← Back to list
              </button>

              <div className="border-b border-slate-100 p-5 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-lg font-bold text-white">
                    {(detail.full_name || detail.phone)?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{detail.full_name || 'Unnamed'}</h2>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLES[detail.customer_type]}`}>
                        {detail.customer_type === 'loyalty' ? 'Loyalty' : 'Walk-in'}
                      </span>
                      {detail.loyalty_tier !== 'none' && (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${TIER_STYLES[detail.loyalty_tier]}`}>{detail.loyalty_tier}</span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span>{detail.phone}</span>
                      {detail.email && <span>{detail.email}</span>}
                      {detail.address && <span>{detail.address}{detail.city ? `, ${detail.city}` : ''}</span>}
                      <span>Since {new Date(detail.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={openEditForm} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 active:scale-[0.97] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Edit</button>
                  {detail.customer_type === 'walk_in' && (
                    <button onClick={handleConvertLoyalty} className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 transition hover:bg-brand-100 active:scale-[0.97] dark:border-brand-900/40 dark:bg-brand-900/10 dark:text-brand-400">Convert to Loyalty</button>
                  )}
                  {Number(detail.credit_balance) !== 0 && (
                    <button onClick={() => openRepayment()} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 active:scale-[0.97] dark:border-emerald-900/40 dark:bg-emerald-900/10 dark:text-emerald-400">Record Payment</button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-b border-slate-100 p-5 dark:border-slate-800 sm:grid-cols-4">
                {[
                  { label: 'Total Orders', value: detail.total_orders },
                  { label: 'Total Spent', value: money(detail.total_spent), mono: true },
                  { label: 'Loyalty Points', value: detail.loyalty_points_balance },
                  { label: 'Outstanding Credit', value: Number(detail.credit_balance) !== 0 ? money(Math.abs(detail.credit_balance)) : 'None', mono: Number(detail.credit_balance) !== 0 },
                ].map(s => (
                  <div key={s.label} className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800/50">
                    <p className={`text-lg font-bold text-slate-900 dark:text-white ${s.mono ? 'font-mono' : ''}`}>{s.value}</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-1 border-b border-slate-100 px-5 dark:border-slate-800">
                {['orders', 'ledger'].map(tab => (
                  <button key={tab} onClick={() => setDetailTab(tab)}
                    className={`relative border-b-2 px-4 py-2.5 text-xs font-medium capitalize transition ${detailTab === tab ? 'border-brand-600 text-brand-700 dark:border-brand-400 dark:text-brand-400' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                    {tab === 'orders' ? `Orders (${detail.orders?.length || 0})` : `Ledger (${detail.ledger?.length || 0})`}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {detailTab === 'orders' && (
                  detail.orders.length === 0 ? (
                    <EmptyState icon="🛍️" title="No orders yet" description="This customer hasn't made any purchases" />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-400 dark:border-slate-800">
                            <th className="pb-2 pr-3">Date</th><th className="pb-2 pr-3">Order #</th><th className="pb-2 pr-3">Status</th><th className="pb-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.orders.map(o => (
                            <tr key={o.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/50">
                              <td className="py-2 pr-3 text-slate-500 dark:text-slate-400">{new Date(o.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                              <td className="py-2 pr-3 font-mono font-medium text-slate-900 dark:text-white">{o.order_number}</td>
                              <td className="py-2 pr-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status] || 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>{o.status.replace('_', ' ')}</span></td>
                              <td className="py-2 text-right font-mono font-medium text-slate-900 dark:text-white">{money(o.grand_total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
                {detailTab === 'ledger' && (
                  detail.ledger.length === 0 ? (
                    <EmptyState icon="📒" title="No ledger entries" description="Points and credit transactions will appear here" />
                  ) : (
                    <div className="space-y-2">
                      {detail.ledger.map(l => (
                        <div key={l.id} className="flex items-start justify-between rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                          <div>
                            <p className="text-sm font-medium capitalize text-slate-900 dark:text-white">{l.entry_type.replace(/_/g, ' ')}</p>
                            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                              {new Date(l.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              {l.created_by_name && ` · by ${l.created_by_name}`}
                            </p>
                            {l.notes && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{l.notes}</p>}
                          </div>
                          <div className="shrink-0 text-right">
                            {l.points_delta !== 0 && <p className={`font-mono text-sm font-semibold ${l.points_delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{l.points_delta > 0 ? '+' : ''}{l.points_delta} pts</p>}
                            {l.credit_delta !== 0 && <p className={`font-mono text-sm font-semibold ${l.credit_delta > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{l.credit_delta > 0 ? '+' : '−'}{money(Math.abs(l.credit_delta))}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editingCustomer ? 'Edit Customer' : 'Add Customer'}>
        <form onSubmit={saveForm} className="space-y-3">
          <div><label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Phone *</label>
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputClass} placeholder="077XXXXXXX" required /></div>
          <div><label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Full Name</label>
            <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className={inputClass} placeholder="Customer name" /></div>
          <div><label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Email</label>
            <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} type="email" className={inputClass} placeholder="customer@email.com" /></div>
          <div><label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Address</label>
            <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className={inputClass} placeholder="Street address" /></div>
          <div><label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">City</label>
            <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className={inputClass} placeholder="City" /></div>
          {!editingCustomer && (
            <div><label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Customer Type</label>
              <select value={form.customer_type} onChange={e => setForm(f => ({ ...f, customer_type: e.target.value }))} className={inputClass}>
                <option value="walk_in">Walk-in</option><option value="loyalty">Loyalty</option>
              </select></div>
          )}
          {formError && <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{formError}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setFormOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button>
            <button type="submit" disabled={formSaving} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 active:scale-[0.97] disabled:opacity-50">
              {formSaving ? 'Saving...' : editingCustomer ? 'Update' : 'Add Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Credit Repayment Modal */}
      <Modal open={repayOpen && !!detail} onClose={() => setRepayOpen(false)} title="Record Credit Payment" maxW="max-w-md">
        {detail && (<>
        <div className="mb-4 rounded-xl bg-red-50 p-3 dark:bg-red-900/20">
          <p className="text-xs text-slate-500 dark:text-slate-400">Outstanding balance</p>
          <p className="text-lg font-bold font-mono text-red-600 dark:text-red-400">{money(Math.abs(detail.credit_balance || 0))}</p>
        </div>
        <form onSubmit={submitRepayment} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Amount (Rs.)</label>
            <input value={repayAmount} onChange={e => setRepayAmount(e.target.value)} type="number" step="0.01" min="0.01"
              max={Math.abs(detail.credit_balance || 0) || undefined}
              className={`${inputClass} font-mono`} placeholder="0.00" required autoFocus />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Number(detail.credit_balance) !== 0 && (
                <button type="button" onClick={() => setRepayAmount(Math.abs(Number(detail.credit_balance)).toFixed(2))}
                  className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400">
                  Pay Full ({money(Math.abs(detail.credit_balance))})
                </button>
              )}
              {[5000, 10000].filter(v => v < Math.abs(Number(detail.credit_balance || 0))).map(v => (
                <button key={v} type="button" onClick={() => setRepayAmount(v.toFixed(2))}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">
                  Rs. {v.toLocaleString()}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Payment Method</label>
            <div className="flex gap-2">
              {[{ v: 'cash', l: 'Cash' }, { v: 'card', l: 'Card' }, { v: 'bank_transfer', l: 'Bank Transfer' }].map(m => (
                <button key={m.v} type="button" onClick={() => setRepayMethod(m.v)}
                  className={`flex-1 rounded-lg border-2 px-3 py-2 text-xs font-medium transition ${repayMethod === m.v ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-900/20 dark:text-brand-300' : 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400'}`}>
                  {m.l}
                </button>
              ))}
            </div>
          </div>
          <div><label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Reference note (optional)</label>
            <input value={repayNote} onChange={e => setRepayNote(e.target.value)} className={inputClass} placeholder="e.g. Paid cash at shop" /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setRepayOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button>
            <button type="submit" disabled={repaySaving} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 active:scale-[0.97] disabled:opacity-50">
              {repaySaving ? 'Saving...' : 'Record Payment'}
            </button>
          </div>
        </form>
        </>)}
      </Modal>
    </PageWrapper>
  );
}
