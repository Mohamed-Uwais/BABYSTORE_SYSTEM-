import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Package, Truck, CheckCircle2, Clock, Loader2, AlertCircle } from 'lucide-react';
import api from '../api/client';
import PageHero from '../components/PageHero';
import SEO from '../components/SEO';

function formatPrice(amount) {
  return `Rs. ${Number(amount).toLocaleString('en-LK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const STATUS_CONFIG = {
  pending: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Order Pending' },
  confirmed: { icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Confirmed' },
  processing: { icon: Package, color: 'text-primary-500', bg: 'bg-primary-50', label: 'Processing' },
  shipped: { icon: Truck, color: 'text-purple-500', bg: 'bg-purple-50', label: 'Shipped' },
  delivered: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Delivered' },
  completed: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Completed' },
  cancelled: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'Cancelled' },
};

export default function TrackOrder() {
  const [searchParams] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(searchParams.get('order') || '');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (searchParams.get('order')) handleSearch(null, searchParams.get('order'));
  }, []);

  const handleSearch = async (e, prefilledOrder) => {
    if (e) e.preventDefault();
    const num = prefilledOrder || orderNumber.trim();
    if (!num) return;
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const params = new URLSearchParams({ order_number: num });
      if (phone.trim()) params.set('phone', phone.trim());
      const res = await api.get(`/track?${params}`);
      setOrder(res.data.data);
    } catch (err) {
      setOrder(null);
      setError(err.response?.data?.message || 'Order not found. Please check your order number.');
    } finally {
      setLoading(false);
    }
  };

  const statusConfig = order ? (STATUS_CONFIG[order.status] || STATUS_CONFIG.pending) : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <SEO title="Track Order" path="/track" description="Track your LITTORA order. Enter your order number to check delivery status." />
      <PageHero backgroundImage="/images/hero/hero-track.jpg" headline="Track Your Order" subtitle="Enter your order number to see delivery status" focusPoint="center 80%" />

      <div className="bg-white py-12">
        <div className="mx-auto max-w-2xl px-4 text-center">

          <form onSubmit={handleSearch} className="mt-8 space-y-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={orderNumber}
                onChange={e => setOrderNumber(e.target.value)}
                placeholder="Enter order number (e.g. ORD-20260713-001)"
                className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 text-sm outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Phone number (optional, for verification)"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
            />
            <button
              type="submit"
              disabled={loading || !orderNumber.trim()}
              className="w-full rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 py-4 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
            >
              {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Track Order'}
            </button>
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8">
        {error && searched && (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-red-400" />
            <p className="mt-2 text-sm font-medium text-red-600">{error}</p>
          </div>
        )}

        {order && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Status card */}
            <div className={`rounded-2xl border p-6 ${statusConfig.bg}`}>
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm ${statusConfig.color}`}>
                  <statusConfig.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className={`text-lg font-bold ${statusConfig.color}`}>{statusConfig.label}</p>
                  <p className="text-sm text-slate-500">Order #{order.order_number}</p>
                </div>
              </div>
              {order.status === 'pending' && (
                <p className="mt-3 text-sm text-amber-700">Your order is being reviewed by our team. We'll confirm it shortly.</p>
              )}
              {order.status === 'confirmed' && (
                <p className="mt-3 text-sm text-blue-700">Order confirmed! We're preparing your package.</p>
              )}
              {order.status === 'cancelled' && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-red-700">Sorry, your order could not be processed.</p>
                  {order.history?.find(h => h.status === 'cancelled')?.notes && (
                    <p className="mt-1 text-sm text-red-600">Reason: {order.history.find(h => h.status === 'cancelled').notes}</p>
                  )}
                </div>
              )}
            </div>

            {/* Order details */}
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900">Order Items</h3>
              <div className="mt-4 space-y-3">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-slate-700">{item.product_name}</p>
                      <p className="text-xs text-slate-400">{item.variant_label} × {item.quantity}</p>
                    </div>
                    <span className="font-mono font-medium text-slate-700">{formatPrice(item.line_total)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-4 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-mono font-medium">{formatPrice(order.subtotal)}</span></div>
                {Number(order.delivery_fee) > 0 && (
                  <div className="flex justify-between"><span className="text-slate-500">Delivery</span><span className="font-mono font-medium">{formatPrice(order.delivery_fee)}</span></div>
                )}
                <div className="flex justify-between border-t border-slate-100 pt-2 font-bold">
                  <span>Total</span><span className="font-mono">{formatPrice(order.grand_total)}</span>
                </div>
              </div>
            </div>

            {/* Timeline */}
            {order.history?.length > 0 && (
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <h3 className="text-base font-bold text-slate-900">Order Timeline</h3>
                <div className="mt-4 space-y-4">
                  {order.history.map((h, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`h-3 w-3 rounded-full ${i === 0 ? 'bg-primary-500' : 'bg-slate-200'}`} />
                        {i < order.history.length - 1 && <div className="h-full w-px bg-slate-200" />}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-medium text-slate-700 capitalize">{h.status.replace('_', ' ')}</p>
                        {h.notes && <p className="text-xs text-slate-400">{h.notes}</p>}
                        <p className="text-xs text-slate-400">{new Date(h.created_at).toLocaleString('en-GB')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
