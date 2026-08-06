import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import client from '../api/client';
import PageWrapper, { staggerContainer, fadeUp } from '../components/PageWrapper';

function money(n) { return `Rs. ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`; }

const CHECK_META = {
  credit_balance:       { icon: '💳', desc: 'customers.credit_balance vs SUM(customer_ledger.credit_delta)' },
  points_balance:       { icon: '⭐', desc: 'customers.loyalty_points_balance vs SUM(customer_ledger.points_delta)' },
  stock_balance:        { icon: '📦', desc: 'product_variants.current_stock vs net SUM(stock_movements)' },
  payment_mismatch:     { icon: '💰', desc: 'SUM(order_payments.amount) vs orders.grand_total' },
  revenue_consistency:  { icon: '📊', desc: 'Sales-report revenue vs Profit-report revenue (last 30 days)' },
  underpriced:          { icon: '🏷️', desc: 'Active variants where retail_price ≤ cost_price' },
  points_reversal:      { icon: '🔄', desc: 'Refunded orders with no offsetting points reversal' },
  order_number_format:  { icon: '🔢', desc: 'Order numbers not matching ORD-YYYY-NNNNNN format' },
  malformed_data:       { icon: '⚠️', desc: 'Negative stock, NULL cost snapshots, orphaned records' },
};

const FIX_ENDPOINTS = {
  credit_balance: '/reports/data-health/fix-credit',
  points_balance: '/reports/data-health/fix-points',
  stock_balance:  '/reports/data-health/fix-stock',
};

function StatusBadge({ count }) {
  if (count === 0) return <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">✅ Pass</span>;
  return <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400">❌ {count} issue{count > 1 ? 's' : ''}</span>;
}

function DetailTable({ rows, checkKey }) {
  if (!rows || rows.length === 0) return <p className="py-3 text-center text-sm text-slate-400">No issues found</p>;

  const cols = Object.keys(rows[0]).filter(k => k !== 'id' && k !== 'type');

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            {cols.map(c => (
              <th key={c} className="px-3 py-2 font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id || i} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
              {cols.map(c => (
                <td key={c} className="px-3 py-2 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  {typeof row[c] === 'number' && (c.includes('balance') || c.includes('price') || c.includes('total') || c.includes('drift') || c.includes('revenue') || c.includes('margin') || c.includes('amount') || c.includes('diff'))
                    ? money(row[c])
                    : row[c] instanceof Date ? new Date(row[c]).toLocaleDateString()
                    : String(row[c] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CheckCard({ checkKey, data, onFix }) {
  const [expanded, setExpanded] = useState(false);
  const [fixing, setFixing] = useState(false);
  const meta = CHECK_META[checkKey] || { icon: '🔍', desc: checkKey };
  const count = data.rows.length;
  const status = count === 0 ? 'pass' : 'fail';

  async function handleFix() {
    if (!confirm(`Recalculate all ${data.name} from ledger/movements? This cannot be undone.`)) return;
    setFixing(true);
    try {
      const res = await client.post(FIX_ENDPOINTS[checkKey]);
      alert(`Fixed ${res.data.data.fixed} records. Re-running checks...`);
      onFix();
    } catch (err) {
      alert('Fix failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setFixing(false);
    }
  }

  return (
    <motion.div variants={fadeUp} className={`rounded-2xl border ${status === 'pass' ? 'border-emerald-200 dark:border-emerald-900/50' : 'border-red-200 dark:border-red-900/50'} bg-white dark:bg-slate-900 overflow-hidden`}>
      <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center gap-3 px-5 py-4 text-left">
        <span className="text-xl">{meta.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{data.name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{meta.desc}</p>
        </div>
        <StatusBadge count={count} />
        <svg className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="border-t border-slate-100 dark:border-slate-800 px-5 pb-4">
              {data.fixable && count > 0 && (
                <div className="mt-3 mb-2">
                  <button
                    onClick={handleFix}
                    disabled={fixing}
                    className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                  >
                    {fixing ? 'Recalculating...' : `Recalculate from source (${count} records)`}
                  </button>
                </div>
              )}
              <DetailTable rows={data.rows} checkKey={checkKey} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function DataHealth() {
  const [checks, setChecks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRun, setLastRun] = useState(null);

  function runChecks() {
    setLoading(true);
    client.get('/reports/data-health')
      .then(r => { setChecks(r.data.data); setLastRun(new Date()); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { runChecks(); }, []);

  const totalIssues = checks ? Object.values(checks).reduce((s, c) => s + c.rows.length, 0) : 0;
  const passCount = checks ? Object.values(checks).filter(c => c.rows.length === 0).length : 0;
  const failCount = checks ? Object.values(checks).filter(c => c.rows.length > 0).length : 0;

  return (
    <PageWrapper className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="mx-auto max-w-4xl space-y-5">
          <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Data Health</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {loading ? 'Running checks...' : `${passCount} passed · ${failCount} failed · ${totalIssues} total issues`}
                {lastRun && !loading && <span className="ml-2 text-xs text-slate-400">Last run: {lastRun.toLocaleTimeString()}</span>}
              </p>
            </div>
            <button onClick={runChecks} disabled={loading} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
              {loading ? 'Running...' : 'Re-run Checks'}
            </button>
          </motion.div>

          {loading && !checks && (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
            </div>
          )}

          {checks && (
            <div className="space-y-3">
              {Object.entries(checks).map(([key, data]) => (
                <CheckCard key={key} checkKey={key} data={data} onFix={runChecks} />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </PageWrapper>
  );
}
