import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import client from '../api/client';
import { useToast } from '../context/ToastContext';
import Quotation from '../components/Quotation';

function money(n) {
  return `Rs. ${Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  accepted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  expired: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  converted: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
};

export default function Quotations() {
  const toast = useToast();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [previewId, setPreviewId] = useState(null);
  const [converting, setConverting] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await client.get('/quotations');
      setQuotations(res.data.data || []);
    } catch { toast.error('Failed to load quotations'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id, status) {
    try {
      await client.patch(`/quotations/${id}/status`, { status });
      toast.success(`Quotation marked as ${status}`);
      load();
    } catch { toast.error('Failed to update status'); }
  }

  async function convertToOrder(q) {
    setConverting(q.id);
    try {
      const items = typeof q.items === 'string' ? JSON.parse(q.items) : q.items;
      const res = await client.post('/orders/checkout', {
        customer_id: q.customer_id,
        payment_method: 'cash',
        delivery_method: 'pickup',
        pricing_mode: q.pricing_mode,
        delivery_fee: Number(q.delivery_fee) || 0,
        manual_discount: Number(q.discount_total) || 0,
        items: items.map(i => ({
          variant_id: i.variant_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          is_wholesale: q.pricing_mode === 'wholesale',
        })),
      });
      await client.patch(`/quotations/${q.id}/status`, { status: 'converted' });
      toast.success(`Order #${res.data.data?.order_id || ''} created from quotation`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to convert to order');
    } finally { setConverting(null); }
  }

  const filtered = quotations.filter(q => {
    if (filter !== 'all' && q.status !== filter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (q.quotation_number || '').toLowerCase().includes(s) ||
        (q.customer_name || '').toLowerCase().includes(s);
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex h-full flex-col overflow-hidden p-4 lg:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Quotations</h1>
        <div className="flex items-center gap-2">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white w-48" />
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white">
            <option value="all">All</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
            <option value="converted">Converted</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-slate-400">No quotations found</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3">
          {filtered.map(q => {
            const items = typeof q.items === 'string' ? JSON.parse(q.items) : (q.items || []);
            const isExpired = new Date(q.valid_until) < new Date() && !['converted', 'rejected', 'expired'].includes(q.status);
            return (
              <div key={q.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">{q.quotation_number}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_COLORS[isExpired ? 'expired' : q.status] || STATUS_COLORS.draft}`}>
                        {isExpired ? 'Expired' : q.status}
                      </span>
                      {q.pricing_mode === 'wholesale' && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Wholesale</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {q.customer_name || 'Walk-in'} · {new Date(q.created_at).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' })}
                      {' · Valid until '}
                      {new Date(q.valid_until).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      {items.length} item{items.length !== 1 ? 's' : ''} · {items.map(i => `${i.product_name}${i.variant_label ? ' (' + i.variant_label + ')' : ''} x${i.quantity}`).join(', ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-lg font-bold text-teal-700 dark:text-teal-400">{money(q.grand_total)}</p>
                    <p className="text-[10px] text-slate-400">by {q.created_by_name || 'System'}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => setPreviewId(q.id)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
                    View / Print
                  </button>
                  {q.status === 'draft' && (
                    <button onClick={() => updateStatus(q.id, 'sent')}
                      className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400">
                      Mark Sent
                    </button>
                  )}
                  {['draft', 'sent'].includes(q.status) && (
                    <>
                      <button onClick={() => updateStatus(q.id, 'accepted')}
                        className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400">
                        Accept
                      </button>
                      <button onClick={() => updateStatus(q.id, 'rejected')}
                        className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400">
                        Reject
                      </button>
                    </>
                  )}
                  {['draft', 'sent', 'accepted'].includes(q.status) && !isExpired && (
                    <button onClick={() => convertToOrder(q)} disabled={converting === q.id}
                      className="rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-100 disabled:opacity-50 dark:bg-brand-900/30 dark:text-brand-400">
                      {converting === q.id ? 'Converting...' : 'Convert to Order'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {previewId && <Quotation quotationId={previewId} onClose={() => setPreviewId(null)} />}
    </motion.div>
  );
}
