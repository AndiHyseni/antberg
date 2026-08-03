import { useEffect, useState } from 'react';
import { Card, OutlineButton, PageHeader, StatusPill } from '../../components/ui/primitives';
import { fetchAdminActivity, type AdminActivityRow } from '../../api/adminClient';

export function AdminActivityPage() {
  const [items, setItems] = useState<AdminActivityRow[]>([]);

  function load() {
    fetchAdminActivity(200).then(setItems).catch(() => {});
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="px-8 py-8">
      <PageHeader title="Activity log" subtitle="Audit trail across clients and platform events." />
      <OutlineButton className="mb-4" onClick={load}>
        REFRESH
      </OutlineButton>
      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-tan/50 text-[11px] font-semibold tracking-wide text-muted uppercase">
            <tr>
              <th className="px-5 py-3">When</th>
              <th className="px-5 py-3">Client</th>
              <th className="px-5 py-3">Action</th>
              <th className="px-5 py-3">Entity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((a) => (
              <tr key={a.id}>
                <td className="px-5 py-4 text-muted whitespace-nowrap">
                  {a.created_at?.replace('T', ' ').slice(0, 16) ?? '—'}
                </td>
                <td className="px-5 py-4">{a.client_name ?? '—'}</td>
                <td className="px-5 py-4">
                  <StatusPill label={a.action.replace(/_/g, ' ')} tone="neutral" />
                </td>
                <td className="px-5 py-4 text-muted">{a.entity_type}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && <div className="px-5 py-10 text-center text-muted">No activity yet.</div>}
      </Card>
    </div>
  );
}
