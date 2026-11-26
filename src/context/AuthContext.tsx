import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export interface User { id: string; email: string; role: 'admin' | 'scheduler' | 'nurse' }
interface AuthContextValue { user: User | null; loading: boolean; signIn: (email: string, password: string) => Promise<void>; signOut: () => Promise<void> }
const AuthContext = createContext<AuthContextValue | null>(null);

async function request(path: string, init?: RequestInit) {
  const response = await fetch(path, { ...init, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...init?.headers } });
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.error || 'Request failed.'); }
  return response.status === 204 ? null : response.json();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { request('/api/auth/me').then(data => setUser(data.user)).catch(() => setUser(null)).finally(() => setLoading(false)); }, []);
  async function signIn(email: string, password: string) { const data = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); setUser(data.user); }
  async function signOut() { await request('/api/auth/logout', { method: 'POST' }); setUser(null); }
  return <AuthContext.Provider value={{ user, loading, signIn, signOut }}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used within AuthProvider'); return value; }
