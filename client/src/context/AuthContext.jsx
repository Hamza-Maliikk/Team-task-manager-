import { createContext, useContext, useEffect, useState } from 'react';
import { authApi, setUnauthorizedHandler } from '../api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// Backend may return the user directly or as { user }
const pickUser = (d) => d?.user ?? d;
// Sirf asli user object (id ke saath) ko "logged in" maana jaye
const isUser = (u) => u && typeof u === 'object' && u.id;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Server kisi bhi request par "Please log in" (401) de to yahan se logout ho jao
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
  }, []);

  useEffect(() => {
    authApi.me()
      .then((d) => { const u = pickUser(d); setUser(isUser(u) ? u : null); })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (data) => setUser(pickUser(await authApi.login(data)));
  const register = async (data) => setUser(pickUser(await authApi.register(data)));
  const logout = async () => {
    await authApi.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}