import { useEffect, useState } from 'react';
import {
  Card,
  OutlineButton,
  PageHeader,
  PrimaryButton,
  SectionLabel,
  StatusPill,
} from '../../components/ui/primitives';
import {
  createAdminAccessToken,
  fetchAdminAccessTokens,
  fetchAdminClients,
  revokeAdminAccessToken,
  type AdminAccessTokenRow,
  type AdminClientRow,
} from '../../api/adminClient';

export function AdminAccessTokensPage() {
  const [tokens, setTokens] = useState<AdminAccessTokenRow[]>([]);
  const [clients, setClients] = useState<AdminClientRow[]>([]);
  const [clientId, setClientId] = useState(1);
  const [label, setLabel] = useState('');
  const [expiresDays, setExpiresDays] = useState(90);
  const [issuedToken, setIssuedToken] = useState('');
  const [error, setError] = useState('');

  function load() {
    Promise.all([fetchAdminAccessTokens(), fetchAdminClients()])
      .then(([t, c]) => {
        setTokens(t);
        setClients(c);
        if (c.length) setClientId(c[0].id);
      })
      .catch(() => setError('Failed to load tokens'));
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate() {
    setError('');
    setIssuedToken('');
    try {
      const result = await createAdminAccessToken({
        client_id: clientId,
        label: label || undefined,
        expires_in_days: expiresDays > 0 ? expiresDays : undefined,
      });
      setIssuedToken(result.token);
      load();
    } catch {
      setError('Could not create token');
    }
  }

  async function onRevoke(id: number) {
    await revokeAdminAccessToken(id);
    load();
  }

  return (
    <div className="px-8 py-8">
      <PageHeader
        title="Access tokens"
        subtitle="Invite links for the client dashboard (stored hashed in the database)."
      />

      <Card className="mb-8 p-6">
        <SectionLabel>Issue token</SectionLabel>
        <div className="grid grid-cols-3 gap-4">
          <label className="text-sm">
            <span className="text-muted">Client</span>
            <select
              className="mt-1 w-full rounded-md border border-border px-3 py-2"
              value={clientId}
              onChange={(e) => setClientId(Number(e.target.value))}
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-muted">Label</span>
            <input
              className="mt-1 w-full rounded-md border border-border px-3 py-2"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Q1 preview"
            />
          </label>
          <label className="text-sm">
            <span className="text-muted">Expires (days, 0 = never)</span>
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded-md border border-border px-3 py-2"
              value={expiresDays}
              onChange={(e) => setExpiresDays(Number(e.target.value))}
            />
          </label>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {issuedToken && (
          <div className="mt-4 rounded-md border border-lime bg-lime/20 p-4 text-sm">
            <div className="text-[11px] font-semibold tracking-wide text-muted uppercase">Copy now — shown once</div>
            <code className="mt-2 block break-all font-mono text-[13px]">{issuedToken}</code>
            <div className="mt-2 text-muted">
              Client URL:{' '}
              <span className="text-ink">{`${window.location.origin}/access/${issuedToken}`}</span>
            </div>
          </div>
        )}
        <PrimaryButton className="mt-4" onClick={() => void onCreate()}>
          GENERATE TOKEN
        </PrimaryButton>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-tan/50 text-[11px] font-semibold tracking-wide text-muted uppercase">
            <tr>
              <th className="px-5 py-3">Client</th>
              <th className="px-5 py-3">Label</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Expires</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tokens.map((t) => (
              <tr key={t.id}>
                <td className="px-5 py-4">{t.client_name}</td>
                <td className="px-5 py-4 text-muted">{t.label ?? '—'}</td>
                <td className="px-5 py-4">
                  <StatusPill label={t.active ? 'active' : 'revoked'} tone={t.active ? 'success' : 'danger'} />
                </td>
                <td className="px-5 py-4 text-muted">{t.expires_at?.slice(0, 10) ?? 'Never'}</td>
                <td className="px-5 py-4 text-right">
                  {t.active && (
                    <OutlineButton onClick={() => void onRevoke(t.id)}>REVOKE</OutlineButton>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
