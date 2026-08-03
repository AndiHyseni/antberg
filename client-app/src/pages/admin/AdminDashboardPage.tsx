import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, PageHeader, SectionLabel, StatusPill } from '../../components/ui/primitives';
import { fetchAdminStats, type AdminStatsPayload } from '../../api/adminClient';

export function AdminDashboardPage() {
  const [data, setData] = useState<AdminStatsPayload | null>(null);
  const [error, setError] = useState('');

  const [info, setInfo] = useState('');

  useEffect(() => {
    fetchAdminStats()
      .then((payload) => {
        setData(payload);
        setError('');
        setInfo('');
        if (payload.database_connected === false && payload.message) {
          setError(payload.message);
        } else if (payload.message) {
          setInfo(payload.message);
        }
      })
      .catch(() =>
        setError(
          'Could not load platform stats. Check /api/version for database status and server logs.'
        )
      );
  }, []);

  const stats = data?.stats;
  const db = data?.database;
  const file = data?.file_layer;

  return (
    <div className="px-8 py-8">
      <PageHeader
        title="Platform overview"
        subtitle="Manage clients, users, and access across the Antberg program."
      />

      {error && (
        <Card className="mb-6 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {error}
        </Card>
      )}
      {info && !error && (
        <Card className="mb-6 border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">{info}</Card>
      )}

      <SectionLabel>Database &amp; data</SectionLabel>
      <Card className="mb-8 grid grid-cols-2 gap-0 divide-x divide-border md:grid-cols-4">
        <div className="p-5">
          <div className="text-[10px] font-semibold tracking-[0.1em] text-muted uppercase">MySQL</div>
          <div className="mt-2 flex items-center gap-2">
            <StatusPill
              label={db?.connected ? 'connected' : 'offline'}
              tone={db?.connected ? 'success' : 'warning'}
            />
          </div>
          <div className="mt-2 text-[12px] text-muted">
            {db ? `${db.user}@${db.host}:${db.port}` : '—'}
          </div>
          <div className="text-[12px] text-muted">Database: {db?.database ?? '—'}</div>
        </div>
        <div className="p-5">
          <div className="text-[10px] font-semibold tracking-[0.1em] text-muted uppercase">
            Catalogue source
          </div>
          <div className="mt-2">
            <StatusPill
              label={data?.catalog_source === 'mysql' ? 'mysql' : 'json file'}
              tone={data?.catalog_source === 'mysql' ? 'success' : 'info'}
            />
          </div>
          <div className="mt-2 text-[12px] text-muted">{file?.catalog_path ?? 'data/catalog.json'}</div>
        </div>
        <div className="p-5">
          <div className="text-[10px] font-semibold tracking-[0.1em] text-muted uppercase">
            Bundled catalogue
          </div>
          <div className="mt-2 text-[28px] font-semibold leading-none">
            {file?.catalog_opportunities ?? '—'}
          </div>
          <div className="mt-1 text-[12px] text-muted">opportunities in JSON</div>
        </div>
        <div className="p-5">
          <div className="text-[10px] font-semibold tracking-[0.1em] text-muted uppercase">
            File evaluations
          </div>
          <div className="mt-2 text-[28px] font-semibold leading-none">
            {file?.evaluations_files ?? '—'}
          </div>
          <div className="mt-1 text-[12px] text-muted">data/evaluations/*.json</div>
        </div>
      </Card>

      <div className="mb-8 grid grid-cols-4 gap-4">
        {[
          { label: 'CLIENTS', value: stats?.clients ?? '—' },
          { label: 'ACTIVE USERS', value: stats?.active_users ?? '—' },
          { label: 'ACTIVE ORDERS', value: stats?.active_orders ?? '—' },
          { label: 'PROPERTIES', value: stats?.properties ?? '—' },
        ].map((kpi) => (
          <Card key={kpi.label} className="p-5">
            <div className="text-[10px] font-semibold tracking-[0.1em] text-muted">{kpi.label}</div>
            <div className="mt-2 text-[28px] font-semibold leading-none">{kpi.value}</div>
          </Card>
        ))}
      </div>

      <div className="mb-8 grid grid-cols-4 gap-4">
        {[
          { label: 'CATALOG (LIVE)', value: stats?.catalog_total ?? stats?.properties ?? '—' },
          { label: 'DOSSIERS', value: stats?.dossiers ?? file?.dossiers ?? '—' },
          { label: 'EVALUATIONS', value: stats?.evaluations ?? '—' },
          { label: 'PROPERTIES (DB)', value: stats?.properties ?? '—' },
        ].map((kpi) => (
          <Card key={kpi.label} className="p-5">
            <div className="text-[10px] font-semibold tracking-[0.1em] text-muted">{kpi.label}</div>
            <div className="mt-2 text-[28px] font-semibold leading-none">{kpi.value}</div>
          </Card>
        ))}
      </div>

      <div className="mb-8 grid grid-cols-4 gap-4">
        {[
          { label: 'MANDATES', value: stats?.mandates ?? '—' },
          { label: 'ADMINS', value: stats?.admins ?? '—' },
          { label: 'ACCESS TOKENS', value: stats?.access_tokens ?? '—' },
          {
            label: 'SCAN OPPS (JSON)',
            value: file?.scan_opportunities != null ? String(file.scan_opportunities) : '—',
          },
        ].map((kpi) => (
          <Card key={kpi.label} className="p-5">
            <div className="text-[10px] font-semibold tracking-[0.1em] text-muted">{kpi.label}</div>
            <div className="mt-2 text-[28px] font-semibold leading-none">{kpi.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <SectionLabel>Clients</SectionLabel>
          <Card className="divide-y divide-border">
            {(data?.clients ?? []).map((c) => (
              <div key={c.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <div className="text-sm font-medium text-ink">{c.name}</div>
                  <div className="text-[12px] text-muted">{c.slug}</div>
                </div>
                <div className="text-[12px] text-muted">{c.orders} orders</div>
              </div>
            ))}
            {!data?.clients?.length && (
              <div className="px-5 py-8 text-center text-sm text-muted">No clients yet.</div>
            )}
          </Card>
          <Link
            to="/admin/clients"
            className="mt-3 inline-block text-[12px] font-semibold text-forest hover:underline"
          >
            MANAGE CLIENTS →
          </Link>
        </div>

        <div>
          <SectionLabel>Recent activity</SectionLabel>
          <Card className="divide-y divide-border">
            {(data?.recent_activity ?? []).slice(0, 8).map((a) => (
              <div key={a.id} className="px-5 py-4">
                <div className="flex items-center gap-2">
                  <StatusPill label={a.action.replace(/_/g, ' ')} tone="neutral" />
                  <span className="text-[11px] text-muted">{a.client_name}</span>
                </div>
                <div className="mt-1 text-[12px] text-muted">{a.entity_type}</div>
              </div>
            ))}
            {!data?.recent_activity?.length && (
              <div className="px-5 py-8 text-center text-sm text-muted">No activity recorded.</div>
            )}
          </Card>
          <Link
            to="/admin/activity"
            className="mt-3 inline-block text-[12px] font-semibold text-forest hover:underline"
          >
            VIEW FULL LOG →
          </Link>
        </div>
      </div>
    </div>
  );
}
