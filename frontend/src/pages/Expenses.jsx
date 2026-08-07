import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import client from '../api/client';
import PageWrapper, { staggerContainer, fadeUp } from '../components/PageWrapper';
import { useToast } from '../context/ToastContext';

function money(n) { return `Rs. ${Number(n || 0).toFixed(2)}`; }
const PIE_COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b', '#84cc16', '#a855f7'];
const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' },
];

function exportCSV(data, filename) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const csv = [keys.join(','), ...data.map(r => keys.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${filename}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => { loadCategories(); }, []);
  useEffect(() => { loadExpenses(); }, [month, year]);

  async function loadCategories() {
    try {
      const res = await client.get('/expenses/categories');
      setCategories(res.data.data);
    } catch { toast.error('Failed to load categories'); }
  }

  async function loadExpenses() {
    setLoading(true);
    try {
      const res = await client.get(`/expenses?month=${month}&year=${year}`);
      setExpenses(res.data.data.expenses);
      setSummary(res.data.data.summary);
    } catch { toast.error('Failed to load expenses'); }
    finally { setLoading(false); }
  }

  function changeMonth(delta) {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setMonth(m); setYear(y);
  }

  const monthLabel = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  async function handleSave(formData) {
    setSaving(true);
    try {
      if (editExpense) {
        await client.put(`/expenses/${editExpense.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Expense updated');
      } else {
        await client.post('/expenses', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Expense added');
      }
      setShowForm(false);
      setEditExpense(null);
      loadExpenses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save expense');
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    try {
      await client.delete(`/expenses/${deleteId}`);
      toast.success('Expense deleted');
      setDeleteId(null);
      loadExpenses();
    } catch { toast.error('Failed to delete'); }
  }

  function handleExport() {
    exportCSV(expenses.map(e => ({
      date: e.expense_date?.slice(0, 10),
      category: e.category_name,
      description: e.description || '',
      amount: Number(e.amount).toFixed(2),
      payment_method: e.payment_method,
      recurring: e.is_recurring ? 'Yes' : 'No',
    })), `expenses-${year}-${String(month).padStart(2, '0')}`);
  }

  const activeCategories = useMemo(() => categories.filter(c => c.is_active), [categories]);

  return (
    <div className="flex h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <PageWrapper className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="mx-auto max-w-5xl space-y-4">

            {/* Header */}
            <motion.div variants={fadeUp} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Expenses</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">Track operating costs and overhead</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleExport} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">
                  Export CSV
                </button>
                <button onClick={() => { setEditExpense(null); setShowForm(true); }}
                  className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700">
                  + Add Expense
                </button>
              </div>
            </motion.div>

            {/* Month selector */}
            <motion.div variants={fadeUp} className="flex items-center justify-center gap-4">
              <button onClick={() => changeMonth(-1)} className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <h2 className="min-w-[180px] text-center text-lg font-semibold text-slate-900 dark:text-white">{monthLabel}</h2>
              <button onClick={() => changeMonth(1)} className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </motion.div>

            {/* Summary cards */}
            {summary && (
              <motion.div variants={fadeUp} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total This Month</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{money(summary.total)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Previous Month</p>
                  <p className="mt-1 text-2xl font-bold text-slate-600 dark:text-slate-300">{money(summary.previous_total)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Change</p>
                  <p className={`mt-1 text-2xl font-bold ${summary.change === null ? 'text-slate-400' : summary.change > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {summary.change === null ? '—' : `${summary.change > 0 ? '+' : ''}${summary.change}%`}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Pie chart + table layout */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Pie chart */}
              {summary?.by_category?.length > 0 && (
                <motion.div variants={fadeUp} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:col-span-1">
                  <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">By Category</p>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={summary.by_category} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={80} label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {summary.by_category.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={v => money(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </motion.div>
              )}

              {/* Expense table */}
              <motion.div variants={fadeUp} className={`rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${summary?.by_category?.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
                <div className="overflow-x-auto">
                  {loading ? (
                    <div className="space-y-2 p-4">
                      {[...Array(5)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />)}
                    </div>
                  ) : expenses.length === 0 ? (
                    <div className="py-12 text-center text-sm text-slate-400">No expenses recorded for {monthLabel}</div>
                  ) : (
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Category</th>
                          <th className="px-4 py-3 hidden sm:table-cell">Description</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                          <th className="px-4 py-3 hidden md:table-cell">Payment</th>
                          <th className="px-4 py-3 hidden md:table-cell">Receipt</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenses.map(e => (
                          <tr key={e.id} className="border-b border-slate-50 transition hover:bg-slate-50 dark:border-slate-800/50 dark:hover:bg-slate-800/30">
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{e.expense_date?.slice(0, 10)}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1.5">
                                <span className="text-slate-900 dark:text-white">{e.category_name}</span>
                                {e.is_recurring && <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">recurring</span>}
                              </span>
                            </td>
                            <td className="px-4 py-3 hidden text-slate-500 dark:text-slate-400 sm:table-cell">{e.description || '—'}</td>
                            <td className="px-4 py-3 text-right font-mono font-medium text-slate-900 dark:text-white">{money(e.amount)}</td>
                            <td className="px-4 py-3 hidden text-slate-500 capitalize dark:text-slate-400 md:table-cell">{e.payment_method?.replace('_', ' ')}</td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              {e.receipt_url ? (
                                <a href={e.receipt_url} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline dark:text-brand-400">View</a>
                              ) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button onClick={() => { setEditExpense(e); setShowForm(true); }}
                                className="mr-2 text-slate-400 transition hover:text-brand-600 dark:hover:text-brand-400">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              <button onClick={() => setDeleteId(e.id)}
                                className="text-slate-400 transition hover:text-red-600 dark:hover:text-red-400">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </PageWrapper>

      {/* Add/Edit modal */}
      <AnimatePresence>
        {showForm && (
          <ExpenseForm
            expense={editExpense}
            categories={activeCategories}
            onSave={handleSave}
            onClose={() => { setShowForm(false); setEditExpense(null); }}
            saving={saving}
          />
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
      <AnimatePresence>
        {deleteId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeleteId(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="mx-4 w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900" onClick={e => e.stopPropagation()}>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Delete Expense</h3>
              <p className="mt-2 text-sm text-slate-500">Are you sure? This cannot be undone.</p>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setDeleteId(null)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-500 dark:border-slate-700">Cancel</button>
                <button onClick={handleDelete} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ExpenseForm({ expense, categories, onSave, onClose, saving }) {
  const today = new Date().toISOString().slice(0, 10);
  const [categoryId, setCategoryId] = useState(expense?.category_id || '');
  const [amount, setAmount] = useState(expense?.amount || '');
  const [date, setDate] = useState(expense?.expense_date?.slice(0, 10) || today);
  const [description, setDescription] = useState(expense?.description || '');
  const [paymentMethod, setPaymentMethod] = useState(expense?.payment_method || 'cash');
  const [isRecurring, setIsRecurring] = useState(expense?.is_recurring || false);
  const [recurringDay, setRecurringDay] = useState(expense?.recurring_day || '');
  const [receiptFile, setReceiptFile] = useState(null);

  function handleSubmit(e) {
    e.preventDefault();
    const fd = new FormData();
    fd.append('category_id', categoryId);
    fd.append('amount', amount);
    fd.append('expense_date', date);
    fd.append('description', description);
    fd.append('payment_method', paymentMethod);
    fd.append('is_recurring', isRecurring ? '1' : '0');
    if (isRecurring && recurringDay) fd.append('recurring_day', recurringDay);
    if (receiptFile) fd.append('receipt', receiptFile);
    else if (expense?.receipt_url) fd.append('receipt_url', expense.receipt_url);
    onSave(fd);
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900" onClick={e => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
          {expense ? 'Edit Expense' : 'Add Expense'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Category *</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} required
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
              <option value="">Select category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Amount (Rs.) *</label>
              <input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Date *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Description</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. July electricity bill"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Payment Method</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Receipt Photo</label>
              <input type="file" accept="image/*,.pdf" onChange={e => setReceiptFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-slate-500 file:mr-2 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-700 dark:text-slate-400 dark:file:bg-brand-900/30 dark:file:text-brand-400" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
              <span className="text-sm text-slate-600 dark:text-slate-400">Recurring</span>
            </label>
            {isRecurring && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-500">Day:</span>
                <input type="number" min="1" max="31" value={recurringDay} onChange={e => setRecurringDay(e.target.value)}
                  className="w-14 rounded-lg border border-slate-200 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-500 dark:border-slate-700">Cancel</button>
            <button type="submit" disabled={saving}
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50">
              {saving ? 'Saving...' : expense ? 'Update' : 'Add Expense'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
