import { useState, type FormEvent } from 'react';
import { Stethoscope } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { await signIn(email, password); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to sign in.'); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
    <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white border border-gray-200 p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-7"><span className="w-11 h-11 bg-primary-600 rounded-xl grid place-items-center"><Stethoscope className="text-white" /></span><div><h1 className="text-xl font-bold text-gray-900">NurseRoster</h1><p className="text-sm text-gray-500">Sign in to manage staff scheduling</p></div></div>
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">Email</label>
      <input id="email" type="email" autoComplete="username" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2.5 mb-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">Password</label>
      <input id="password" type="password" autoComplete="current-password" required maxLength={200} value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2.5 mb-6 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
      <button disabled={busy} className="w-full rounded-lg bg-primary-600 px-4 py-2.5 font-medium text-white hover:bg-primary-700 disabled:opacity-60">{busy ? 'Signing in…' : 'Sign in'}</button>
    </form>
  </main>;
}
