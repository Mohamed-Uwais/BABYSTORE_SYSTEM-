import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Billing = lazy(() => import('./pages/Billing'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Purchasing = lazy(() => import('./pages/Purchasing'));
const PurchaseOrderDetail = lazy(() => import('./pages/PurchaseOrderDetail'));
const Orders = lazy(() => import('./pages/Orders'));
const Customers = lazy(() => import('./pages/Customers'));
const Settings = lazy(() => import('./pages/Settings'));
const Reports = lazy(() => import('./pages/Reports'));
const StockToggle = lazy(() => import('./pages/StockToggle'));
const DailySummary = lazy(() => import('./pages/DailySummary'));
const Deliveries = lazy(() => import('./pages/Deliveries'));
const Promotions = lazy(() => import('./pages/Promotions'));
const Conversations = lazy(() => import('./pages/Conversations'));
const Quotations = lazy(() => import('./pages/Quotations'));
const WebsiteContent = lazy(() => import('./pages/WebsiteContent'));
const DataHealth = lazy(() => import('./pages/DataHealth'));
const Expenses = lazy(() => import('./pages/Expenses'));
import PermissionRoute from './components/PermissionRoute';
import Sidebar from './components/Sidebar';
import { useAuth } from './context/AuthContext';

function DefaultRedirect() {
  const { user, loading, sessionError, restoreSession, landingPath } = useAuth();
  if (loading) return <div className="p-6 text-slate-400">Loading...</div>;
  if (sessionError) return <div role="alert" className="p-6 text-slate-500">{sessionError} <button className="underline" onClick={restoreSession}>Retry</button></div>;
  if (!user) return <Navigate to="/login" replace />;
  return landingPath ? <Navigate to={landingPath} replace /> : <div className="p-6 text-slate-500">No pages are assigned to your account. Please contact the owner.</div>;
}

function AppLayout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-14 lg:pb-0">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const isLogin = location.pathname === '/login';

  if (isLogin) {
    return (
      <Suspense fallback={<div role="status" className="p-6 text-slate-400">Loading...</div>}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/login" element={<Login />} />
        </Routes>
      </AnimatePresence>
      </Suspense>
    );
  }

  return (
    <AppLayout>
      <Suspense fallback={<div role="status" className="p-6 text-slate-400">Loading...</div>}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<PermissionRoute permission="reports"><Dashboard /></PermissionRoute>} />
          <Route path="/billing" element={<PermissionRoute permission="billing"><Billing /></PermissionRoute>} />
          <Route path="/inventory" element={<PermissionRoute permission="inventory"><Inventory /></PermissionRoute>} />
          <Route path="/purchasing" element={<PermissionRoute permission="purchasing"><Purchasing /></PermissionRoute>} />
          <Route path="/purchasing/:id" element={<PermissionRoute permission="purchasing"><PurchaseOrderDetail /></PermissionRoute>} />
          <Route path="/orders" element={<PermissionRoute permission="orders"><Orders /></PermissionRoute>} />
          <Route path="/customers" element={<PermissionRoute permission="customers"><Customers /></PermissionRoute>} />
          <Route path="/settings" element={<PermissionRoute permission="settings"><Settings /></PermissionRoute>} />
          <Route path="/settings/content" element={<PermissionRoute permission="settings"><WebsiteContent /></PermissionRoute>} />
          <Route path="/settings/data-health" element={<PermissionRoute permission="settings"><DataHealth /></PermissionRoute>} />
          <Route path="/reports" element={<PermissionRoute permission="reports"><Reports /></PermissionRoute>} />
          <Route path="/stock-toggle" element={<PermissionRoute permission="inventory"><StockToggle /></PermissionRoute>} />
          <Route path="/daily-summary" element={<PermissionRoute permission="reports"><DailySummary /></PermissionRoute>} />
          <Route path="/deliveries" element={<PermissionRoute permission="deliveries"><Deliveries /></PermissionRoute>} />
          <Route path="/promotions" element={<PermissionRoute permission="inventory"><Promotions /></PermissionRoute>} />
          <Route path="/quotations" element={<PermissionRoute permission="billing"><Quotations /></PermissionRoute>} />
          <Route path="/conversations" element={<PermissionRoute permission="reports"><Conversations /></PermissionRoute>} />
          <Route path="/expenses" element={<PermissionRoute permission="reports"><Expenses /></PermissionRoute>} />
          <Route path="*" element={<DefaultRedirect />} />
        </Routes>
      </AnimatePresence>
      </Suspense>
    </AppLayout>
  );
}
