import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import PageWrapper, { staggerContainer, fadeUp } from '../components/PageWrapper';
import AnimatedCounter from '../components/AnimatedCounter';
import { CardSkeleton } from '../components/Skeleton';

function money(n) { return `Rs. ${Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`; }
function shortMoney(n) {
  if (n >= 1000000) return `Rs. ${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `Rs. ${(n / 1000).toFixed(1)}K`;
  return `Rs. ${n.toFixed(0)}`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const COLORS = ['#6366f1', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];
const STATUS_COLORS = { completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', refunded: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', partially_refunded: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400', pending: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [salesChart, setSalesChart] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [customerInsights, setCustomerInsights] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [chartDays, setChartDays] = useState(30);
  const [reorderPredictions, setReorderPredictions] = useState([]);
  const [deadStock, setDeadStock] = useState([]);
  const [deadStockOpen, setDeadStockOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/insights/reorder-predictions').then(r => setReorderPredictions(r.data.data || [])).catch(() => {});
    client.get('/insights/dead-stock').then(r => setDeadStock(r.data.data?.items || [])).catch(() => {});
    Promise.all([
      client.get('/dashboard/summary'),
      client.get(`/dashboard/sales-chart?days=${chartDays}`),
      client.get('/dashboard/best-sellers'),
      client.get('/dashboard/staff-performance'),
      client.get('/dashboard/customer-insights'),
      client.get('/dashboard/low-stock'),
      client.get('/dashboard/payment-methods'),
      client.get('/dashboard/recent-orders'),
    ]).then(([sum, chart, best, stf, cust, low, pay, recent]) => {
      setSummary(sum.data.data);
      setSalesChart(chart.data.data);
      setBestSellers(best.data.data);
      setStaff(stf.data.data);
      setCustomerInsights(cust.data.data);
      setLowStock(low.data.data);
      setPaymentMethods(pay.data.data);
      setRecentOrders(recent.data.data);
    }).finally(() => setLoading(false));
  }, [chartDays]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-[1440px] p-6">
        <div className="mb-6">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="mt-2 h-4 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => <CardSkeleton key={i} />)}
        </div>
      </div>
    </div>
  );

  const kpiCards = [
    { label: "Today's Revenue", value: Number(summary?.today?.revenue || 0), prefix: 'Rs. ', sub: `${summary?.today?.orders || 0} orders`, accent: 'from-brand-500 to-brand-600', iconBg: 'bg-brand-100 dark:bg-brand-900/30' },
    { label: 'This Week', value: Number(summary?.week?.revenue || 0), prefix: 'Rs. ', sub: `${summary?.week?.orders || 0} orders`, accent: 'from-cyan-500 to-cyan-600', iconBg: 'bg-cyan-100 dark:bg-cyan-900/30' },
    { label: 'This Month', value: Number(summary?.month?.revenue || 0), prefix: 'Rs. ', sub: summary?.month?.revenue_growth !== null ? `${summary.month.revenue_growth > 0 ? '+' : ''}${summary.month.revenue_growth}% vs last month` : `${summary?.month?.orders || 0} orders`, accent: 'from-emerald-500 to-emerald-600', iconBg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { label: 'Low Stock Alerts', value: summary?.low_stock_count || 0, sub: `${summary?.active_products || 0} active products`, accent: summary?.low_stock_count > 0 ? 'from-red-500 to-red-600' : 'from-slate-400 to-slate-500', iconBg: summary?.low_stock_count > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-slate-100 dark:bg-slate-800' },
  ];

  const paymentTotal = paymentMethods.reduce((s, p) => s + p.total, 0);
  const firstName = (user?.full_name || user?.username || '').split(' ')[0];

  return (
    <PageWrapper className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-[1440px] p-4 lg:p-6">

        {/* Page header with greeting */}
        <motion.div className="mb-6 flex items-center justify-between" variants={fadeUp} initial="initial" animate="animate">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {getGreeting()}, {firstName}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Here's how your store is doing</p>
          </div>
          <div className="hidden text-xs text-slate-400 dark:text-slate-500 sm:block">
            {new Date().toLocaleDateString('en-LK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </motion.div>

        {/* KPI Cards */}
        <motion.div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" variants={staggerContainer} initial="initial" animate="animate">
          {kpiCards.map((card, i) => (
            <motion.div key={i} variants={fadeUp} className="group relative overflow-hidden rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60 transition hover:shadow-md dark:bg-slate-900 dark:ring-slate-800">
              <div className={`absolute -right-3 -top-3 h-16 w-16 rounded-full bg-gradient-to-br ${card.accent} opacity-10 transition group-hover:opacity-20`} />
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{card.label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                <AnimatedCounter value={card.value} prefix={card.prefix || ''} />
              </p>
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{card.sub}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Revenue Chart + Payment Methods */}
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="col-span-1 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Revenue Trend</h2>
              <div className="flex gap-0.5 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
                {[7, 14, 30].map(d => (
                  <button key={d} onClick={() => setChartDays(d)}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition ${chartDays === d ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
                    {d}D
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={salesChart} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #e2e8f0)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={d => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={shortMoney} />
                <Tooltip formatter={(val) => money(val)} labelFormatter={d => new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)' }} />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} fill="url(#revenueGrad)" animationDuration={1200} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">
            <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Payment Methods</h2>
            {paymentMethods.length === 0 ? (
              <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">No data yet</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={paymentMethods} dataKey="total" nameKey="payment_method" cx="50%" cy="50%"
                      innerRadius={45} outerRadius={75} paddingAngle={3} strokeWidth={0} animationDuration={1000}>
                      {paymentMethods.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(val) => money(val)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1.5">
                  {paymentMethods.map((p, i) => (
                    <div key={p.payment_method} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="capitalize text-slate-600 dark:text-slate-300">{p.payment_method.replace('_', ' ')}</span>
                      </div>
                      <span className="font-medium text-slate-900 dark:text-white">{paymentTotal ? Math.round(p.total / paymentTotal * 100) : 0}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        </div>

        {/* Best Sellers + Recent Orders */}
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">
            <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Best Sellers (30 days)</h2>
            {bestSellers.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-slate-400">No sales data yet</div>
            ) : (
              <div className="space-y-3">
                {bestSellers.slice(0, 5).map((item, i) => {
                  const maxUnits = bestSellers[0]?.units_sold || 1;
                  return (
                    <div key={item.variant_id} className="flex items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{item.product_name}</p>
                          <span className="ml-2 shrink-0 font-mono text-xs font-semibold text-brand-600 dark:text-brand-400">{item.units_sold} sold</span>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{item.variant_label} · <span className="font-mono">{money(item.retail_price)}</span></p>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(item.units_sold / maxUnits) * 100}%` }}
                            transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">
            <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Recent Orders</h2>
            {recentOrders.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-slate-400">No orders yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-400 dark:border-slate-800">
                      <th className="pb-2 pr-3">Order</th>
                      <th className="pb-2 pr-3">Customer</th>
                      <th className="pb-2 pr-3">Status</th>
                      <th className="pb-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map(o => (
                      <tr key={o.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/50">
                        <td className="py-2.5 pr-3">
                          <p className="font-mono text-sm font-medium text-slate-900 dark:text-white">{o.order_number}</p>
                          <p className="text-xs text-slate-400">{new Date(o.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                        </td>
                        <td className="py-2.5 pr-3 text-slate-600 dark:text-slate-300">{o.customer_name || 'Walk-in'}</td>
                        <td className="py-2.5 pr-3">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status] || 'bg-slate-100 text-slate-500'}`}>
                            {o.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-mono font-medium text-slate-900 dark:text-white">{money(o.grand_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Staff Performance + Low Stock */}
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">
            <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Staff Performance (30 days)</h2>
            {staff.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-slate-400">No staff data</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={staff} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #e2e8f0)" />
                    <XAxis dataKey="full_name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={shortMoney} />
                    <Tooltip formatter={(val) => money(val)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)' }} />
                    <Bar dataKey="total_sales" fill="#06b6d4" radius={[6, 6, 0, 0]} animationDuration={1000} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-2">
                  {staff.map(s => (
                    <div key={s.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-100 text-[10px] font-bold text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400">
                          {s.full_name?.charAt(0)}
                        </div>
                        <span className="text-slate-700 dark:text-slate-300">{s.full_name}</span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-400 dark:bg-slate-800">{s.role}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-medium text-slate-900 dark:text-white">{money(s.total_sales)}</span>
                        <span className="ml-2 text-slate-400">({s.orders_count} orders)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Low Stock Alerts</h2>
              {lowStock.length > 0 && (
                <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  {lowStock.length} item{lowStock.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            {lowStock.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2">
                <span className="text-3xl">✓</span>
                <span className="text-sm text-slate-400 dark:text-slate-500">All stock levels healthy</span>
              </div>
            ) : (
              <div className="max-h-[320px] space-y-2.5 overflow-y-auto">
                {lowStock.map(item => {
                  const severity = item.current_stock === 0 ? 'out' : item.current_stock <= Math.ceil(item.low_stock_threshold / 2) ? 'critical' : 'low';
                  const severityStyle = {
                    out: 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/10',
                    critical: 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/10',
                    low: 'border-yellow-100 bg-yellow-50 dark:border-yellow-900/50 dark:bg-yellow-900/10',
                  };
                  return (
                    <div key={item.id} className={`rounded-lg border p-3 ${severityStyle[severity]}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{item.product_name}</p>
                          <p className="font-mono text-xs text-slate-500 dark:text-slate-400">{item.variant_label} · {item.sku}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-mono text-lg font-bold ${severity === 'out' ? 'text-red-600 dark:text-red-400' : severity === 'critical' ? 'text-amber-600 dark:text-amber-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                            {item.current_stock}
                          </p>
                          <p className="text-[10px] text-slate-400">/ {item.low_stock_threshold} min</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Customer Insights */}
        {customerInsights && (
          <div className="mb-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">
            <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Customer Insights</h2>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">Customer Types</h3>
                <div className="flex gap-4">
                  {Object.entries(customerInsights.type_breakdown).map(([type, count]) => (
                    <div key={type} className="flex-1 rounded-lg bg-slate-50 p-3 text-center dark:bg-slate-800">
                      <p className="text-xl font-bold text-slate-900 dark:text-white">{count}</p>
                      <p className="text-xs capitalize text-slate-500 dark:text-slate-400">{type.replace('_', ' ')}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">Top Customers</h3>
                {customerInsights.top_customers.length === 0 ? (
                  <p className="text-sm text-slate-400">No registered customers yet</p>
                ) : (
                  <div className="space-y-2">
                    {customerInsights.top_customers.slice(0, 5).map((c, i) => (
                      <div key={c.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">{i + 1}</span>
                          <span className="text-slate-700 dark:text-slate-300">{c.full_name}</span>
                        </div>
                        <span className="font-mono font-medium text-slate-900 dark:text-white">{money(c.total_spent)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Refund Summary */}
        {summary?.refunds_month && (
          <div className="mb-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">
            <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Returns & Refunds (30 days)</h2>
            <div className="flex gap-6">
              <div className="rounded-lg bg-red-50 px-4 py-3 text-center dark:bg-red-900/10">
                <p className="text-xl font-bold text-red-700 dark:text-red-400">{summary.refunds_month.count}</p>
                <p className="text-xs text-red-500 dark:text-red-400/70">Refunds</p>
              </div>
              <div className="rounded-lg bg-red-50 px-4 py-3 text-center dark:bg-red-900/10">
                <p className="font-mono text-xl font-bold text-red-700 dark:text-red-400">{money(summary.refunds_month.total)}</p>
                <p className="text-xs text-red-500 dark:text-red-400/70">Total Refunded</p>
              </div>
              {summary.month.revenue > 0 && (
                <div className="rounded-lg bg-slate-50 px-4 py-3 text-center dark:bg-slate-800">
                  <p className="text-xl font-bold text-slate-700 dark:text-slate-200">
                    {(summary.refunds_month.total / summary.month.revenue * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-slate-400">Refund Rate</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reorder Predictions */}
        {reorderPredictions.length > 0 && (
          <div className="mb-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Customers Likely to Reorder</h2>
              <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                {reorderPredictions.length} customer{reorderPredictions.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-3">
              {reorderPredictions.map((p, i) => {
                const daysUntil = p.days_until;
                const urgency = daysUntil <= 0 ? 'overdue' : daysUntil <= 3 ? 'soon' : 'upcoming';
                const urgencyStyle = { overdue: 'text-red-600 dark:text-red-400', soon: 'text-amber-600 dark:text-amber-400', upcoming: 'text-blue-600 dark:text-blue-400' };
                const urgencyBadge = { overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', soon: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', upcoming: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
                return (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{p.customer_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Usually buys <span className="font-medium">{p.product_name}</span> ({p.variant_label}) every ~{p.avg_interval_days} days
                      </p>
                      <p className="text-xs text-slate-400">Last purchased: {new Date(p.last_purchase).toLocaleDateString('en-LK', { month: 'short', day: 'numeric' })}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${urgencyBadge[urgency]}`}>
                        {daysUntil <= 0 ? 'Overdue' : `In ${daysUntil}d`}
                      </span>
                      {p.phone && (
                        <a href={`https://wa.me/${p.phone.replace(/\D/g, '').replace(/^0/, '94')}?text=${encodeURIComponent(`Hi ${p.customer_name.split(' ')[0]}! Just checking if you need to restock on ${p.product_name}? 😊`)}`}
                          target="_blank" rel="noopener noreferrer"
                          className="rounded-lg bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700">
                          Remind
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dead Stock */}
        {deadStock.length > 0 && (
          <div className="mb-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">
            <button onClick={() => setDeadStockOpen(!deadStockOpen)}
              className="flex w-full items-center justify-between text-left">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Dead / Slow Stock</h2>
                <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  {deadStock.length} item{deadStock.length !== 1 ? 's' : ''}
                </span>
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                  Value: {money(deadStock.reduce((s, d) => s + Number(d.stock_value_retail || 0), 0))}
                </span>
              </div>
              <svg className={`h-5 w-5 text-slate-400 transition ${deadStockOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {deadStockOpen && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 space-y-2">
                {deadStock.map((item, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-800/50">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{item.product_name}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          item.severity === 'dead' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>{item.severity}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {item.variant_label} · <span className="font-mono">{item.sku}</span> · {item.units_sold_30d} sold in 30d
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-medium text-slate-900 dark:text-white">{item.current_stock} units</p>
                      <p className="font-mono text-xs text-slate-400">{money(item.stock_value_retail)}</p>
                      {item.days_of_stock !== null && item.days_of_stock !== 'Infinity' && (
                        <p className="text-[10px] text-slate-400">~{item.days_of_stock}d supply</p>
                      )}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        )}

      </div>
    </PageWrapper>
  );
}
