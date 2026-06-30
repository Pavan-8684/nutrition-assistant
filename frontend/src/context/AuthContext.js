import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { unwrap } from '../services/api';

const AuthContext = createContext(null);

const readStoredUser = () => {
  const storedUser = localStorage.getItem('nutrition_user');

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('nutrition_token'));
  const [user, setUser] = useState(readStoredUser);
  const [loading, setLoading] = useState(Boolean(token));

  const saveSession = useCallback((payload) => {
    localStorage.setItem('nutrition_token', payload.token);
    localStorage.setItem('nutrition_user', JSON.stringify(payload.user));
    setToken(payload.token);
    setUser(payload.user);
  }, []);

  const login = useCallback(async (credentials) => {
    const payload = unwrap(await api.post('/auth/login', credentials));
    saveSession(payload);
    return payload.user;
  }, [saveSession]);

  const register = useCallback(async (form) => {
    const payload = unwrap(await api.post('/auth/register', form));
    saveSession(payload);
    return payload.user;
  }, [saveSession]);

  const logout = useCallback(() => {
    localStorage.removeItem('nutrition_token');
    localStorage.removeItem('nutrition_user');
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!localStorage.getItem('nutrition_token')) {
      setLoading(false);
      return;
    }

    try {
      const payload = unwrap(await api.get('/auth/me'));
      localStorage.setItem('nutrition_user', JSON.stringify(payload.user));
      setUser(payload.user);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: Boolean(token && user),
      login,
      register,
      logout,
      refreshUser
    }),
    [token, user, loading, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
