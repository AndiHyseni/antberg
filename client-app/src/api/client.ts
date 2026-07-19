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
  const res = await fetch('/api/access/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  return Boolean(data.valid);
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
