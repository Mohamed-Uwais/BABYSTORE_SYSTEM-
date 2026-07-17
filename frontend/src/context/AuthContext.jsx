import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('LITTORA_token');
    if (!token) {
      setLoading(false);
      return;
    }
    client
      .get('/me')
      .then((res) => setUser(res.data.data))
      .catch(() => {
        localStorage.removeItem('LITTORA_token');
      })
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
