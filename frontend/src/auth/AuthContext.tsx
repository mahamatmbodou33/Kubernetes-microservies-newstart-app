import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { usersApi, type CreateUserInput } from '../api/users';
import { setAuthUserId } from '../api/client';
import type { User } from '../types';

const STORAGE_KEY = 'newstart.userId';

/**
 * DEVELOPMENT-ONLY authentication.
 *
 * There is no password. The current user id is persisted in localStorage and sent
 * as a bearer identity header. This is a deliberate mock behind a small interface so
 * it can later be replaced by AWS Cognito / OIDC without touching the pages.
 */
export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (input: CreateUserInput) => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const DEMO_SKILLS = ['AWS', 'Docker', 'Linux', 'JavaScript'];

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const applyUser = useCallback((next: User | null) => {
    setUserState(next);
    setAuthUserId(next?.id ?? null);
    if (next) localStorage.setItem(STORAGE_KEY, next.id);
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  // On mount, resume a persisted session if the user still exists.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setLoading(false);
      return;
    }
    setAuthUserId(stored);
    usersApi
      .get(stored)
      .then((u) => applyUser(u))
      .catch(() => applyUser(null))
      .finally(() => setLoading(false));
  }, [applyUser]);

  const login = useCallback(
    async (input: CreateUserInput) => {
      const created = await usersApi.create(input);
      applyUser(created);
    },
    [applyUser],
  );

  const demoLogin = useCallback(async () => {
    const rand = Math.random().toString(36).slice(2, 8);
    const created = await usersApi.create({
      firstName: 'Demo',
      lastName: 'User',
      email: `demo.${rand}@newstart.local`,
      location: 'New Jersey',
      skills: DEMO_SKILLS,
      preferredJobType: 'FULL_TIME',
    });
    applyUser(created);
  }, [applyUser]);

  const refresh = useCallback(async () => {
    if (!user) return;
    const fresh = await usersApi.get(user.id);
    applyUser(fresh);
  }, [user, applyUser]);

  const logout = useCallback(() => applyUser(null), [applyUser]);
  const setUser = useCallback((next: User) => applyUser(next), [applyUser]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, demoLogin, logout, refresh, setUser }),
    [user, loading, login, demoLogin, logout, refresh, setUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
