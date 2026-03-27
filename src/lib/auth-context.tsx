import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AUTH_CHANGED_EVENT,
  clearAdminSession,
  getAdminToken,
  getAdminUser,
  setAdminSession,
} from '@/lib/auth';

interface AuthContextValue {
  token: string | null;
  user: unknown;
  isAuthenticated: boolean;
  login: (token: string, user: unknown) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getAdminToken());
  const [user, setUser] = useState<unknown>(() => getAdminUser());

  useEffect(() => {
    const syncAuthState = () => {
      setToken(getAdminToken());
      setUser(getAdminUser());
    };

    window.addEventListener(AUTH_CHANGED_EVENT, syncAuthState);
    window.addEventListener('storage', syncAuthState);

    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, syncAuthState);
      window.removeEventListener('storage', syncAuthState);
    };
  }, []);

  const login = useCallback((nextToken: string, nextUser: unknown) => {
    setAdminSession(nextToken, nextUser);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    clearAdminSession();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      login,
      logout,
    }),
    [token, user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
