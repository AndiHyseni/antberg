export interface AdminUser {
  id: number;
  email: string;
  display_name: string;
  role: string;
  client_id: number;
  client_name?: string;
}

const ADMIN_TOKEN_KEY = 'antberg_admin_token';
const ADMIN_USER_KEY = 'antberg_admin_user';

export function getAdminToken(): string | null {
  return sessionStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminSession(token: string, user: AdminUser) {
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  sessionStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
}

export function getAdminUser(): AdminUser | null {
  const raw = sessionStorage.getItem(ADMIN_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminUser;
  } catch {
    return null;
  }
}

export function clearAdminSession() {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  sessionStorage.removeItem(ADMIN_USER_KEY);
}

async function adminFetch(path: string, init: RequestInit = {}) {
  const token = getAdminToken();
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(path, { ...init, headers });
  return res;
}

export async function adminLogin(email: string, password: string): Promise<AdminUser> {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? 'Login failed');
  }
  const data = await res.json();
  setAdminSession(data.token, data.user);
  return data.user;
}

export async function adminLogoutApi(): Promise<void> {
  await adminFetch('/api/admin/logout', { method: 'POST' });
  clearAdminSession();
}

export async function fetchAdminMe(): Promise<AdminUser | null> {
  const res = await adminFetch('/api/admin/me');
  if (!res.ok) {
    clearAdminSession();
    return null;
  }
  const data = await res.json();
  if (data.user) {
    const token = getAdminToken();
    if (token) setAdminSession(token, data.user);
  }
  return data.user ?? null;
}

export interface AdminDatabaseMeta {
  connected: boolean;
  host: string;
  port: number;
  database: string;
  user: string;
}

export interface AdminFileLayer {
  catalog_opportunities: number;
  dossiers: number;
  evaluations_files: number;
  catalog_path: string;
  scan_parcels_scanned: number | null;
  scan_opportunities: number | null;
}

export interface AdminStatsPayload {
  database_connected?: boolean;
  catalog_source?: 'mysql' | 'json';
  message?: string | null;
  database?: AdminDatabaseMeta | null;
  file_layer?: AdminFileLayer | null;
  stats: {
    clients: number;
    active_users: number;
    admins: number;
    active_orders: number;
    properties: number;
    evaluations: number;
    mandates: number;
    access_tokens: number;
    catalog_total?: number;
    dossiers?: number;
  };
  recent_activity: {
    id: number;
    client_name: string;
    entity_type: string;
    action: string;
    detail: unknown;
    created_at: string | null;
  }[];
  clients: { id: number; name: string; slug: string; orders: number }[];
}

export async function fetchAdminStats(): Promise<AdminStatsPayload> {
  const res = await adminFetch('/api/admin/stats');
  if (!res.ok) throw new Error('Failed to load stats');
  return res.json();
}

export interface AdminUserRow {
  id: number;
  client_id: number;
  client_name: string;
  email: string;
  display_name: string;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string | null;
}

export async function fetchAdminUsers(params?: {
  q?: string;
  role?: string;
}): Promise<AdminUserRow[]> {
  const search = new URLSearchParams();
  if (params?.q) search.set('q', params.q);
  if (params?.role) search.set('role', params.role);
  const q = search.toString();
  const res = await adminFetch(`/api/admin/users${q ? `?${q}` : ''}`);
  if (!res.ok) throw new Error('Failed to load users');
  const data = await res.json();
  return data.users ?? [];
}

export async function createAdminUser(input: {
  client_id: number;
  email: string;
  display_name: string;
  role: string;
  password?: string;
}): Promise<void> {
  const res = await adminFetch('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? 'Create failed');
  }
}

export async function updateAdminUser(
  id: number,
  patch: {
    display_name?: string;
    role?: string;
    is_active?: boolean;
    password?: string;
    client_id?: number;
  }
): Promise<void> {
  const res = await adminFetch(`/api/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? 'Update failed');
  }
}

export interface AdminClientRow {
  id: number;
  name: string;
  slug: string;
  created_at: string | null;
  user_count: number;
  order_count: number;
}

export async function fetchAdminClients(): Promise<AdminClientRow[]> {
  const res = await adminFetch('/api/admin/clients');
  if (!res.ok) throw new Error('Failed to load clients');
  const data = await res.json();
  return data.clients ?? [];
}

export async function createAdminClient(name: string, slug: string): Promise<void> {
  const res = await adminFetch('/api/admin/clients', {
    method: 'POST',
    body: JSON.stringify({ name, slug }),
  });
  if (!res.ok) throw new Error('Create client failed');
}

export interface AdminAccessTokenRow {
  id: number;
  client_id: number;
  client_name: string;
  label: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  last_used_at: string | null;
  created_at: string | null;
  active: boolean;
}

export async function fetchAdminAccessTokens(): Promise<AdminAccessTokenRow[]> {
  const res = await adminFetch('/api/admin/access-tokens');
  if (!res.ok) throw new Error('Failed to load tokens');
  const data = await res.json();
  return data.tokens ?? [];
}

export async function createAdminAccessToken(input: {
  client_id: number;
  label?: string;
  expires_in_days?: number;
}): Promise<{ token: string }> {
  const res = await adminFetch('/api/admin/access-tokens', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Create token failed');
  return res.json();
}

export async function revokeAdminAccessToken(id: number): Promise<void> {
  const res = await adminFetch(`/api/admin/access-tokens/${id}/revoke`, { method: 'POST' });
  if (!res.ok) throw new Error('Revoke failed');
}

export interface AdminActivityRow {
  id: number;
  client_name: string | null;
  entity_type: string;
  action: string;
  detail: unknown;
  created_at: string | null;
}

export async function fetchAdminActivity(limit = 100): Promise<AdminActivityRow[]> {
  const res = await adminFetch(`/api/admin/activity?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to load activity');
  const data = await res.json();
  return data.items ?? [];
}

export function adminInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
