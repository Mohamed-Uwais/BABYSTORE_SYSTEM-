import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import client from '../api/client';
import PageWrapper, { staggerContainer, fadeUp } from '../components/PageWrapper';
import { useToast } from '../context/ToastContext';

function money(n) { return `Rs. ${Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`; }
function shortMoney(n) {
  const v = Number(n || 0);
  if (v >= 1000000) return `Rs. ${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `Rs. ${(v / 1000).toFixed(1)}K`;
  return `Rs. ${v.toFixed(0)}`;
}

const COLORS = ['#6366f1', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
const TABS = [
  { key: 'sales', label: 'Sales' },
  { key: 'profit', label: 'Profit' },
  { key: 'settlements', label: 'Settlements' },
  { key: 'stock', label: 'Stock' },
  { key: 'customers', label: 'Customers' },
  { key: 'credit', label: 'Credit' },
  { key: 'purchases', label: 'Purchases' },
  { key: 'data_health', label: 'Data Health' },
];

function today() { return new Date().toISOString().slice(0, 10); }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }

function StatCard({ label, value, sub, color = 'brand' }) {
  const colors = {
    brand: 'from-brand-500 to-brand-600',
    emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    red: 'from-red-500 to-red-600',
    cyan: 'from-cyan-500 to-cyan-600',
    violet: 'from-violet-500 to-violet-600',
  };
  return (
    <motion.div variants={fadeUp} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 bg-gradient-to-r ${colors[color]} bg-clip-text font-mono text-2xl font-bold text-transparent`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{sub}</p>}
    </motion.div>
  );
}

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

// ============ SALES REPORT ============
function SalesReport() {
  const [data, setData] = useState(null);
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today());
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => { load(); }, [from, to]);
  async function load() {
    setLoading(true);
    try {
      const res = await client.get(`/reports/sales?from=${from}&to=${to}`);
      setData(res.data.data);
    } catch { addToast('Failed to load sales report', 'error'); }
    finally { setLoading(false); }
  }

  if (loading) return <ReportSkeleton />;
  if (!data) return null;

  const { orders, summary } = data;
  const daily = {};
  orders.forEach(o => {
    const d = new Date(o.created_at).toISOString().slice(0, 10);
    if (!daily[d]) daily[d] = { date: d, revenue: 0, orders: 0 };
    daily[d].revenue += Number(o.grand_total);
    daily[d].orders += 1;
  });
  const chartData = Object.values(daily).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
      <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} onExport={() => exportCSV(orders, `sales-${from}-${to}`)} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total Orders" value={summary.total_orders} color="brand" />
        <StatCard label="Product Revenue" value={money(summary.total_revenue)} color="emerald" />
        <StatCard label="Delivery — Own" value={money(summary.delivery_own || 0)} sub="Our income" color="cyan" />
        <StatCard label="Delivery — Courier" value={money(summary.delivery_courier || 0)} sub="Not our money" color="amber" />
        <StatCard label="Refunds" value={`${summary.refund_count || 0} / ${money(summary.refund_total || 0)}`} color="red" />
        <StatCard label="Avg Order Value" value={money(summary.avg_order_value)} color="violet" />
      </div>
      {chartData.length > 1 && (
        <motion.div variants={fadeUp} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">Daily Revenue</p>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData}>
              <defs><linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity={0.3}/><stop offset="100%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={shortMoney} />
              <Tooltip formatter={v => money(v)} labelFormatter={l => `Date: ${l}`} />
              <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#salesGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      )}
      <OrdersTable orders={orders} />
    </motion.div>
  );
}

