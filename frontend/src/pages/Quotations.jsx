import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
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
  cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
};

const TERMINAL_STATES = ['converted', 'rejected', 'expired', 'cancelled'];

export default function Quotations() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');
  const [search, setSearch] = useState('');
  const [previewId, setPreviewId] = useState(null);
  const [converting, setConverting] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await client.get('/quotations');
      setQuotations(res.data.data || []);
    } catch (err) {
      console.error('Failed to load quotations:', err);
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id, status) {
    try {
      await client.patch(`/quotations/${id}/status`, { status });
      toast.success(`Quotation marked as ${status}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  }

  async function convertToOrder(q) {
    if (converting) return;
    setConverting(q.id);

    try {
      const fresh = await client.get(`/quotations/${q.id}`);
      const freshQ = fresh.data.data;
      if (freshQ.status === 'converted') {
        toast.error(`This quotation has already been converted to order ${freshQ.converted_order_number || ''}`);
        load();
        return;
      }
      if (TERMINAL_STATES.includes(freshQ.status)) {
        toast.error(`Cannot convert a ${freshQ.status} quotation`);
        load();
        return;
      }

      const items = typeof freshQ.items === 'string' ? JSON.parse(freshQ.items) : freshQ.items;
      const quotationData = {
        id: freshQ.id,
        quotation_number: freshQ.quotation_number,
        customer_id: freshQ.customer_id,
        customer_name: freshQ.customer_name || q.customer_name,
        customer_phone: freshQ.customer_phone || q.customer_phone,
        pricing_mode: freshQ.pricing_mode || 'retail',
        discount_total: Number(freshQ.discount_total) || 0,
        delivery_fee: Number(freshQ.delivery_fee) || 0,
        items: items.map(i => ({
          variant_id: i.variant_id,
          product_name: i.product_name || i.name,
          variant_name: i.variant_name,
          sku: i.sku,
          quantity: i.quantity,
          unit_price: i.unit_price,
          image_url: i.image_url,
        })),
      };
      localStorage.setItem('LITTORA_convert_quotation', JSON.stringify(quotationData));
      navigate('/billing?from_quotation=' + freshQ.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start conversion');
    } finally {
      setConverting(null);
    }
  }

  const filtered = quotations.filter(q => {
    const isExpired = new Date(q.valid_until) < new Date() && !TERMINAL_STATES.includes(q.status);
    const effectiveStatus = isExpired ? 'expired' : q.status;

    if (filter === 'active') return !TERMINAL_STATES.includes(effectiveStatus);
    if (filter !== 'all' && effectiveStatus !== filter) return false;

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
            <option value="active">Active</option>
            <option value="all">All</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="converted">Converted</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
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
            const isExpired = new Date(q.valid_until) < new Date() && !TERMINAL_STATES.includes(q.status);
            const effectiveStatus = isExpired ? 'expired' : q.status;
            const isTerminal = TERMINAL_STATES.includes(effectiveStatus);
            const isConverted = effectiveStatus === 'converted';

            return (
              <div key={q.id} className={`rounded-2xl border p-4 shadow-sm transition ${
                isTerminal
                  ? 'border-slate-200/60 bg-slate-50 opacity-70 dark:border-slate-700/60 dark:bg-slate-800/60'
                  : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
              }`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">{q.quotation_number}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_COLORS[effectiveStatus] || STATUS_COLORS.draft}`}>
                        {effectiveStatus}
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
                    {isConverted && q.converted_order_number && (
                      <p className="mt-1 flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-400">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                        Converted to <button onClick={() => navigate('/orders')} className="underline hover:text-purple-700 dark:hover:text-purple-300">{q.converted_order_number}</button>
                      </p>
                    )}
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
                  {!isTerminal && (
                    <>
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
                      <button onClick={() => convertToOrder(q)} disabled={converting === q.id}
                        className="rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-100 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-brand-900/30 dark:text-brand-400">
                        {converting === q.id ? 'Converting...' : 'Convert to Order'}
                      </button>
                    </>
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
