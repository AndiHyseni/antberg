import { useEffect, useState } from 'react';
import { Card, OutlineButton, PageHeader, PrimaryButton, SectionLabel } from '../../components/ui/primitives';
import { createAdminClient, fetchAdminClients, type AdminClientRow } from '../../api/adminClient';

export function AdminClientsPage() {
  const [clients, setClients] = useState<AdminClientRow[]>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState('');

  function load() {
    fetchAdminClients()
      .then(setClients)
      .catch(() => setError('Failed to load clients'));
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate() {
    setError('');
    try {
      await createAdminClient(name, slug || name);
      setName('');
      setSlug('');
      load();
    } catch {
      setError('Could not create client');
    }
  }

  return (
    <div className="px-8 py-8">
      <PageHeader title="Clients" subtitle="Organisations using the Antberg client program." />

      <Card className="mb-8 p-6">
        <SectionLabel>Add client</SectionLabel>
        <div className="grid grid-cols-2 gap-4">
          <label className="text-sm">
            <span className="text-muted">Name</span>
            <input
              className="mt-1 w-full rounded-md border border-border px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="text-muted">Slug (optional)</span>
            <input
              className="mt-1 w-full rounded-md border border-border px-3 py-2"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="auto-from-name"
            />
          </label>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <PrimaryButton className="mt-4" onClick={() => void onCreate()}>
          CREATE CLIENT
        </PrimaryButton>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-tan/50 text-[11px] font-semibold tracking-wide text-muted uppercase">
            <tr>
              <th className="px-5 py-3">Client</th>
              <th className="px-5 py-3">Users</th>
              <th className="px-5 py-3">Orders</th>
              <th className="px-5 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {clients.map((c) => (
              <tr key={c.id}>
                <td className="px-5 py-4">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-[12px] text-muted">{c.slug}</div>
                </td>
                <td className="px-5 py-4">{c.user_count}</td>
                <td className="px-5 py-4">{c.order_count}</td>
                <td className="px-5 py-4 text-muted">{c.created_at?.slice(0, 10) ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!clients.length && <div className="px-5 py-10 text-center text-muted">No clients yet.</div>}
      </Card>

      <OutlineButton className="mt-4" onClick={load}>
        REFRESH
      </OutlineButton>
    </div>
  );
}
