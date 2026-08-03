import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState, type FormEvent } from 'react';
import {
  adminLogin,
  fetchAdminMe,
  getAdminToken,
  getAdminUser,
} from '../../api/adminClient';
import { AntbergLogo } from '../ui/AntbergLogo';
import { PrimaryButton } from '../ui/primitives';

export function AdminGate() {
  const token = getAdminToken();
  const [ready, setReady] = useState(false);
  const [valid, setValid] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setReady(true);
      setValid(false);
      return;
    }
    fetchAdminMe()
      .then((user) => setValid(Boolean(user)))
      .finally(() => setReady(true));
  }, [token]);

  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-sidebar text-white">
        <AntbergLogo />
        <p className="text-sm text-white/70">Checking admin session…</p>
      </div>
    );
  }

  if (!valid) return <Navigate to="/admin/login" replace />;
  return <Outlet />;
}

export function AdminLoginPage() {
  const navigate = useNavigate();
  const existing = getAdminUser();
  const [email, setEmail] = useState(existing?.email ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await adminLogin(email.trim(), password);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar px-6">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex justify-center rounded-lg bg-sidebar px-6 py-4">
          <AntbergLogo />
        </div>
        <div className="mb-2 text-[11px] font-semibold tracking-[0.18em] text-muted">ANTBERG ADMIN</div>
        <h1 className="text-xl font-semibold text-ink">Platform administration</h1>
        <p className="mt-2 text-sm text-muted">Sign in with your admin account. Client access links do not work here.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4 text-left">
          <label className="block">
            <span className="text-[11px] font-semibold tracking-wide text-muted uppercase">Email</span>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-border px-3 py-2.5 text-sm outline-none focus:border-forest"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold tracking-wide text-muted uppercase">Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-border px-3 py-2.5 text-sm outline-none focus:border-forest"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <PrimaryButton type="submit" className="w-full" disabled={loading}>
            {loading ? 'SIGNING IN…' : 'SIGN IN'}
          </PrimaryButton>
        </form>
      </div>
    </div>
  );
}
