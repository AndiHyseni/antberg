import type { Catalog, ScoutingOrder } from '../types';

const ACCESS_KEY = 'antberg_access';

export function getAccessToken(): string | null {
  return sessionStorage.getItem(ACCESS_KEY);
}

export function setAccessToken(token: string) {
  sessionStorage.setItem(ACCESS_KEY, token);
}

export function clearAccessToken() {
  sessionStorage.removeItem(ACCESS_KEY);
}

export async function validateAccess(token: string): Promise<boolean> {
  try {
    const res = await fetch('/api/access/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token.trim() }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data.valid);
  } catch {
    return false;
  }
}

export type AccessValidationResult = 'valid' | 'invalid' | 'unreachable';

export async function validateAccessDetailed(token: string): Promise<AccessValidationResult> {
  try {
    const res = await fetch('/api/access/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token.trim() }),
    });
    if (!res.ok) return 'unreachable';
    const data = await res.json();
    return data.valid ? 'valid' : 'invalid';
  } catch {
    return 'unreachable';
  }
}

export async function fetchCatalog(): Promise<Catalog> {
  const res = await fetch('/api/catalog');
  if (!res.ok) throw new Error('Failed to load catalogue');
  return res.json();
}

export async function submitOrder(order: ScoutingOrder): Promise<Catalog> {
  const res = await fetch('/api/order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      strategy: order.strategy,
      city: order.city,
      state: order.state,
      ticket: { min: order.ticketMin, max: order.ticketMax },
      assetTypes: order.assetTypes,
      signals: order.signals,
    }),
  });
  if (!res.ok) throw new Error('Order failed');
  const data = await res.json();
  return data.catalog;
}

export async function fetchEvaluations(): Promise<
  {
    eval_id?: string;
    object_id?: string;
    report?: { bank_value?: { low: number }; recommendation?: string };
  }[]
> {
  const res = await fetch('/api/evaluations');
  if (!res.ok) return [];
  const data = await res.json();
  return data.evaluations ?? [];
}

export function displayCode(objectId: string): string {
  const tail = objectId.replace(/\D/g, '').slice(-3).padStart(3, '0');
  return `#A-${tail}`;
}

export function parseTicketMid(ticketRange: string): string {
  const nums = ticketRange.match(/[\d.,]+/g);
  if (!nums?.length) return '—';
  const parse = (s: string) => Number(s.replace(/\./g, '').replace(',', '.'));
  const a = parse(nums[0]);
  const b = nums[1] ? parse(nums[1]) : a;
  const mid = (a + b) / 2;
  if (mid >= 1_000_000) return `€${(mid / 1_000_000).toFixed(1)}M`;
  return `€${Math.round(mid / 1000)}K`;
}

export function upsideFromDossier(d: { values?: { upside_low?: number; upside_high?: number; today?: number } }): string {
  const today = d.values?.today ?? 0;
  const low = d.values?.upside_low ?? 0;
  const high = d.values?.upside_high ?? 0;
  if (!today) return '—';
  const pctLow = Math.round((low / today) * 100);
  const pctHigh = Math.round((high / today) * 100);
  return `+${pctLow}–${pctHigh}%`;
}

export interface ScoutingOrderRow {
  id?: number;
  name: string;
  thesis?: string;
  region?: string;
  ticket?: string;
  matches?: number;
  activity?: string;
  submitted?: string;
  saved?: string;
  completed?: string;
  status?: string;
}

export interface PipelineItem {
  id: string;
  code: string;
  location: string;
  stage: string;
  stageIdx: number;
  pct: number;
  risk: 'low' | 'medium' | 'high';
  agent: string;
  updated: string;
  next: string;
  missing: string;
  stages: string[];
}

export interface DocumentRow {
  name: string;
  category: string;
  object: string;
  status: string;
  tone: 'success' | 'warning' | 'danger' | 'neutral';
  date: string;
  size: string;
}

export interface SavedItem {
  id: string;
  code: string;
  location: string;
  type: string;
  thesis: string;
  risk: 'low' | 'medium' | 'high';
  score: number;
  ticket: string;
}

export interface NotificationRow {
  id: string;
  category: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface OverviewPayload {
  stats: {
    active_searches: number;
    catalog_total: number;
    selected_count: number;
    pipeline_count: number;
    pipeline_capital: number;
  } | null;
  activity: { text: string; time: string }[];
  pipeline: { id: string; code: string; place: string; status: string; pct: number }[];
}

export async function fetchSelections(): Promise<string[]> {
  const res = await fetch('/api/selections');
  if (!res.ok) return [];
  const data = await res.json();
  return data.selections ?? [];
}

export async function toggleSelectionApi(objectId: string): Promise<{ selected: boolean }> {
  const res = await fetch('/api/selections/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ object_id: objectId }),
  });
  if (!res.ok) throw new Error('Selection failed');
  return res.json();
}

export async function clearSelectionsApi(): Promise<void> {
  await fetch('/api/selections', { method: 'DELETE' });
}

export async function fetchScoutingOrders(
  status?: 'active' | 'draft' | 'completed'
): Promise<ScoutingOrderRow[]> {
  const q = status ? `?status=${status}` : '';
  const res = await fetch(`/api/scouting-orders${q}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.orders ?? [];
}

export async function saveDraftOrderApi(
  order: ScoutingOrder,
  estimatedScanScope?: number
): Promise<void> {
  await fetch('/api/scouting-orders/draft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...order, estimatedScanScope }),
  });
}

export async function fetchPipeline(): Promise<PipelineItem[]> {
  const res = await fetch('/api/pipeline');
  if (!res.ok) return [];
  const data = await res.json();
  return data.items ?? [];
}

export async function fetchDocuments(): Promise<DocumentRow[]> {
  const res = await fetch('/api/documents');
  if (!res.ok) return [];
  const data = await res.json();
  return data.documents ?? [];
}

export async function fetchSaved(): Promise<SavedItem[]> {
  const res = await fetch('/api/saved');
  if (!res.ok) return [];
  const data = await res.json();
  return data.items ?? [];
}

export async function fetchNotifications(): Promise<NotificationRow[]> {
  const res = await fetch('/api/notifications');
  if (!res.ok) return [];
  const data = await res.json();
  return data.notifications ?? [];
}

export async function markNotificationsRead(): Promise<void> {
  await fetch('/api/notifications/read', { method: 'POST' });
}

export async function fetchOverview(): Promise<OverviewPayload> {
  const res = await fetch('/api/overview');
  if (!res.ok) return { stats: null, activity: [], pipeline: [] };
  return res.json();
}

export async function fetchMandateSummary(): Promise<
  {
    object_id: string;
    district: string;
    score: number;
    thesis: string;
    ticket_low_eur: number;
    ticket_high_eur: number;
  }[]
> {
  const res = await fetch('/api/mandate/summary');
  if (!res.ok) return [];
  const data = await res.json();
  return data.items ?? [];
}
