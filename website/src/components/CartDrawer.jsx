import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import api from '../api/client';

function money(n) {
  return `Rs. ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function CartDrawer() {
  const { items, open, setOpen, updateQty, removeItem, itemCount, subtotal } = useCart();
  const [promos, setPromos] = useState([]);
  const [promoDiscount, setPromoDiscount] = useState(0);

  useEffect(() => {
    if (!open || items.length === 0) { setPromos([]); setPromoDiscount(0); return; }
    const timer = setTimeout(() => {
      api.post('/promotions/calculate', {
        items: items.map(i => ({ variantId: i.variantId, qty: i.qty, price: i.price })),
      }).then(r => {
        const auto = (r.data.data.appliedPromotions || []).filter(p => p.promo_type !== 'coupon_code');
        setPromos(auto);
        setPromoDiscount(auto.reduce((s, p) => s + (p.discount || 0), 0));
      }).catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [open, items]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-slate-900/30 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 z-[80] flex h-full w-full max-w-md flex-col border-l border-white/10 bg-white/95 shadow-2xl backdrop-blur-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="h-5 w-5 text-primary-500" />
                <h2 className="text-lg font-semibold text-slate-900">Your Cart</h2>
                {itemCount > 0 && (
                  <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-600">
                    {itemCount}
                  </span>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-50">
                    <ShoppingBag className="h-8 w-8 text-slate-300" />
                  </div>
                  <p className="mb-1 text-lg font-medium text-slate-900">Your cart is empty</p>
                  <p className="mb-6 text-sm text-slate-500">Browse our products and find something you love!</p>
                  <Link
                    to="/shop"
                    onClick={() => setOpen(false)}
                    className="rounded-full bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600 active:scale-[0.98]"
                  >
                    Browse Products
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence>
                    {items.map(item => (
                      <motion.div
                        key={item.key}
                        layout
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                        className="flex gap-3 rounded-2xl border border-slate-100/80 bg-white p-3 shadow-card"
                      >
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-50">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="h-full w-full object-contain" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-xs font-bold text-primary-400">LD</div>
                            </div>
                          )}
                        </div>

                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              {item.brand && (
                                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-primary-500">{item.brand}</p>
                              )}
                              <p className="truncate text-sm font-medium text-slate-900">{item.name}</p>
                              <p className="text-xs text-slate-500">{item.variantLabel}</p>
                            </div>
                            <button
                              onClick={() => removeItem(item.key)}
                              className="shrink-0 rounded-lg p-1 text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="mt-auto flex items-center justify-between pt-2">
                            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white">
                              <button
                                onClick={() => updateQty(item.key, item.qty - 1)}
                                className="rounded-l-xl px-2.5 py-1 text-slate-400 transition hover:text-slate-600"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <motion.span
                                key={item.qty}
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                className="min-w-[28px] text-center font-mono text-sm font-medium text-slate-900"
                              >
                                {item.qty}
                              </motion.span>
                              <button
                                onClick={() => updateQty(item.key, item.qty + 1)}
                                className="rounded-r-xl px-2.5 py-1 text-slate-400 transition hover:text-slate-600"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <div className="text-right">
                              <p className="font-mono text-sm font-semibold text-slate-900">{money(item.price * item.qty)}</p>
                              {item.originalPrice && (
                                <p className="font-mono text-[10px] text-slate-400 line-through">{money(item.originalPrice * item.qty)}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-slate-100 bg-white/80 px-6 py-5 backdrop-blur-sm">
                {promos.length > 0 && (
                  <div className="mb-3 space-y-1.5">
                    {promos.map(p => (
                      <div key={p.id} className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-1.5">
                        <span className="text-[11px] font-medium text-emerald-700">
                          {p.promo_type === 'buy_x_get_y' ? '🎁' : '🏷️'} {p.title}
                        </span>
                        {p.discount > 0 && (
                          <span className="font-mono text-[11px] font-semibold text-emerald-600">−{money(p.discount)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm text-slate-500">Subtotal</span>
                  <span className="font-mono text-sm text-slate-600">{money(subtotal)}</span>
                </div>
                {promoDiscount > 0 && (
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm text-emerald-600">Savings</span>
                    <span className="font-mono text-sm font-semibold text-emerald-600">−{money(promoDiscount)}</span>
                  </div>
                )}
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">Est. Total</span>
                  <span className="font-mono text-lg font-bold text-slate-900">{money(subtotal - promoDiscount)}</span>
                </div>
                <p className="mb-4 text-xs text-slate-400">Delivery calculated at checkout</p>
                <Link
                  to="/checkout"
                  onClick={() => setOpen(false)}
                  className="block w-full rounded-2xl bg-gradient-to-r from-primary-500 to-teal-500 py-3.5 text-center text-sm font-semibold text-white shadow-lg shadow-primary-500/25 transition hover:shadow-xl active:scale-[0.98]"
                >
                  Proceed to Checkout
                </Link>
                <button
                  onClick={() => setOpen(false)}
                  className="mt-2 block w-full py-2 text-center text-sm text-slate-500 transition hover:text-primary-600"
                >
                  Continue Shopping
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
