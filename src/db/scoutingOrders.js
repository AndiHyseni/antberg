import { DEFAULT_CLIENT_ID, query } from './pool.js';

/**
 * @param {Record<string, unknown>} body
 * @param {number} [clientId]
 */
export async function createScoutingOrder(body, clientId = DEFAULT_CLIENT_ID) {
  const ticket = /** @type {{ min?: number, max?: number }} */ (body.ticket ?? {});
  const [result] = await query(
    `INSERT INTO scouting_orders (
      client_id, status, strategy_id, strategy_label, country, state, city, radius_km,
      ticket_min_eur, ticket_max_eur, estimated_scan_scope, submitted_at
    ) VALUES (?, 'scanning', ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      clientId,
      String(body.strategy ?? 'value_add'),
      String(body.strategyLabel ?? body.strategy ?? 'value_add'),
      String(body.country ?? 'Germany'),
      body.state != null ? String(body.state) : null,
      String(body.city ?? 'Stuttgart'),
      Number(body.radiusKm ?? 40),
      ticket.min != null ? Number(ticket.min) : null,
      ticket.max != null ? Number(ticket.max) : null,
      body.estimatedScanScope != null ? Number(body.estimatedScanScope) : null,
    ]
  );

  const orderId = result.insertId;
  const assetTypes = Array.isArray(body.assetTypes) ? body.assetTypes : [];
  for (const asset of assetTypes) {
    await query(`INSERT INTO scouting_order_assets (scouting_order_id, asset_type) VALUES (?, ?)`, [
      orderId,
      String(asset),
    ]);
  }

  const signals = Array.isArray(body.signals) ? body.signals : [];
  for (const signal of signals) {
    await query(`INSERT INTO scouting_order_signals (scouting_order_id, signal_name) VALUES (?, ?)`, [
      orderId,
      String(signal),
    ]);
  }

  await query(
    `INSERT INTO activity_log (client_id, entity_type, entity_id, action, detail_json)
     VALUES (?, 'scouting_order', ?, 'order_submitted', ?)`,
    [clientId, orderId, JSON.stringify({ strategy: body.strategy, city: body.city })]
  );

  return orderId;
}

/**
 * @param {string | undefined} statusFilter
 * @param {number} [clientId]
 */
export async function listScoutingOrders(statusFilter, clientId = DEFAULT_CLIENT_ID) {
  let sql = `
    SELECT so.*,
      (SELECT COUNT(*) FROM scan_runs sr WHERE sr.scouting_order_id = so.id) AS scan_count,
      (SELECT sr.opportunities_found FROM scan_runs sr
       WHERE sr.scouting_order_id = so.id ORDER BY sr.generated_at DESC LIMIT 1) AS matches_found
    FROM scouting_orders so
    WHERE so.client_id = ?`;
  const params = [clientId];

  if (statusFilter === 'active') {
    sql += ` AND so.status IN ('active', 'scanning')`;
  } else if (statusFilter === 'draft') {
    sql += ` AND so.status = 'draft'`;
  } else if (statusFilter === 'completed') {
    sql += ` AND so.status = 'completed'`;
  }

  sql += ' ORDER BY so.updated_at DESC';
  const [rows] = await query(sql, params);

  const enriched = [];
  for (const row of rows) {
    const [assets] = await query(
      'SELECT asset_type FROM scouting_order_assets WHERE scouting_order_id = ?',
      [row.id]
    );
    const [signals] = await query(
      'SELECT signal_name FROM scouting_order_signals WHERE scouting_order_id = ?',
      [row.id]
    );
    enriched.push({
      ...row,
      asset_types: assets.map((a) => a.asset_type),
      signals: signals.map((s) => s.signal_name),
    });
  }
  return enriched;
}

/**
 * @param {Record<string, unknown>} order
 * @param {number} [clientId]
 */
export async function saveDraftOrder(order, clientId = DEFAULT_CLIENT_ID) {
  const [result] = await query(
    `INSERT INTO scouting_orders (
      client_id, status, strategy_id, strategy_label, country, state, city, radius_km,
      ticket_min_eur, ticket_max_eur, estimated_scan_scope
    ) VALUES (?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      clientId,
      String(order.strategy ?? 'value_add'),
      String(order.strategyLabel ?? 'Value Add'),
      String(order.country ?? 'Germany'),
      order.state != null ? String(order.state) : null,
      String(order.city ?? 'Stuttgart'),
      Number(order.radiusKm ?? 40),
      order.ticketMin != null ? Number(order.ticketMin) : null,
      order.ticketMax != null ? Number(order.ticketMax) : null,
      order.estimatedScanScope != null ? Number(order.estimatedScanScope) : null,
    ]
  );
  return result.insertId;
}

