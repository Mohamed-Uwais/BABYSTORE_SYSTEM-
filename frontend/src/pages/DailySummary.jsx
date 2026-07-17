import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import client from '../api/client';
import PageWrapper, { staggerContainer, fadeUp } from '../components/PageWrapper';

const PAYMENT_LABELS = { cash: 'Cash', card: 'Card', bank_transfer: 'Bank Transfer', store_credit: 'Store Credit' };

function money(n) { return `Rs. ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`; }

function StatCard({ label, value, subValue, color = 'brand', change }) {
  const colors = {
    brand: 'from-brand-600 to-brand-500', emerald: 'from-emerald-600 to-emerald-500',
    amber: 'from-amber-600 to-amber-500', red: 'from-red-600 to-red-500', cyan: 'from-cyan-600 to-cyan-500',
  };
  return (
    <motion.div variants={fadeUp} className={`rounded-2xl bg-gradient-to-br ${colors[color]} p-4 text-white shadow-lg`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-bold font-mono">{value}</p>
      {subValue && <p className="mt-0.5 text-xs opacity-70">{subValue}</p>}
      {change !== null && change !== undefined && (
        <p className={`mt-1 text-xs font-medium ${change >= 0 ? 'text-emerald-200' : 'text-red-200'}`}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}% vs yesterday
        </p>
      )}
    </motion.div>
  );
}