// ============ PROFIT REPORT ============
function ProfitReport() {
  const [data, setData] = useState(null);
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today());
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => { load(); }, [from, to]);
  async function load() {
    setLoading(true);
    try {
      const res = await client.get(`/reports/profit?from=${from}&to=${to}`);
      setData(res.data.data);
    } catch { addToast('Failed to load profit report', 'error'); }
    finally { setLoading(false); }
  }

  if (loading) return <ReportSkeleton />;
  if (!data) return null;

  const { summary, dailyTrend, byProduct, expenses } = data;
  const trend = dailyTrend.map(d => ({
    date: d.date?.slice?.(0, 10) || d.date,
    revenue: Number(d.revenue),
    cogs: Number(d.cogs),
    profit: Number(d.revenue) - Number(d.cogs),
  }));

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
      <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} onExport={() => exportCSV(byProduct, `profit-${from}-${to}`)} />

      {/* Net Profit income statement */}
      <motion.div variants={fadeUp} className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="p-4 sm:p-5">
          <div className="space-y-1 font-mono text-sm">
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Revenue</span><span>{money(summary.total_revenue)}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Cost of Goods Sold</span><span>{money(summary.total_cogs)}</span>
            </div>
            <div className="my-2 border-t border-slate-200 dark:border-slate-700" />
            <div className="flex justify-between font-semibold text-slate-900 dark:text-white">
              <span>GROSS PROFIT</span>
              <span className="flex items-center gap-2">
                {money(summary.gross_profit)}
                <span className="text-xs font-normal text-slate-400">({summary.margin}%)</span>
              </span>
            </div>

            {expenses && (
              <>
                <div className="pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Operating Expenses</div>
                {expenses.breakdown.length > 0 ? expenses.breakdown.map((e, i) => (
                  <div key={i} className="flex justify-between pl-4 text-slate-500 dark:text-slate-400">
                    <span>{e.category}</span><span>{money(e.total)}</span>
                  </div>
                )) : (
                  <div className="pl-4 text-slate-400 italic">No expenses recorded</div>
                )}
                <div className="my-2 border-t border-slate-200 dark:border-slate-700" />
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span className="pl-4">Total Expenses</span><span>{money(summary.total_expenses)}</span>
                </div>
                <div className="my-2 border-t border-slate-200 dark:border-slate-700" />
                <div className={`flex justify-between text-base font-bold ${summary.net_profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  <span>NET PROFIT</span>
                  <span className="flex items-center gap-2">
                    {money(summary.net_profit)}
                    <span className="text-xs font-normal opacity-70">({summary.net_margin}%)</span>
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Delivery — Own" value={money(summary.delivery_own || 0)} sub="Our income (separate)" color="cyan" />
        <StatCard label="Delivery — Courier" value={money(summary.delivery_courier || 0)} sub="Not our money" color="amber" />
        {(summary.transit_count || 0) > 0 && (
          <StatCard label="In Transit" value={money(summary.transit_revenue || 0)} sub={`${summary.transit_count} orders (shipped/packed)`} color="violet" />
        )}
      </div>
      {trend.length > 1 && (
        <motion.div variants={fadeUp} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">Daily Trend</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => String(d).slice(5)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={shortMoney} />
              <Tooltip formatter={v => money(v)} />
              <Bar dataKey="revenue" fill="#6366f1" radius={[4,4,0,0]} name="Revenue" />
              <Bar dataKey="cogs" fill="#f59e0b" radius={[4,4,0,0]} name="COGS" />
              <Bar dataKey="profit" fill="#10b981" radius={[4,4,0,0]} name="Profit" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}
      {byProduct.length > 0 && (
        <motion.div variants={fadeUp} className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="border-b border-slate-100 px-4 py-3 text-sm font-medium text-slate-700 dark:border-slate-800 dark:text-slate-300">Profit by Product</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-4 py-2">Product</th><th className="px-4 py-2">Sold</th><th className="px-4 py-2 text-right">Revenue</th><th className="px-4 py-2 text-right">COGS</th><th className="px-4 py-2 text-right">Profit</th>
              </tr></thead>
              <tbody>
                {byProduct.slice(0, 20).map((p, i) => (
                  <tr key={i} className="border-b border-slate-50 dark:border-slate-800/50">
                    <td className="px-4 py-2 text-slate-900 dark:text-white">{p.product_name} <span className="text-xs text-slate-400">{p.variant_label}</span></td>
                    <td className="px-4 py-2 font-mono text-slate-600 dark:text-slate-400">{p.units_sold}</td>
                    <td className="px-4 py-2 text-right font-mono text-slate-600 dark:text-slate-400">{money(p.revenue)}</td>
                    <td className="px-4 py-2 text-right font-mono text-slate-600 dark:text-slate-400">{money(p.cogs)}</td>
                    <td className={`px-4 py-2 text-right font-mono font-semibold ${Number(p.profit) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{money(p.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// ============ STOCK REPORT ============
function StockReport() {
  const [data, setData] = useState(null);
  const [lowOnly, setLowOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => { load(); }, [lowOnly]);
  async function load() {
    setLoading(true);
    try {
      const res = await client.get(`/reports/stock?low_only=${lowOnly}`);
      setData(res.data.data);
    } catch { addToast('Failed to load stock report', 'error'); }
    finally { setLoading(false); }
  }

  if (loading) return <ReportSkeleton />;
  if (!data) return null;

  const { variants, valuation } = data;

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
      <motion.div variants={fadeUp} className="flex items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <input type="checkbox" checked={lowOnly} onChange={e => setLowOnly(e.target.checked)}
            className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600" />
          Low stock only
        </label>
        <button onClick={() => exportCSV(variants, 'stock-report')}
          className="ml-auto rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">
          Export CSV
        </button>
      </motion.div>
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Retail Value" value={money(valuation.total_retail_value)} color="brand" />
        <StatCard label="Cost Value" value={money(valuation.total_cost_value)} color="amber" />
      </div>
      <motion.div variants={fadeUp} className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <th className="px-4 py-2">Product</th><th className="px-4 py-2">SKU</th><th className="px-4 py-2 text-right">Stock</th><th className="px-4 py-2 text-right">Threshold</th><th className="px-4 py-2 text-right">Cost</th><th className="px-4 py-2 text-right">Retail</th>
            </tr></thead>
            <tbody>
              {variants.map(v => (
                <tr key={v.variant_id} className="border-b border-slate-50 dark:border-slate-800/50">
                  <td className="px-4 py-2 text-slate-900 dark:text-white">{v.product_name} <span className="text-xs text-slate-400">{v.variant_label}</span></td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-500 dark:text-slate-400">{v.sku}</td>
                  <td className={`px-4 py-2 text-right font-mono font-semibold ${v.current_stock <= v.threshold ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>{v.current_stock}</td>
                  <td className="px-4 py-2 text-right font-mono text-slate-500 dark:text-slate-400">{v.threshold}</td>
                  <td className="px-4 py-2 text-right font-mono text-slate-500 dark:text-slate-400">{money(v.cost_price)}</td>
                  <td className="px-4 py-2 text-right font-mono text-slate-500 dark:text-slate-400">{money(v.retail_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============ CUSTOMER REPORT ============
function CustomerReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    try {
      const res = await client.get('/reports/customers');
      setData(res.data.data);
    } catch { addToast('Failed to load customer report', 'error'); }
    finally { setLoading(false); }
  }

  if (loading) return <ReportSkeleton />;
  if (!data) return null;

  const { totals, tiers, topBySpend, topByFrequency, churnRisk } = data;
  const tierData = tiers.map(t => ({ name: t.loyalty_tier || 'None', value: t.count }));

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Customers" value={totals.total_customers} color="brand" />
        <StatCard label="New This Month" value={totals.new_this_month} color="emerald" />
        <StatCard label="Loyalty" value={totals.loyalty_count} color="violet" />
        <StatCard label="Walk-in" value={totals.walkin_count} color="cyan" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {tierData.length > 0 && (
          <motion.div variants={fadeUp} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">Loyalty Tiers</p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart><Pie data={tierData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                {tierData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie><Tooltip /></PieChart>
            </ResponsiveContainer>
          </motion.div>
        )}
        {churnRisk.length > 0 && (
          <motion.div variants={fadeUp} className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="border-b border-slate-100 px-4 py-3 text-sm font-medium text-red-600 dark:border-slate-800 dark:text-red-400">Churn Risk ({churnRisk.length})</p>
            <div className="max-h-[220px] overflow-y-auto">
              {churnRisk.slice(0, 10).map(c => (
                <div key={c.id} className="flex items-center justify-between border-b border-slate-50 px-4 py-2 last:border-0 dark:border-slate-800/50">
                  <div>
                    <p className="text-sm text-slate-900 dark:text-white">{c.full_name}</p>
                    <p className="text-xs text-slate-400">{c.phone}</p>
                  </div>
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-900/20 dark:text-red-400">
                    {c.days_since_last_order}d ago
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TopTable title="Top by Spend" rows={topBySpend} valueKey="total_spend" valueLabel="Spend" />
        <TopTable title="Top by Frequency" rows={topByFrequency} valueKey="order_count" valueLabel="Orders" />
      </div>
    </motion.div>
  );
}

function TopTable({ title, rows, valueKey, valueLabel }) {
  return (
    <motion.div variants={fadeUp} className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="border-b border-slate-100 px-4 py-3 text-sm font-medium text-slate-700 dark:border-slate-800 dark:text-slate-300">{title}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <th className="px-4 py-2">Customer</th><th className="px-4 py-2 text-right">{valueLabel}</th>
          </tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-b border-slate-50 dark:border-slate-800/50">
                <td className="px-4 py-2 text-slate-900 dark:text-white">{r.full_name} <span className="text-xs text-slate-400">{r.loyalty_tier}</span></td>
                <td className="px-4 py-2 text-right font-mono text-slate-600 dark:text-slate-400">
                  {valueKey === 'total_spend' ? money(r[valueKey]) : r[valueKey]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

// ============ CREDIT REPORT ============
function CreditReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const [repayCustomer, setRepayCustomer] = useState(null);
  const [repayAmount, setRepayAmount] = useState('');
  const [repayMethod, setRepayMethod] = useState('cash');
  const [repayNote, setRepayNote] = useState('');
  const [repaySaving, setRepaySaving] = useState(false);

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    try {
      const res = await client.get('/reports/credit');
      setData(res.data.data);
    } catch { addToast('Failed to load credit report', 'error'); }
    finally { setLoading(false); }
  }

  function openRepay(c) {
    setRepayCustomer(c);
    setRepayAmount('');
    setRepayMethod('cash');
    setRepayNote('');
  }

  async function submitRepay(e) {
    e.preventDefault();
    const amt = parseFloat(repayAmount);
    if (!amt || amt <= 0 || !repayCustomer) return;
    setRepaySaving(true);
    const methodLabel = { cash: 'Cash', card: 'Card', bank_transfer: 'Bank Transfer' }[repayMethod] || repayMethod;
    try {
      await client.post(`/customers/${repayCustomer.id}/repayment`, { amount: amt, notes: [methodLabel, repayNote].filter(Boolean).join(' — ') });
      const remaining = Math.max(0, Number(repayCustomer.credit_balance) - amt);
      addToast(`Payment of ${money(amt)} recorded. Remaining: ${money(remaining)}`, 'success');
      setRepayCustomer(null);
      load();
    } catch (err) { addToast(err.response?.data?.message || 'Failed', 'error'); }
    finally { setRepaySaving(false); }
  }

  if (loading) return <ReportSkeleton />;
  if (!data) return null;

  const { owe_us = [], we_hold = [], total_outstanding = 0, total_store_credit = 0 } = data;

  function CreditTable({ rows, colorClass, actionLabel, onAction }) {
    if (rows.length === 0) return (
      <motion.div variants={fadeUp} className="rounded-xl border border-dashed border-slate-300 py-8 text-center dark:border-slate-700">
        <p className="text-sm text-slate-400">None</p>
      </motion.div>
    );
    return (
      <motion.div variants={fadeUp} className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <th className="px-4 py-2">Customer</th><th className="px-4 py-2">Phone</th><th className="px-4 py-2">Tier</th><th className="px-4 py-2 text-right">Balance</th><th className="px-4 py-2">Last Credit</th><th className="px-4 py-2">Last Repaid</th>{onAction && <th className="px-4 py-2"></th>}
            </tr></thead>
            <tbody>
              {rows.map(c => (
                <tr key={c.id} className="border-b border-slate-50 dark:border-slate-800/50">
                  <td className="px-4 py-2 font-medium text-slate-900 dark:text-white">{c.full_name}</td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-500 dark:text-slate-400">{c.phone}</td>
                  <td className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">{c.loyalty_tier}</td>
                  <td className={`px-4 py-2 text-right font-mono font-semibold ${colorClass}`}>{money(Math.abs(c.credit_balance))}</td>
                  <td className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">{c.last_credit_date ? new Date(c.last_credit_date).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">{c.last_repayment_date ? new Date(c.last_repayment_date).toLocaleDateString() : '—'}</td>
                  {onAction && <td className="px-4 py-2">
                    <button onClick={() => onAction(c)} className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700">{actionLabel}</button>
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="They Owe Us" value={money(total_outstanding)} color="red" />
        <StatCard label="Store Credit We Hold" value={money(total_store_credit)} color="emerald" />
      </div>

      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Customers Who Owe Us ({owe_us.length})</h3>
      <CreditTable rows={owe_us} colorClass="text-red-600 dark:text-red-400" actionLabel="Record Payment" onAction={openRepay} />

      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 pt-2">Store Credit We Hold ({we_hold.length})</h3>
      <CreditTable rows={we_hold} colorClass="text-emerald-600 dark:text-emerald-400" />

      {repayCustomer && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border-2 border-emerald-300 bg-white p-4 shadow-lg dark:border-emerald-700 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Record Payment — {repayCustomer.full_name}</h3>
            <button onClick={() => setRepayCustomer(null)} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
          </div>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">Outstanding: <span className="font-mono font-semibold text-red-600 dark:text-red-400">{money(Math.abs(repayCustomer.credit_balance))}</span></p>
          <form onSubmit={submitRepay} className="space-y-3">
            <div>
              <input value={repayAmount} onChange={e => setRepayAmount(e.target.value)} type="number" step="0.01" min="0.01"
                max={Math.abs(repayCustomer.credit_balance)} placeholder="Amount (Rs.)" autoFocus
                className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <button type="button" onClick={() => setRepayAmount(Math.abs(Number(repayCustomer.credit_balance)).toFixed(2))}
                  className="rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400">Pay Full</button>
                {[5000, 10000].filter(v => v < Math.abs(Number(repayCustomer.credit_balance))).map(v => (
                  <button key={v} type="button" onClick={() => setRepayAmount(v.toFixed(2))}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400">Rs. {v.toLocaleString()}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              {[{ v: 'cash', l: 'Cash' }, { v: 'card', l: 'Card' }, { v: 'bank_transfer', l: 'Bank Transfer' }].map(m => (
                <button key={m.v} type="button" onClick={() => setRepayMethod(m.v)}
                  className={`flex-1 rounded-lg border-2 px-2 py-1.5 text-xs font-medium transition ${repayMethod === m.v ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-900/20 dark:text-brand-300' : 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400'}`}>{m.l}</button>
              ))}
            </div>
            <input value={repayNote} onChange={e => setRepayNote(e.target.value)} placeholder="Reference note (optional)"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            <button type="submit" disabled={repaySaving || !repayAmount}
              className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
              {repaySaving ? 'Recording...' : 'Record Payment'}
            </button>
          </form>
        </motion.div>
      )}
    </motion.div>
  );
}

// ============ PURCHASE REPORT ============
function PurchaseReport() {
  const [data, setData] = useState(null);
  const [from, setFrom] = useState(daysAgo(90));
  const [to, setTo] = useState(today());
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => { load(); }, [from, to]);
  async function load() {
    setLoading(true);
    try {
      const res = await client.get(`/reports/purchases?from=${from}&to=${to}`);
      setData(res.data.data);
    } catch { addToast('Failed to load purchase report', 'error'); }
    finally { setLoading(false); }
  }

  if (loading) return <ReportSkeleton />;
  if (!data) return null;

  const { orders, summary } = data;
  const STATUS_BG = { draft: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', ordered: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', received: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', cancelled: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' };

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
      <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} onExport={() => exportCSV(orders, `purchases-${from}-${to}`)} />
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total POs" value={summary.total_pos} color="brand" />
        <StatCard label="Total Spent" value={money(summary.total_spent)} color="amber" />
        <StatCard label="Avg PO Value" value={money(summary.avg_po_value)} color="cyan" />
      </div>
      <motion.div variants={fadeUp} className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <th className="px-4 py-2">PO #</th><th className="px-4 py-2">Supplier</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Items</th><th className="px-4 py-2 text-right">Total</th><th className="px-4 py-2">Date</th>
            </tr></thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} className="border-b border-slate-50 dark:border-slate-800/50">
                  <td className="px-4 py-2 font-mono text-xs text-slate-900 dark:text-white">{o.po_number}</td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{o.supplier_name}</td>
                  <td className="px-4 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BG[o.status] || ''}`}>{o.status}</span></td>
                  <td className="px-4 py-2 font-mono text-slate-500 dark:text-slate-400">{o.item_count}</td>
                  <td className="px-4 py-2 text-right font-mono text-slate-600 dark:text-slate-400">{money(o.total_cost)}</td>
                  <td className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============ SETTLEMENT REPORT ============
function SettlementReport() {
  const [summaries, setSummaries] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeCourier, setActiveCourier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleNote, setSettleNote] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [settling, setSettling] = useState(false);
  const { addToast } = useToast();

  useEffect(() => { loadSummaries(); }, []);

  async function loadSummaries() {
    setLoading(true);
    try {
      const res = await client.get('/settlements/summaries');
      setSummaries(res.data.data || []);
    } catch { addToast('Failed to load settlement data', 'error'); }
    finally { setLoading(false); }
  }

  async function loadOrders(code) {
    setActiveCourier(code);
    setSelectedIds(new Set());
    setSettleAmount('');
    setSettleNote('');
    try {
      const res = await client.get(`/settlements/${code.toLowerCase()}/orders`);
      setOrders(res.data.data || []);
    } catch { addToast('Failed to load orders', 'error'); }
  }

  function toggleOrder(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selectedIds.size === orders.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(orders.map(o => o.delivery_id)));
  }

  useEffect(() => {
    const total = orders.filter(o => selectedIds.has(o.delivery_id)).reduce((s, o) => s + o.item_value, 0);
    if (selectedIds.size > 0) setSettleAmount(total.toFixed(2));
  }, [selectedIds, orders]);

  async function submitSettlement(e) {
    e.preventDefault();
    const amt = parseFloat(settleAmount);
    if (!amt || amt <= 0 || !activeCourier) return;
    setSettling(true);
    try {
      await client.post(`/settlements/${activeCourier.toLowerCase()}/settle`, {
        amount: amt,
        delivery_ids: [...selectedIds],
        notes: settleNote || undefined,
      });
      addToast(`Settlement of Rs. ${amt.toLocaleString('en-LK')} recorded`, 'success');
      setActiveCourier(null);
      loadSummaries();
    } catch (err) { addToast(err.response?.data?.message || 'Failed', 'error'); }
    finally { setSettling(false); }
  }

  if (loading) return <ReportSkeleton />;

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {summaries.map(s => (
          <motion.div key={s.courier_code} variants={fadeUp}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{s.courier_name}</p>
                <p className="mt-1 font-mono text-2xl font-bold text-red-600 dark:text-red-400">{money(s.outstanding)}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {s.unsettled_orders} unsettled order{s.unsettled_orders !== 1 ? 's' : ''}
                  {s.days_pending > 0 && <span className="ml-1 text-amber-600 dark:text-amber-400">· oldest {s.days_pending}d ago</span>}
                </p>
              </div>
              <button onClick={() => loadOrders(s.courier_code)}
                className="rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-100 dark:bg-brand-900/30 dark:text-brand-400">
                {activeCourier === s.courier_code ? 'Refresh' : 'View Orders'}
              </button>
            </div>
          </motion.div>
        ))}
        {summaries.length === 0 && (
          <motion.div variants={fadeUp} className="col-span-full rounded-xl border border-dashed border-slate-300 py-12 text-center dark:border-slate-700">
            <p className="text-sm text-slate-400">No courier accounts found</p>
          </motion.div>
        )}
      </div>

      {activeCourier && orders.length > 0 && (
        <motion.div variants={fadeUp} className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Unsettled Orders — {summaries.find(s => s.courier_code === activeCourier)?.courier_name}
            </h3>
            <button onClick={selectAll} className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
              {selectedIds.size === orders.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-4 py-2 w-8"></th>
                <th className="px-4 py-2">Order #</th>
                <th className="px-4 py-2">Ship Date</th>
                <th className="px-4 py-2">Tracking</th>
                <th className="px-4 py-2 text-right">Item Value</th>
                <th className="px-4 py-2 text-right">Days</th>
              </tr></thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.delivery_id} onClick={() => toggleOrder(o.delivery_id)}
                    className={`cursor-pointer border-b border-slate-50 transition dark:border-slate-800/50 ${selectedIds.has(o.delivery_id) ? 'bg-brand-50/50 dark:bg-brand-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                    <td className="px-4 py-2">
                      <input type="checkbox" checked={selectedIds.has(o.delivery_id)} onChange={() => toggleOrder(o.delivery_id)}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600" />
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-slate-900 dark:text-white">{o.order_number}</td>
                    <td className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">{new Date(o.ship_date).toLocaleDateString('en-LK')}</td>
                    <td className="px-4 py-2 font-mono text-xs text-slate-500 dark:text-slate-400">{o.tracking_number || '—'}</td>
                    <td className="px-4 py-2 text-right font-mono font-semibold text-slate-900 dark:text-white">{money(o.item_value)}</td>
                    <td className={`px-4 py-2 text-right font-mono text-xs ${o.days_pending > 14 ? 'font-semibold text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>{o.days_pending}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-100 p-4 dark:border-slate-800">
            <form onSubmit={submitSettlement} className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[150px]">
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Settlement Amount</label>
                <input type="number" step="0.01" min="0.01" value={settleAmount} onChange={e => setSettleAmount(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Reference / Note</label>
                <input value={settleNote} onChange={e => setSettleNote(e.target.value)} placeholder="Bank ref, date..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
              <button type="submit" disabled={settling || !settleAmount}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                {settling ? 'Recording...' : `Record Settlement${selectedIds.size > 0 ? ` (${selectedIds.size} orders)` : ''}`}
              </button>
            </form>
            {selectedIds.size > 0 && (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Selected: {selectedIds.size} order{selectedIds.size !== 1 ? 's' : ''} totalling{' '}
                <span className="font-mono font-semibold">{money(orders.filter(o => selectedIds.has(o.delivery_id)).reduce((s, o) => s + o.item_value, 0))}</span>
              </p>
            )}
          </div>
        </motion.div>
      )}

      {activeCourier && orders.length === 0 && (
        <motion.div variants={fadeUp} className="rounded-xl border border-dashed border-emerald-300 py-8 text-center dark:border-emerald-700">
          <span className="text-2xl">&#10003;</span>
          <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">All orders settled for this courier</p>
        </motion.div>
      )}
    </motion.div>
  );
}

// ============ SHARED COMPONENTS ============
function DateRange({ from, to, setFrom, setTo, onExport }) {
  return (
    <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-2">
      <input type="date" value={from} onChange={e => setFrom(e.target.value)}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
      <span className="text-xs text-slate-400">to</span>
      <input type="date" value={to} onChange={e => setTo(e.target.value)}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
      {onExport && (
        <button onClick={onExport}
          className="ml-auto rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">
          Export CSV
        </button>
      )}
    </motion.div>
  );
}

function OrdersTable({ orders }) {
  const STATUS_BG = { completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', refunded: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400', partially_refunded: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' };
  if (!orders.length) return (
    <motion.div variants={fadeUp} className="rounded-xl border border-dashed border-slate-300 py-12 text-center dark:border-slate-700">
      <p className="text-sm text-slate-400">No orders in this period</p>
    </motion.div>
  );
  return (
    <motion.div variants={fadeUp} className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <th className="px-4 py-2">Order #</th><th className="px-4 py-2">Customer</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Items</th><th className="px-4 py-2 text-right">Total</th><th className="px-4 py-2 text-right">Refunded</th><th className="px-4 py-2">Date</th>
          </tr></thead>
          <tbody>
            {orders.slice(0, 50).map(o => (
              <tr key={o.id} className="border-b border-slate-50 dark:border-slate-800/50">
                <td className="px-4 py-2 font-mono text-xs text-slate-900 dark:text-white">{o.order_number}</td>
                <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{o.customer_name || 'Walk-in'}</td>
                <td className="px-4 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BG[o.status] || ''}`}>{o.status}</span></td>
                <td className="px-4 py-2 font-mono text-slate-500 dark:text-slate-400">{o.items_count}</td>
                <td className="px-4 py-2 text-right font-mono font-semibold text-slate-900 dark:text-white">{money(o.grand_total)}</td>
                <td className="px-4 py-2 text-right font-mono text-xs">{Number(o.refunded_amount) > 0 ? <span className="font-semibold text-red-600 dark:text-red-400">-{money(o.refunded_amount)}</span> : <span className="text-slate-300 dark:text-slate-600">—</span>}</td>
                <td className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">{new Date(o.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

// ============ DATA HEALTH ============
function DataHealthReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    try {
      const res = await client.get('/reports/data-health');
      setData(res.data.data);
    } catch { addToast('Failed to load data health check', 'error'); }
    finally { setLoading(false); }
  }

  if (loading) return <ReportSkeleton />;
  if (!data) return null;

  const { credit_mismatches, points_mismatches, orphaned_payments } = data;
  const allClear = credit_mismatches.length === 0 && points_mismatches.length === 0 && orphaned_payments.length === 0;

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Credit Mismatches" value={credit_mismatches.length} color={credit_mismatches.length > 0 ? 'red' : 'emerald'} />
        <StatCard label="Points Mismatches" value={points_mismatches.length} color={points_mismatches.length > 0 ? 'amber' : 'emerald'} />
        <StatCard label="Orphaned Payments" value={orphaned_payments.length} color={orphaned_payments.length > 0 ? 'red' : 'emerald'} />
      </div>

      {allClear && (
        <motion.div variants={fadeUp} className="rounded-xl border border-dashed border-emerald-300 py-12 text-center dark:border-emerald-700">
          <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">All clear — no data inconsistencies found</p>
        </motion.div>
      )}

      {credit_mismatches.length > 0 && (
        <motion.div variants={fadeUp}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-500">Credit Balance Mismatches</h3>
          <p className="mb-3 text-xs text-slate-400">customers.credit_balance differs from SUM(customer_ledger.credit_delta)</p>
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="px-4 py-2">Customer</th><th className="px-4 py-2">Phone</th><th className="px-4 py-2 text-right">Stored</th><th className="px-4 py-2 text-right">Ledger Sum</th><th className="px-4 py-2 text-right">Drift</th>
                </tr></thead>
                <tbody>
                  {credit_mismatches.map(c => (
                    <tr key={c.id} className="border-b border-slate-50 dark:border-slate-800/50">
                      <td className="px-4 py-2 font-medium text-slate-900 dark:text-white">{c.full_name}</td>
                      <td className="px-4 py-2 font-mono text-xs text-slate-500">{c.phone}</td>
                      <td className="px-4 py-2 text-right font-mono">{money(c.stored_balance)}</td>
                      <td className="px-4 py-2 text-right font-mono">{money(c.ledger_balance)}</td>
                      <td className="px-4 py-2 text-right font-mono font-semibold text-red-600 dark:text-red-400">{money(c.drift)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {points_mismatches.length > 0 && (
        <motion.div variants={fadeUp}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-500">Points Balance Mismatches</h3>
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="px-4 py-2">Customer</th><th className="px-4 py-2">Phone</th><th className="px-4 py-2 text-right">Stored</th><th className="px-4 py-2 text-right">Ledger Sum</th><th className="px-4 py-2 text-right">Drift</th>
                </tr></thead>
                <tbody>
                  {points_mismatches.map(c => (
                    <tr key={c.id} className="border-b border-slate-50 dark:border-slate-800/50">
                      <td className="px-4 py-2 font-medium text-slate-900 dark:text-white">{c.full_name}</td>
                      <td className="px-4 py-2 font-mono text-xs text-slate-500">{c.phone}</td>
                      <td className="px-4 py-2 text-right font-mono">{c.stored_points}</td>
                      <td className="px-4 py-2 text-right font-mono">{c.ledger_points}</td>
                      <td className="px-4 py-2 text-right font-mono font-semibold text-amber-600 dark:text-amber-400">{c.drift}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />)}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
      <div className="h-48 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}

// ============ MAIN REPORTS PAGE ============
export default function Reports() {
  const [tab, setTab] = useState('sales');

  const ReportComponent = {
    sales: SalesReport,
    profit: ProfitReport,
    settlements: SettlementReport,
    stock: StockReport,
    customers: CustomerReport,
    credit: CreditReport,
    purchases: PurchaseReport,
    data_health: DataHealthReport,
  }[tab];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PageWrapper>
        <div className="mx-auto max-w-6xl space-y-4 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Reports</h1>
          </div>

          <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  tab === t.key
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <ReportComponent />
        </div>
      </PageWrapper>
    </div>
  );
}
