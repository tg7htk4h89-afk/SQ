import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { post, tokens } from './api';

export type Role = 'ADMIN' | 'SUPERVISOR' | 'INSPECTOR';
export interface User { id: string; username: string; fullName: string; role: Role }

interface AuthValue {
  user: User | null;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  can: (...roles: Role[]) => boolean;
}

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem('bsq.user');
    return raw ? (JSON.parse(raw) as User) : null;
  });

  useEffect(() => {
    const onSignedOut = () => setUser(null);
    window.addEventListener('bsq:signed-out', onSignedOut);
    return () => window.removeEventListener('bsq:signed-out', onSignedOut);
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    const data = await post<{ accessToken: string; refreshToken: string; user: User }>('/auth/login', {
      username,
      password,
    });
    tokens.set(data.accessToken, data.refreshToken);
    localStorage.setItem('bsq.user', JSON.stringify(data.user));
    setUser(data.user);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await post('/auth/logout', { refreshToken: tokens.refresh });
    } catch {
      // Signing out locally matters more than telling the server about it.
    }
    tokens.clear();
    setUser(null);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ user, signIn, signOut, can: (...roles) => Boolean(user && roles.includes(user.role)) }),
    [user, signIn, signOut],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