export default function DailySummary() {
  const [data, setData] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    client.get(`/insights/daily-summary?date=${date}`)
      .then(r => setData(r.data.data))
      .finally(() => setLoading(false));
  }, [date]);

  function generateShareText() {
    if (!data) return '';
    const lines = [
      `*Daily Summary — ${data.date}*`, '',
      `Orders: ${data.sales.total_orders}`,
      `Revenue: ${money(data.sales.total_revenue)}`,
      `Avg Order: ${money(data.sales.avg_order_value)}`,
      data.sales.revenue_change !== null ? `Change: ${data.sales.revenue_change >= 0 ? '+' : ''}${data.sales.revenue_change}% vs yesterday` : '',
      '', '*Payments:*',
      ...data.payments.map(p => `  ${PAYMENT_LABELS[p.payment_method] || p.payment_method}: ${money(p.total)}`),
      '', '*Top Items:*',
      ...data.items_sold.slice(0, 5).map(i => `  ${i.qty_sold}x ${i.product_name} (${i.variant_label})`),
      '', `New Customers: ${data.new_customers.length}`,
      `Refunds: ${data.refunds.count} (${money(data.refunds.total)})`,
      `Credit Issued: ${money(data.credit.issued)} | Repaid: ${money(data.credit.repaid)}`,
      `Low Stock Alerts: ${data.stock_alerts.length}`,
    ];
    return lines.filter(Boolean).join('\n');
  }

  function handleShare() {
    window.open(`https://wa.me/?text=${encodeURIComponent(generateShareText())}`, '_blank');
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <PageWrapper className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        </div>
      </PageWrapper>
    );
  }

  if (!data) return null;

  const paymentTotal = data.payments.reduce((s, p) => s + p.total, 0);

  return (
    <PageWrapper className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 print:p-0">
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="mx-auto max-w-5xl space-y-6">
          {/* Header */}
          <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Daily Summary</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">End-of-day business snapshot</p>
            </div>
            <div className="flex items-center gap-2">
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              <button onClick={handleShare}
                className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700">Share</button>
              <button onClick={handlePrint}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">Print</button>
            </div>
          </motion.div>

          {/* Sales overview */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Total Orders" value={data.sales.total_orders} subValue={`Yesterday: ${data.sales.yesterday_orders}`} />
            <StatCard label="Revenue" value={money(data.sales.total_revenue)} change={data.sales.revenue_change} color="emerald" />
            <StatCard label="Avg Order Value" value={money(data.sales.avg_order_value)} color="cyan" />
            <StatCard label="Refunds" value={data.refunds.count} subValue={money(data.refunds.total)} color={data.refunds.count > 0 ? 'red' : 'brand'} />
          </div>

          {/* Payment breakdown */}
          <motion.div variants={fadeUp} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Payment Breakdown</h2>
            {data.payments.length === 0 ? (
              <p className="text-sm text-slate-400">No payments recorded</p>
            ) : (
              <>
                <div className="mb-3 flex h-4 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  {data.payments.map((p, i) => {
                    const pct = paymentTotal > 0 ? (p.total / paymentTotal * 100) : 0;
                    const colors = ['bg-brand-500', 'bg-emerald-500', 'bg-amber-500', 'bg-cyan-500'];
                    return <div key={p.payment_method} className={`${colors[i % colors.length]}`} style={{ width: `${pct}%` }} />;
                  })}
                </div>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {data.payments.map(p => (
                    <div key={p.payment_method} className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800">
                      <p className="text-xs text-slate-500 dark:text-slate-400">{PAYMENT_LABELS[p.payment_method] || p.payment_method}</p>
                      <p className="font-mono text-sm font-medium text-slate-900 dark:text-white">{money(p.total)}</p>
                      <p className="text-[10px] text-slate-400">{p.count} transactions</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Items sold */}
            <motion.div variants={fadeUp} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
              <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Top Items Sold</h2>
              {data.items_sold.length === 0 ? <p className="text-sm text-slate-400">No items sold</p> : (
                <div className="space-y-2">
                  {data.items_sold.map((item, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                      <div>
                        <p className="text-sm text-slate-900 dark:text-white">{item.product_name}</p>
                        <p className="text-xs text-slate-400">{item.variant_label}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm font-medium text-slate-900 dark:text-white">{item.qty_sold} units</p>
                        <p className="font-mono text-xs text-slate-400">{money(item.revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Staff activity + New customers + Credit */}
            <div className="space-y-6">
              <motion.div variants={fadeUp} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Staff Activity</h2>
                {data.staff.length === 0 ? <p className="text-sm text-slate-400">No activity</p> : (
                  <div className="space-y-2">
                    {data.staff.map((s, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-slate-700 dark:text-slate-300">{s.full_name}</span>
                        <span className="font-mono text-slate-500">{s.orders_count} orders · {money(s.total_sales)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>

              <motion.div variants={fadeUp} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Credit Activity</h2>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800">
                    <p className="text-xs text-slate-400">Issued</p>
                    <p className="font-mono text-sm font-medium text-red-600 dark:text-red-400">{money(data.credit.issued)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800">
                    <p className="text-xs text-slate-400">Repaid</p>
                    <p className="font-mono text-sm font-medium text-emerald-600 dark:text-emerald-400">{money(data.credit.repaid)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800">
                    <p className="text-xs text-slate-400">Net</p>
                    <p className={`font-mono text-sm font-medium ${data.credit.net_change > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {data.credit.net_change >= 0 ? '+' : ''}{money(data.credit.net_change)}
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div variants={fadeUp} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">New Customers ({data.new_customers.length})</h2>
                {data.new_customers.length === 0 ? <p className="text-sm text-slate-400">No new customers</p> : (
                  <div className="space-y-1">
                    {data.new_customers.map(c => (
                      <div key={c.id} className="flex items-center justify-between text-sm">
                        <span className="text-slate-700 dark:text-slate-300">{c.full_name}</span>
                        <span className="text-xs text-slate-400">{c.customer_type}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
          </div>

          {/* Stock alerts */}
          {data.stock_alerts.length > 0 && (
            <motion.div variants={fadeUp} className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-900/10">
              <h2 className="mb-3 text-sm font-semibold text-amber-900 dark:text-amber-300">Stock Alerts ({data.stock_alerts.length})</h2>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {data.stock_alerts.map(item => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-2 dark:bg-slate-900/40">
                    <div>
                      <p className="text-sm text-slate-900 dark:text-white">{item.product_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.variant_label} · <span className="font-mono">{item.sku}</span></p>
                    </div>
                    <span className={`font-mono text-sm font-bold ${item.current_stock === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                      {item.current_stock}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </PageWrapper>
  );
}
