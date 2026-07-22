import { useCallback, useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import client from '../api/client';

const ZONE_1 = [
  { to: '/billing', label: 'Billing', perm: 'billing', icon: 'cart' },
  { to: '/orders', label: 'Orders / Packing', perm: 'orders', icon: 'package' },
  { to: '/deliveries', label: 'Deliveries', perm: 'deliveries', icon: 'truck' },
  { to: '/quotations', label: 'Quotations', perm: 'billing', icon: 'quote' },
];

const ZONE_2 = [
  { to: '/dashboard', label: 'Dashboard', perm: 'reports', icon: 'chart' },
  { to: '/customers', label: 'Customers', perm: 'customers', icon: 'users' },
  { to: '/inventory', label: 'Inventory', perm: 'inventory', icon: 'boxes' },
  { to: '/promotions', label: 'Promotions', perm: 'inventory', icon: 'tag' },
  { to: '/purchasing', label: 'Purchasing', perm: 'purchasing', icon: 'shopping' },
  { to: '/reports', label: 'Reports', perm: 'reports', icon: 'bar-chart' },
  { to: '/daily-summary', label: 'Daily Summary', perm: 'reports', icon: 'calendar' },
  { to: '/conversations', label: 'Conversations', perm: 'reports', icon: 'chat' },
];

const ZONE_3 = [
  { to: '/settings', label: 'Store Details', perm: 'settings', icon: 'store' },
  { to: '/settings/content', label: 'Website Content', perm: 'settings', icon: 'globe' },
];

function NavIcon({ type, className }) {
  const c = className || 'h-5 w-5';
  const props = { className: c, fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (type) {
    case 'cart': return <svg {...props}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>;
    case 'package': return <svg {...props}><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>;
    case 'truck': return <svg {...props}><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8zM5 18a2 2 0 1 0 4 0 2 2 0 0 0-4 0zM17 18a2 2 0 1 0 4 0 2 2 0 0 0-4 0z"/></svg>;
    case 'chart': return <svg {...props}><rect x="18" y="3" width="4" height="18" rx="1"/><rect x="10" y="8" width="4" height="13" rx="1"/><rect x="2" y="13" width="4" height="8" rx="1"/></svg>;
    case 'users': return <svg {...props}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case 'boxes': return <svg {...props}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"/></svg>;
    case 'tag': return <svg {...props}><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>;
    case 'shopping': return <svg {...props}><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0"/></svg>;
    case 'chat': return <svg {...props}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
    case 'bar-chart': return <svg {...props}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
    case 'calendar': return <svg {...props}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
    case 'store': return <svg {...props}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
    case 'globe': return <svg {...props}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
    case 'settings': return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
    case 'chevron': return <svg {...props}><polyline points="6 9 12 15 18 9"/></svg>;
    case 'collapse': return <svg {...props}><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>;
    case 'quote': return <svg {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
    case 'expand': return <svg {...props}><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>;
    default: return null;
  }
}

function Badge({ count, urgent }) {
  if (!count) return null;
  return (
    <span className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${urgent ? 'bg-red-500' : 'bg-amber-500'}`}>
      {count > 99 ? '99+' : count}
    </span>
  );
}

export default function Sidebar() {
  const { user, logout, hasPermission } = useAuth();
  const { theme, toggle } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mgmtOpen, setMgmtOpen] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);
  const [showNotifs, setShowNotifs] = useState(false);

  const [lowStockItems, setLowStockItems] = useState([]);
  const [packingQueue, setPackingQueue] = useState([]);
  const [chatbotAlerts, setChatbotAlerts] = useState({ active_conversations: 0, chatbot_orders: [] });

  useEffect(() => {
    client.get('/settings').then((res) => {
      const url = res.data.data?.logo_url;
      if (url) setLogoUrl(url);
    }).catch(() => {});
  }, []);

  const fetchAlerts = useCallback(() => {
    client.get('/insights/low-stock-reorder').then(r => setLowStockItems(r.data.data || [])).catch(() => {});
    client.get('/insights/packing-queue').then(r => setPackingQueue(r.data.data || [])).catch(() => {});
    client.get('/chatbot/chatbot-alerts').then(r => setChatbotAlerts(r.data.data || { active_conversations: 0, chatbot_orders: [] })).catch(() => {});
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // click-outside removed; backdrop overlay handles dismiss

  const hasZeroStock = lowStockItems.some(i => i.is_zero);
  const isOwner = user?.role === 'owner';
  const notifCount = (chatbotAlerts.chatbot_orders?.length || 0) + chatbotAlerts.active_conversations;

  const zone1 = ZONE_1.filter(l => hasPermission(l.perm));
  const zone2 = ZONE_2.filter(l => hasPermission(l.perm));
  const zone3 = ZONE_3.filter(l => hasPermission(l.perm));

  const linkClass = (isActive) =>
    `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'bg-brand-50 text-brand-700 shadow-sm dark:bg-brand-900/40 dark:text-brand-300'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
    }`;

  function renderLink(item) {
    return (
      <NavLink
        key={item.to}
        to={item.to}
        onClick={() => setMobileOpen(false)}
        className={({ isActive }) => linkClass(isActive)}
        title={collapsed ? item.label : undefined}
      >
        <NavIcon type={item.icon} className="h-[18px] w-[18px] shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
        {item.to === '/orders' && packingQueue.length > 0 && !collapsed && (
          <Badge count={packingQueue.length} />
        )}
        {item.to === '/conversations' && chatbotAlerts.active_conversations > 0 && !collapsed && (
          <Badge count={chatbotAlerts.active_conversations} />
        )}
      </NavLink>
    );
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className={`flex items-center border-b border-slate-200 dark:border-slate-800 ${collapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-3'}`}>
        {logoUrl ? (
          <img src={logoUrl} alt="Store logo" className="h-8 w-8 rounded-lg object-contain" />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white shadow-sm">
            BS
          </div>
        )}
        {!collapsed && <span className="font-semibold text-slate-900 dark:text-white">LITTORA</span>}
        {!collapsed && (
          <button onClick={() => setCollapsed(true)} className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hidden lg:block" title="Collapse sidebar">
            <NavIcon type="collapse" className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {/* Zone 1: Daily Operations */}
        {!collapsed && <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Daily</p>}
        {zone1.map(renderLink)}

        {/* Zone 2: Management */}
        {isOwner && zone2.length > 0 && (
          <>
            {collapsed ? (
              <div className="my-2 mx-1 border-t border-slate-200 dark:border-slate-700" />
            ) : (
              <button
                onClick={() => setMgmtOpen(!mgmtOpen)}
                className="mt-3 flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              >
                Management
                <NavIcon type="chevron" className={`h-3.5 w-3.5 transition-transform ${mgmtOpen ? '' : '-rotate-90'}`} />
              </button>
            )}
            <AnimatePresence initial={false}>
              {(mgmtOpen || collapsed) && (
                <motion.div
                  initial={collapsed ? false : { height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={collapsed ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={collapsed ? '' : 'overflow-hidden'}
                >
                  <div className="space-y-0.5">
                    {zone2.map(renderLink)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* Zone 3: Configuration */}
        {isOwner && zone3.length > 0 && (
          <>
            {collapsed ? (
              <div className="my-2 mx-1 border-t border-slate-200 dark:border-slate-700" />
            ) : (
              <button
                onClick={() => setConfigOpen(!configOpen)}
                className="mt-3 flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              >
                Configuration
                <NavIcon type="chevron" className={`h-3.5 w-3.5 transition-transform ${configOpen ? '' : '-rotate-90'}`} />
              </button>
            )}
            <AnimatePresence initial={false}>
              {(configOpen || collapsed) && (
                <motion.div
                  initial={collapsed ? false : { height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={collapsed ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={collapsed ? '' : 'overflow-hidden'}
                >
                  <div className="space-y-0.5">
                    {zone3.map(renderLink)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </nav>

      {/* Alert badges */}
      {isOwner && (lowStockItems.length > 0 || packingQueue.length > 0) && !collapsed && (
        <div className="mx-2 mb-2 space-y-1.5">
          {lowStockItems.length > 0 && (
            <div className={`rounded-xl px-3 py-2 text-xs font-medium ${hasZeroStock ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'}`}>
              {lowStockItems.length} items need reorder
            </div>
          )}
        </div>
      )}

      {/* Notification bell */}
      {isOwner && (
        <div className={`relative mx-2 mb-2 ${collapsed ? 'flex justify-center' : ''}`}>
          <button
            onClick={(e) => { e.stopPropagation(); setShowNotifs(v => !v); }}
            className="relative rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title="Notifications"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {notifCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {notifCount > 99 ? '99+' : notifCount}
              </span>
            )}
          </button>

          {showNotifs && !collapsed && <div className="fixed inset-0 z-[99]" onClick={() => setShowNotifs(false)} />}
          <AnimatePresence>
            {showNotifs && !collapsed && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="fixed bottom-20 left-2 z-[100] w-72 max-h-[60vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</h3>
                </div>

                {chatbotAlerts.active_conversations > 0 && (
                  <button
                    onClick={() => { setShowNotifs(false); setMobileOpen(false); navigate('/conversations'); }}
                    className="flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm dark:bg-brand-900/30">💬</span>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{chatbotAlerts.active_conversations} active conversations</p>
                      <p className="text-xs text-slate-500">Liya is chatting with customers</p>
                    </div>
                  </button>
                )}

                {chatbotAlerts.chatbot_orders?.length > 0 && (
                  <>
                    <div className="border-b border-slate-100 px-4 py-2 dark:border-slate-800">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Chatbot Orders (24h)</p>
                    </div>
                    {chatbotAlerts.chatbot_orders.map((order, i) => (
                      <button
                        key={i}
                        onClick={() => { setShowNotifs(false); setMobileOpen(false); navigate('/orders'); }}
                        className="flex w-full items-start gap-3 border-b border-slate-50 px-4 py-2.5 text-left transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                      >
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm dark:bg-emerald-900/30">🛒</span>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {order.order_number}
                            {order.grand_total && <span className="ml-1 text-emerald-600 dark:text-emerald-400">Rs. {Number(order.grand_total).toLocaleString()}</span>}
                          </p>
                          <p className="text-xs text-slate-500">{order.full_name || 'Walk-in'} · {order.channel}</p>
                        </div>
                      </button>
                    ))}
                  </>
                )}

                {chatbotAlerts.routing_stats?.length > 0 && (
                  <>
                    <div className="border-b border-slate-100 px-4 py-2 dark:border-slate-800">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">AI Routing (24h)</p>
                    </div>
                    <div className="px-4 py-2.5 space-y-1.5">
                      {chatbotAlerts.routing_stats.map((s, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="capitalize text-slate-600 dark:text-slate-400">{s.handled_by?.replace('_', ' ')}</span>
                          <span className="text-slate-900 dark:text-white font-medium">{s.count} msgs · {s.avg_ms}ms avg</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {notifCount === 0 && (!chatbotAlerts.routing_stats || chatbotAlerts.routing_stats.length === 0) && (
                  <div className="px-4 py-8 text-center text-sm text-slate-400">No notifications</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Footer: user + theme + logout */}
      <div className={`border-t border-slate-200 dark:border-slate-800 ${collapsed ? 'px-2 py-3 flex flex-col items-center gap-2' : 'px-3 py-3'}`}>
        {collapsed ? (
          <>
            <button onClick={toggle} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" title={`${theme === 'dark' ? 'Light' : 'Dark'} mode`}>
              {theme === 'dark' ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="5"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              )}
            </button>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300" title={user?.full_name || user?.username}>
              {(user?.full_name || user?.username)?.[0]?.toUpperCase()}
            </div>
            <button onClick={() => setCollapsed(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" title="Expand sidebar">
              <NavIcon type="expand" className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                  {(user?.full_name || user?.username)?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-white leading-none">{user?.full_name || user?.username}</p>
                  <p className="text-[10px] text-slate-400 capitalize">{user?.role}</p>
                </div>
              </div>
              <button onClick={toggle} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" title={`${theme === 'dark' ? 'Light' : 'Dark'} mode`}>
                {theme === 'dark' ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="5"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                )}
              </button>
            </div>
            <button onClick={logout}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-red-50 hover:border-red-200 hover:text-red-600 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:border-red-900 dark:hover:text-red-400">
              Log out
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'}`}>
        {sidebarContent}
      </aside>

      {/* Mobile bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t border-slate-200 bg-white py-1.5 dark:border-slate-800 dark:bg-slate-900 lg:hidden">
        {zone1.slice(0, 2).map(item => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex flex-col items-center gap-0.5 px-3 py-1 ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'}`}>
            <NavIcon type={item.icon} className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label.split(' ')[0]}</span>
          </NavLink>
        ))}
        <button onClick={() => setMobileOpen(true)} className="flex flex-col items-center gap-0.5 px-3 py-1 text-slate-400">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
          <span className="text-[10px] font-medium">More</span>
        </button>
      </div>

      {/* Mobile slide-out */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 z-[61] flex h-full w-64 flex-col border-r border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 lg:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
