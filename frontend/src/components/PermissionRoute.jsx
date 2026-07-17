import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function PermissionRoute({ permission, children }) {
  const { user, loading, hasPermission } = useAuth();
  const toast = useToast();

  const denied = !loading && user && !hasPermission(permission);

  useEffect(() => {
    if (denied) {
      toast.error("You don't have access to that page");
    }
  }, [denied]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-400">
        Loading...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (denied) return <Navigate to="/billing" replace />;

  return children;
}
