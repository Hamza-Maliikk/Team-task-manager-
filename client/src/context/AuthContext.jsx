import { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// Backend may return the user directly or as { user }
const pickUser = (d) => d?.user ?? d;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi.me().then((d) => setUser(pickUser(d))).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);

  const login = async (data) => setUser(pickUser(await authApi.login(data)));
  const register = async (data) => setUser(pickUser(await authApi.register(data)));
  const logout = async () => {
    await authApi.logout().catch(() => {});
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}
