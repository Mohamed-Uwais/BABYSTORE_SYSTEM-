import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');

  const restoreSession = useCallback(async () => {
    setSessionError('');
    setLoading(true);
    try {
      const token = localStorage.getItem('LITTORA_token');
      if (!token) { setUser(null); return; }
      const res = await client.get('/me');
      if (localStorage.getItem('LITTORA_token') === token) setUser(res.data.data);
    } catch (error) {
      if (error.response?.status === 401) {
        if (!localStorage.getItem('LITTORA_token')) setUser(null);
      }
      else setSessionError('Unable to verify your session. Please retry.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const expire = () => setUser(null);
    window.addEventListener('littora:session-expired', expire);
    restoreSession();
    return () => window.removeEventListener('littora:session-expired', expire);
  }, [restoreSession]);

  async function login(username, password) {
    const res = await client.post('/auth/login', { username, password });
    const { token, user } = res.data.data;
    localStorage.setItem('LITTORA_token', token);
    setUser(user);
    return user;
  }

  function logout() {
    localStorage.removeItem('LITTORA_token');
    setUser(null);
  }

  const hasPermission = useMemo(() => {
    return (...perms) => {
      if (!user) return false;
      if (user.role === 'owner') return true;
      return perms.some(p => user.permissions?.includes(p));
    };
  }, [user]);

  const landingPath = user?.role === 'owner' ? '/dashboard' : ['billing', 'orders', 'inventory', 'purchasing', 'customers', 'reports', 'deliveries', 'settings'].find(p => user?.permissions?.includes(p));

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission, sessionError, restoreSession, landingPath: landingPath ? (landingPath.startsWith('/') ? landingPath : `/${landingPath}`) : null }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
