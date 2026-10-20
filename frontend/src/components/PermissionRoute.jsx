import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function PermissionRoute({ permission, children }) {
  const { user, loading, hasPermission, sessionError, restoreSession, landingPath } = useAuth();
  const toast = useToast();

  const denied = !loading && user && !hasPermission(permission);

  useEffect(() => {
    if (denied) {
      toast.error("You don't have access to that page");
    }
  }, [denied, toast]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-400">
        Loading...
      </div>
    );
  }

  if (sessionError) return <div className="p-6 text-slate-500" role="alert">{sessionError} <button type="button" onClick={restoreSession} className="underline">Retry</button></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (denied) return landingPath ? <Navigate to={landingPath} replace /> : <div className="p-6 text-slate-500">No pages are assigned to your account. Please contact the owner.</div>;

  return children;
}
