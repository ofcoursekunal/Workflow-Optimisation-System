import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const stored = localStorage.getItem('shopfloor_token');
      const storedUser = localStorage.getItem('shopfloor_user');

      if (stored && storedUser) {
        try {
          // Attach token temporarily for validation
          api.defaults.headers.common['Authorization'] = `Bearer ${stored}`;
          const res = await api.get('/auth/me');

          setToken(stored);
          setUser(res.data); // Use fresh data from DB
          localStorage.setItem('shopfloor_user', JSON.stringify(res.data));
        } catch (err) {
          console.warn('Session invalid, logging out...', err.response?.status || err.message);
          logout();
        }
      } else {
        // If either token or user is missing, ensure state is clean
        logout();
      }
      setLoading(false);
    };
    init();
  }, []);

  const login = (tokenValue, userData) => {
    setToken(tokenValue);
    setUser(userData);
    localStorage.setItem('shopfloor_token', tokenValue);
    localStorage.setItem('shopfloor_user', JSON.stringify(userData));
    api.defaults.headers.common['Authorization'] = `Bearer ${tokenValue}`;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('shopfloor_token');
    localStorage.removeItem('shopfloor_user');
    delete api.defaults.headers.common['Authorization'];
  };

  const getImageUrl = (path) => {
    if (!path) return null;
    const base = api.defaults.baseURL.replace('/api', '');
    const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    return `${cleanBase}${cleanPath}`;
  };

  return (
    <AuthContext.Provider value={{ user, setUser, token, login, logout, loading, getImageUrl }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