/**
 * @param {number} orderId
 * @param {number} scanRunId
 */
export async function linkScanToOrder(orderId, scanRunId) {
  await query('UPDATE scan_runs SET scouting_order_id = ? WHERE id = ?', [orderId, scanRunId]);
  await query(
    `UPDATE scouting_orders SET status = 'active', completed_at = NOW() WHERE id = ?`,
    [orderId]
  );
}

/**
 * Format order for API response (matches UI table shape)
 * @param {Record<string, unknown>} row
 */
export function formatOrderForApi(row) {
  const ticketMin = row.ticket_min_eur != null ? Number(row.ticket_min_eur) : null;
  const ticketMax = row.ticket_max_eur != null ? Number(row.ticket_max_eur) : null;
  const fmtM = (n) => `€${Math.round(Number(n) / 1e6)}M`;

  let ticket = '—';
  if (ticketMin != null && ticketMax != null) ticket = `${fmtM(ticketMin)}–${fmtM(ticketMax)}`;
  else if (ticketMax != null) ticket = fmtM(ticketMax);

  const region = row.city
    ? `${row.city}${row.radius_km ? ` ±${row.radius_km}km` : ''}`
    : '—';

  const submittedAt = row.submitted_at ? new Date(String(row.submitted_at)) : null;
  const updatedAt = row.updated_at ? new Date(String(row.updated_at)) : null;
  const daysAgo = submittedAt
    ? Math.max(0, Math.floor((Date.now() - submittedAt.getTime()) / 86400000))
    : null;

  const status = String(row.status);
  let activity = 'Scanning';
  if (status === 'active' && row.matches_found) {
    activity = `+${Math.min(4, Number(row.matches_found))} new matches · updated ${relativeTime(updatedAt)}`;
  } else if (status === 'scanning') {
    activity = `Scanning · updated ${relativeTime(updatedAt)}`;
  } else if (status === 'completed') {
    activity = `Completed · ${row.matches_found ?? 0} matches`;
  }

  return {
    id: row.id,
    name: orderDisplayName(row),
    thesis: row.strategy_label,
    region,
    ticket,
    matches: Number(row.matches_found ?? 0),
    activity,
    submitted: daysAgo != null ? `Submitted ${daysAgo} day${daysAgo === 1 ? '' : 's'} ago` : '',
    status: row.status,
    saved: row.status === 'draft' ? `Saved ${relativeTime(updatedAt)} ago` : undefined,
    completed:
      row.status === 'completed' && row.completed_at
        ? `Completed ${formatDate(new Date(String(row.completed_at)))}`
        : undefined,
  };
}

/**
 * @param {Record<string, unknown>} row
 */
function orderDisplayName(row) {
  const city = String(row.city ?? 'Stuttgart');
  const thesis = String(row.strategy_label ?? 'Value Add');
  if (thesis.toLowerCase().includes('distressed')) return `Baden-Württemberg Distressed`;
  if (thesis.toLowerCase().includes('core')) return `${city} Core Residential`;
  return `${city} Metro ${thesis}`;
}

/**
 * @param {Date | null | undefined} date
 */
function relativeTime(date) {
  if (!date) return 'recently';
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 60) return `${mins || 1}h ago`;
  const days = Math.floor(mins / 1440);
  if (days < 1) return `${Math.floor(mins / 60)}h ago`;
  return `${days}d ago`;
}

/**
 * @param {Date} date
 */
function formatDate(date) {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
