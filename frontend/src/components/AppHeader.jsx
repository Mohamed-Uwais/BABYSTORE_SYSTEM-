import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import client from '../api/client';

function Badge({ count, urgent }) {
  if (!count) return null;
  return (
    <span className={`absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${urgent ? 'bg-red-500' : 'bg-amber-500'}`}>
      {count > 99 ? '99+' : count}
    </span>
  );
}

export default function AppHeader() {
  const { user, logout, hasPermission } = useAuth();
  const { theme, toggle } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);

  const [lowStockItems, setLowStockItems] = useState([]);
  const [packingQueue, setPackingQueue] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [showLowStock, setShowLowStock] = useState(false);
  const [showPacking, setShowPacking] = useState(false);
  const [markingPacked, setMarkingPacked] = useState(null);
  const loginNotified = useRef(false);

  useEffect(() => {
    client.get('/settings').then((res) => {
      const url = res.data.data?.logo_url;
      if (url) setLogoUrl(`/api${url}`);
    }).catch(() => {});
  }, []);

  const fetchAlerts = useCallback(() => {
    client.get('/insights/low-stock-reorder').then(r => setLowStockItems(r.data.data || [])).catch(() => {});
    client.get('/insights/packing-queue').then(r => setPackingQueue(r.data.data || [])).catch(() => {});
    client.get('/orders/pending').then(r => setPendingCount((r.data.data || []).length)).catch(() => {});
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  useEffect(() => {
    if (loginNotified.current) return;
    loginNotified.current = true;
    const timer = setTimeout(() => {
      if (lowStockItems.length > 0) {
        const hasZero = lowStockItems.some(i => i.is_zero);
        toast[hasZero ? 'error' : 'warning'](
          hasZero
            ? `${lowStockItems.length} items need reordering! Some are OUT OF STOCK!`
            : `${lowStockItems.length} items need reordering!`
        );
      }
      if (packingQueue.length > 0) {
        toast.info(`You have ${packingQueue.length} orders to pack!`);
      }
      if (pendingCount > 0) {
        toast.warning(`🛒 ${pendingCount} new order${pendingCount > 1 ? 's' : ''} awaiting approval`);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [lowStockItems.length, packingQueue.length, pendingCount]);

  async function markAsPacked(orderId) {
    setMarkingPacked(orderId);
    try {
      await client.put(`/insights/orders/${orderId}/status`, { status: 'packed', notes: 'Marked as packed' });
      toast.success('Order marked as packed');
      fetchAlerts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally { setMarkingPacked(null); }
  }

  function handleCreatePO() {
    setShowLowStock(false);
    navigate('/purchasing');
  }

  const hasZeroStock = lowStockItems.some(i => i.is_zero);

  const linkClass = ({ isActive }) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
    }`;

  const allLinks = [
    { to: '/dashboard', label: 'Dashboard', perm: 'reports' },
    { to: '/billing', label: 'Billing', perm: 'billing' },
    { to: '/inventory', label: 'Inventory', perm: 'inventory' },
    { to: '/purchasing', label: 'Purchasing', perm: 'purchasing' },
    { to: '/orders', label: 'Orders', perm: 'orders' },
    { to: '/deliveries', label: 'Deliveries', perm: 'deliveries' },
    { to: '/customers', label: 'Customers', perm: 'customers' },
    { to: '/reports', label: 'Reports', perm: 'reports' },
    { to: '/promotions', label: 'Promos', perm: 'inventory' },
    { to: '/daily-summary', label: 'Daily', perm: 'reports' },
    { to: '/settings', label: 'Settings', perm: 'settings' },
  ];
  const links = allLinks.filter(l => hasPermission(l.perm));

  function formatTimeAgo(minutes) {
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return `${Math.floor(minutes / 1440)}d ago`;
  }

  return (
    <header className="relative border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex items-center justify-between px-4 py-2.5 lg:px-6">
        <div className="flex items-center gap-4 lg:gap-6">
          <div className="flex items-center gap-2.5">
            {logoUrl ? (
              <img src={logoUrl} alt="Store logo" className="h-8 w-8 rounded-lg object-contain" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white shadow-sm">
                BS
              </div>
            )}
            <span className="hidden font-semibold text-slate-900 dark:text-white sm:inline">LITTORA</span>
          </div>

          <nav className="hidden items-center gap-0.5 lg:flex">
            {links.map(l => (
              <NavLink key={l.to} to={l.to} className={linkClass}>
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Pending orders */}
          {user?.role === 'owner' && pendingCount > 0 && (
            <button onClick={() => navigate('/orders')}
              className="relative rounded-lg p-2 text-amber-500 transition hover:bg-amber-50 dark:hover:bg-amber-900/20"
              title={`${pendingCount} orders awaiting approval`}>
              <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
              <Badge count={pendingCount} urgent />
            </button>
          )}

          {/* Packing queue icon */}
          {user?.role === 'owner' && (
            <button onClick={() => { setShowPacking(v => !v); setShowLowStock(false); }}
              className="relative rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title="Packing queue">
              <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <Badge count={packingQueue.length} />
            </button>
          )}

          {/* Low stock bell */}
          {user?.role === 'owner' && (
            <button onClick={() => { setShowLowStock(v => !v); setShowPacking(false); }}
              className="relative rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title="Low stock alerts">
              <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <Badge count={lowStockItems.length} urgent={hasZeroStock} />
            </button>
          )}

          {/* Theme toggle */}
          <button onClick={toggle}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            {theme === 'dark' ? (
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="5" /><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            ) : (
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          <div className="hidden items-center gap-2.5 text-sm lg:flex">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
              {(user?.full_name || user?.username)?.[0]?.toUpperCase()}
            </div>
            <span className="text-slate-600 dark:text-slate-300">
              {user?.full_name || user?.username}
            </span>
            <button onClick={logout}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200">
              Log out
            </button>
          </div>

          <button onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>
      </div>

      {/* Notification panels */}
      <AnimatePresence>
        {showLowStock && lowStockItems.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="absolute right-4 top-full z-50 mt-1 w-96 max-h-[70vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Reorder Needed ({lowStockItems.length})</h3>
              <button onClick={handleCreatePO} className="rounded-lg bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-700">Create PO</button>
            </div>
            <div className="divide-y divide-slate-50 dark:divide-slate-800">
              {lowStockItems.map(item => (
                <div key={item.variant_id} className="px-4 py-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{item.product_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.variant_label} · <span className="font-mono">{item.sku}</span></p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.is_zero ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                      {item.current_stock} left
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-400">
                    <span>Threshold: {item.low_stock_threshold}</span>
                    <span>Suggest: +{item.suggested_qty}</span>
                    {item.last_supplier_name && <span>Last: {item.last_supplier_name}</span>}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {showPacking && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="absolute right-4 top-full z-50 mt-1 w-96 max-h-[70vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Packing Queue ({packingQueue.length})</h3>
            </div>
            {packingQueue.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">No orders to pack</div>
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {packingQueue.map(order => (
                  <div key={order.id} className="px-4 py-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          <span className="font-mono">{order.order_number}</span>
                          {order.customer_name && <span className="ml-2 text-slate-500 dark:text-slate-400">· {order.customer_name}</span>}
                        </p>
                        <p className="text-xs text-slate-400">{formatTimeAgo(order.minutes_ago)} · {order.fulfillment_type?.replace('_', ' ')}</p>
                      </div>
                      <button onClick={() => markAsPacked(order.id)} disabled={markingPacked === order.id}
                        className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                        {markingPacked === order.id ? '...' : 'Pack'}
                      </button>
                    </div>
                    <div className="mt-1.5 space-y-0.5">
                      {order.items?.map((item, i) => (
                        <p key={i} className="text-xs text-slate-500 dark:text-slate-400">
                          {item.quantity}x {item.product_name} ({item.variant_label})
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900 lg:hidden"
          >
            <div className="space-y-1 px-4 py-3">
              {links.map(l => (
                <NavLink key={l.to} to={l.to} onClick={() => setMenuOpen(false)} className={({ isActive }) =>
                  `block rounded-lg px-3 py-2 text-sm font-medium ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
                      : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`
                }>
                  {l.label}
                </NavLink>
              ))}
              <div className="border-t border-slate-100 pt-2 dark:border-slate-800">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {user?.full_name || user?.username} ({user?.role})
                  </span>
                  <button onClick={logout} className="text-sm font-medium text-red-500 hover:text-red-600">
                    Log out
                  </button>
                </div>
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
