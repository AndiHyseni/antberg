import { Navigate, Outlet, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getAccessToken, setAccessToken, validateAccessDetailed } from '../../api/client';

export function AccessGate() {
  const token = getAccessToken();
  if (!token) return <Navigate to="/access" replace />;
  return <Outlet />;
}

export function AccessPage() {
  const { token: routeToken } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(Boolean(routeToken));

  useEffect(() => {
    if (!routeToken) return;
    validateAccessDetailed(routeToken.trim()).then((result) => {
      if (result === 'valid') {
        setAccessToken(routeToken.trim());
        navigate('/', { replace: true });
      } else if (result === 'unreachable') {
        setError('Server is waking up or unreachable. Wait a minute and refresh this page.');
        setChecking(false);
      } else {
        setError('Invalid or expired access link.');
        setChecking(false);
      }
    });
  }, [routeToken, navigate]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sidebar text-white">
        <p className="text-sm text-white/70">Verifying access…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar px-6">
      <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-xl">
        <div className="mb-2 text-[11px] font-semibold tracking-[0.18em] text-muted">ANTBERG PROGRAM</div>
        <h1 className="text-xl font-semibold text-ink">Internal access required</h1>
        <p className="mt-2 text-sm text-muted">
          This platform is invite-only. Open the special link provided by Antberg.
        </p>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
