import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import client from '../api/client';

const STEPS_DELIVERY = ['completed', 'confirmed', 'processing', 'packed', 'shipped', 'delivered'];
const STEPS_PICKUP = ['completed'];
const STEP_LABELS = {
  completed: 'Placed', confirmed: 'Confirmed', processing: 'Processing',
  packed: 'Packed', shipped: 'Shipped', delivered: 'Delivered',
  cancelled: 'Cancelled', refunded: 'Refunded', partially_refunded: 'Partial Refund',
};

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-LK', { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' });
}

export default function OrderTimeline({ orderId, fulfillmentType }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    client.get(`/insights/orders/${orderId}/timeline`)
      .then(r => setHistory(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) return <div className="py-2 text-xs text-slate-400">Loading timeline...</div>;

  const isPickup = fulfillmentType === 'pickup' || !fulfillmentType;
  const steps = isPickup ? STEPS_PICKUP : STEPS_DELIVERY;
  const historyMap = {};
  for (const h of history) {
    if (!historyMap[h.status]) historyMap[h.status] = h;
  }

  const currentStatus = history.length > 0 ? history[history.length - 1].status : 'completed';
  const isCancelled = currentStatus === 'cancelled';
  const isRefunded = ['refunded', 'partially_refunded'].includes(currentStatus);
  const currentIdx = steps.indexOf(currentStatus);

  if (isPickup && !isCancelled && !isRefunded) {
    const entry = historyMap['completed'];
    return (
      <div className="flex items-center gap-2 py-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-900 dark:text-white">Completed (Pickup)</p>
          {entry && <p className="text-[10px] text-slate-400">{fmtTime(entry.created_at)}{entry.changed_by_name ? ` · ${entry.changed_by_name}` : ''}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="py-2">
      <div className="flex items-start gap-0">
        {steps.map((step, i) => {
          const entry = historyMap[step];
          const isCompleted = currentIdx >= i;
          const isCurrent = currentIdx === i;

          return (
            <div key={step} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                {i > 0 && (
                  <div className={`h-0.5 flex-1 ${isCompleted ? 'bg-brand-500' : 'border-t border-dashed border-slate-300 dark:border-slate-700'}`} />
                )}
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ delay: i * 0.1, type: 'spring', stiffness: 300 }}
                  className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                    isCompleted
                      ? 'border-brand-500 bg-brand-500 text-white'
                      : 'border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-800'
                  }`}
                >
                  {isCompleted ? (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-[10px] font-bold">{i + 1}</span>
                  )}
                  {isCurrent && (
                    <span className="absolute inset-0 animate-ping rounded-full bg-brand-500 opacity-30" />
                  )}
                </motion.div>
                {i < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 ${currentIdx > i ? 'bg-brand-500' : 'border-t border-dashed border-slate-300 dark:border-slate-700'}`} />
                )}
              </div>
              <p className={`mt-1.5 text-center text-[10px] font-medium leading-tight ${isCompleted ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                {STEP_LABELS[step] || step}
              </p>
              {entry && (
                <p className="mt-0.5 text-center text-[9px] text-slate-400 leading-tight">
                  {fmtTime(entry.created_at)}
                  {entry.changed_by_name && <><br />{entry.changed_by_name}</>}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Cancelled/Refunded branch */}
      {(isCancelled || isRefunded) && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 dark:bg-red-900/20">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium text-red-700 dark:text-red-400">{STEP_LABELS[currentStatus]}</p>
            {historyMap[currentStatus] && (
              <p className="text-[10px] text-red-500 dark:text-red-400/70">
                {fmtTime(historyMap[currentStatus].created_at)}
                {historyMap[currentStatus].changed_by_name && ` · ${historyMap[currentStatus].changed_by_name}`}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
