import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function OwnerRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-400">
        Loading...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'owner') return <Navigate to="/billing" replace />;

  return children;
}
