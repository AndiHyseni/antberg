import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, PageHeader, SectionLabel, StatusPill } from '../../components/ui/primitives';
import { fetchAdminStats, type AdminStatsPayload } from '../../api/adminClient';

export function AdminDashboardPage() {
  const [data, setData] = useState<AdminStatsPayload | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAdminStats()
      .then(setData)
      .catch(() => setError('Could not load platform stats. Is MySQL connected?'));
  }, []);

  const stats = data?.stats;

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
          { label: 'EVALUATIONS', value: stats?.evaluations ?? '—' },
          { label: 'MANDATES', value: stats?.mandates ?? '—' },
          { label: 'ADMINS', value: stats?.admins ?? '—' },
          { label: 'ACCESS TOKENS', value: stats?.access_tokens ?? '—' },
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
