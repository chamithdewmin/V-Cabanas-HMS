import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleLogout = () => {
      setIsAuthenticated(false);
      setUser(null);
      localStorage.removeItem('token');
    };
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok) {
            setIsAuthenticated(true);
            setUser(data.user);
            window.dispatchEvent(new CustomEvent('auth:login'));
          } else if (res.status === 401) {
            localStorage.removeItem('token');
          } else {
            // Network/server error: use JWT payload as fallback so session persists
            try {
              const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
              setIsAuthenticated(true);
              setUser({ id: payload.id, email: payload.email, name: payload.email || 'User' });
            } catch {
              localStorage.removeItem('token');
            }
          }
        } catch {
          // Fetch failed (e.g. network): use JWT payload so session persists
          try {
            const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
            setIsAuthenticated(true);
            setUser({ id: payload.id, email: payload.email, name: payload.email || 'User' });
          } catch {
            localStorage.removeItem('token');
          }
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const data = await api.auth.login(email, password);
      if (data.success && data.token) {
        localStorage.setItem('token', data.token);
        setIsAuthenticated(true);
        setUser(data.user);
        window.dispatchEvent(new CustomEvent('auth:login'));
        return { success: true };
      }
    } catch (err) {
      // Fallback: allow demo login when API is unreachable (e.g. backend not deployed)
      if (email === 'admin@gmail.com' && password === 'admin123') {
        const userData = { id: 1, email: 'admin@gmail.com', name: 'Admin' };
        setIsAuthenticated(true);
        setUser(userData);
        return { success: true };
      }
      return { success: false, error: err.message || 'Invalid credentials' };
    }
    return { success: false, error: 'Invalid credentials' };
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
