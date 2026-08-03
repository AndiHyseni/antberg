import { useCallback, useEffect, useState } from 'react';
import {
  Card,
  OutlineButton,
  PageHeader,
  PrimaryButton,
  SectionLabel,
  StatusPill,
} from '../../components/ui/primitives';
import {
  createAdminUser,
  fetchAdminClients,
  fetchAdminUsers,
  updateAdminUser,
  type AdminClientRow,
  type AdminUserRow,
} from '../../api/adminClient';

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [clients, setClients] = useState<AdminClientRow[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    client_id: 1,
    email: '',
    display_name: '',
    role: 'client',
    password: '',
  });

  const load = useCallback(() => {
    Promise.all([fetchAdminUsers({ q: q || undefined }), fetchAdminClients()])
      .then(([u, c]) => {
        setUsers(u);
        setClients(c);
      })
      .catch(() => setError('Failed to load users'));
  }, [q]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (clients.length && !clients.some((c) => c.id === form.client_id)) {
      setForm((f) => ({ ...f, client_id: clients[0].id }));
    }
  }, [clients, form.client_id]);

  async function onCreate() {
    setError('');
    try {
      await createAdminUser({
        client_id: form.client_id,
        email: form.email,
        display_name: form.display_name,
        role: form.role,
        password: form.role === 'admin' ? form.password : form.password || undefined,
      });
      setShowCreate(false);
      setForm({ client_id: clients[0]?.id ?? 1, email: '', display_name: '', role: 'client', password: '' });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    }
  }

  async function toggleActive(user: AdminUserRow) {
    await updateAdminUser(user.id, { is_active: !user.is_active });
    load();
  }

  return (
    <div className="px-8 py-8">
      <PageHeader
        title="Users"
        subtitle="Platform accounts for clients, analysts, and administrators."
        action={
          <PrimaryButton onClick={() => setShowCreate(true)}>ADD USER</PrimaryButton>
        }
      />

      <div className="mb-6 flex gap-3">
        <input
          type="search"
          placeholder="Search email or name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full max-w-sm rounded-md border border-border px-3 py-2 text-sm"
        />
        <OutlineButton onClick={load}>REFRESH</OutlineButton>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {showCreate && (
        <Card className="mb-6 p-6">
          <SectionLabel>New user</SectionLabel>
          <div className="grid grid-cols-2 gap-4">
            <label className="text-sm">
              <span className="text-muted">Display name</span>
              <input
                className="mt-1 w-full rounded-md border border-border px-3 py-2"
                value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              />
            </label>
            <label className="text-sm">
              <span className="text-muted">Email</span>
              <input
                type="email"
                className="mt-1 w-full rounded-md border border-border px-3 py-2"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label className="text-sm">
              <span className="text-muted">Client</span>
              <select
                className="mt-1 w-full rounded-md border border-border px-3 py-2"
                value={form.client_id}
                onChange={(e) => setForm({ ...form, client_id: Number(e.target.value) })}
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-muted">Role</span>
              <select
                className="mt-1 w-full rounded-md border border-border px-3 py-2"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="client">client</option>
                <option value="analyst">analyst</option>
                <option value="admin">admin</option>
              </select>
            </label>
            {(form.role === 'admin' || form.password) && (
              <label className="col-span-2 text-sm">
                <span className="text-muted">Password {form.role !== 'admin' && '(optional)'}</span>
                <input
                  type="password"
                  className="mt-1 w-full rounded-md border border-border px-3 py-2"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </label>
            )}
          </div>
          <div className="mt-4 flex gap-2">
            <PrimaryButton onClick={() => void onCreate()}>CREATE</PrimaryButton>
            <OutlineButton onClick={() => setShowCreate(false)}>CANCEL</OutlineButton>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-tan/50 text-[11px] font-semibold tracking-wide text-muted uppercase">
            <tr>
              <th className="px-5 py-3">User</th>
              <th className="px-5 py-3">Client</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-5 py-4">
                  <div className="font-medium">{u.display_name}</div>
                  <div className="text-[12px] text-muted">{u.email}</div>
                </td>
                <td className="px-5 py-4 text-muted">{u.client_name}</td>
                <td className="px-5 py-4">
                  <StatusPill
                    label={u.role}
                    tone={u.role === 'admin' ? 'info' : u.role === 'analyst' ? 'warning' : 'neutral'}
                  />
                </td>
                <td className="px-5 py-4">
                  <StatusPill label={u.is_active ? 'active' : 'disabled'} tone={u.is_active ? 'success' : 'danger'} />
                </td>
                <td className="px-5 py-4 text-right">
                  <OutlineButton onClick={() => void toggleActive(u)}>
                    {u.is_active ? 'DISABLE' : 'ENABLE'}
                  </OutlineButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!users.length && <div className="px-5 py-10 text-center text-muted">No users found.</div>}
      </Card>
    </div>
  );
}
