import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Billing from './pages/Billing';
import Inventory from './pages/Inventory';
import Purchasing from './pages/Purchasing';
import PurchaseOrderDetail from './pages/PurchaseOrderDetail';
import Orders from './pages/Orders';
import Customers from './pages/Customers';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import StockToggle from './pages/StockToggle';
import DailySummary from './pages/DailySummary';
import Deliveries from './pages/Deliveries';
import Promotions from './pages/Promotions';
import Conversations from './pages/Conversations';
import WebsiteContent from './pages/WebsiteContent';
import ProtectedRoute from './components/ProtectedRoute';
import PermissionRoute from './components/PermissionRoute';
import Sidebar from './components/Sidebar';
import { useAuth } from './context/AuthContext';

function DefaultRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'owner' ? '/dashboard' : '/billing'} replace />;
}

function AppLayout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden pb-14 lg:pb-0">
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
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/login" element={<Login />} />
        </Routes>
      </AnimatePresence>
    );
  }

  return (
    <AppLayout>
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
          <Route path="/reports" element={<PermissionRoute permission="reports"><Reports /></PermissionRoute>} />
          <Route path="/stock-toggle" element={<PermissionRoute permission="inventory"><StockToggle /></PermissionRoute>} />
          <Route path="/daily-summary" element={<PermissionRoute permission="reports"><DailySummary /></PermissionRoute>} />
          <Route path="/deliveries" element={<PermissionRoute permission="deliveries"><Deliveries /></PermissionRoute>} />
          <Route path="/promotions" element={<PermissionRoute permission="inventory"><Promotions /></PermissionRoute>} />
          <Route path="/conversations" element={<PermissionRoute permission="reports"><Conversations /></PermissionRoute>} />
          <Route path="*" element={<DefaultRedirect />} />
        </Routes>
      </AnimatePresence>
    </AppLayout>
  );
}
