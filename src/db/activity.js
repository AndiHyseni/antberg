import { DEFAULT_CLIENT_ID, query } from './pool.js';

/**
 * @param {number} [clientId]
 * @param {number} [limit]
 */
export async function listNotifications(clientId = DEFAULT_CLIENT_ID, limit = 20) {
  const [rows] = await query(
    `SELECT id, entity_type, action, detail_json, created_at
     FROM activity_log
     WHERE client_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [clientId, limit]
  );

  return rows.map((row) => formatActivityAsNotification(row));
}

/**
 * @param {number} [clientId]
 * @param {number} [limit]
 */
export async function listRecentActivity(clientId = DEFAULT_CLIENT_ID, limit = 10) {
  const [rows] = await query(
    `SELECT entity_type, action, detail_json, created_at
     FROM activity_log
     WHERE client_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [clientId, limit]
  );
  return rows.map((row) => ({
    text: formatActivityText(row),
    time: relativeTime(row.created_at),
  }));
}

/**
 * @param {Record<string, unknown>} row
 */
function formatActivityAsNotification(row) {
  let detail = {};
  try {
    detail = row.detail_json ? JSON.parse(String(row.detail_json)) : {};
  } catch {
    detail = {};
  }

  const mapping = NOTIFICATION_MAP[row.action] ?? {
    category: String(row.entity_type ?? 'SYSTEM').toUpperCase(),
    message: String(detail.message ?? row.action ?? 'Activity recorded'),
  };

  const created = row.created_at ? new Date(String(row.created_at)) : new Date();
  const isRecent = Date.now() - created.getTime() < 48 * 3600000;

  return {
    id: String(row.id),
    category: mapping.category,
    message: mapping.message,
    timestamp: formatTimestamp(created),
    read: !isRecent,
  };
}

/**
 * @param {Record<string, unknown>} row
 */
function formatActivityText(row) {
  let detail = {};
  try {
    detail = row.detail_json ? JSON.parse(String(row.detail_json)) : {};
  } catch {
    detail = {};
  }
  const mapping = NOTIFICATION_MAP[row.action];
  if (mapping) return mapping.message;
  const objectId = detail.object_id ? `#${formatCode(String(detail.object_id))}` : '';
  return `${objectId} — ${row.action}`.trim();
}

/** @type {Record<string, { category: string, message: string }>} */
const NOTIFICATION_MAP = {
  mandate_countersigned: {
    category: 'MANDATE',
    message:
      'Antberg countersigned the buy-side mandate covering #A-058. The object moved to Ownership Research.',
  },
  evaluation_received: {
    category: 'EVALUATION',
    message: 'Bank valuation received for #B-017 — €2.9M market value, confidence Medium.',
  },
  scouting_delivered: {
    category: 'SCOUTING',
    message: '4 new objects delivered on the Stuttgart Metro Value-Add order.',
  },
  document_missing: {
    category: 'DOCUMENTS',
    message: "Grundbuch extract for #A-041 is still outstanding with the owner's counsel.",
  },
  owner_replied: {
    category: 'PIPELINE',
    message: 'Owner of #A-041 replied to outreach — meeting proposed for 31 July.',
  },
  selection_added: {
    category: 'SELECTION',
    message: 'An opportunity was added to your selected list.',
  },
  order_submitted: {
    category: 'SCOUTING',
    message: 'A new scouting order was submitted and is now scanning.',
  },
};

/**
 * @param {string} objectId
 */
function formatCode(objectId) {
  const tail = objectId.replace(/\D/g, '').slice(-3).padStart(3, '0');
  return `A-${tail}`;
}

/**
 * @param {Date | string | null | undefined} date
 */
function relativeTime(date) {
  if (!date) return '—';
  const d = new Date(date);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 60) return `${mins || 1}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * @param {Date | string} date
 */
function formatTimestamp(date) {
  const d = new Date(date);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  if (isToday) return `Today · ${time}`;
  if (isYesterday) return `Yesterday · ${time}`;
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · ${time}`;
}

/**
 * @param {number} [clientId]
 */
export async function markAllNotificationsRead(clientId = DEFAULT_CLIENT_ID) {
  // Activity log has no read flag — client tracks locally; no-op on server for now
  return { ok: true, client_id: clientId };
}

/**
 * @param {number} [clientId]
 */
export async function getOverviewStats(clientId = DEFAULT_CLIENT_ID) {
  const [[stats]] = await query(
    `SELECT
      (SELECT COUNT(*) FROM scouting_orders WHERE client_id = ? AND status IN ('active','scanning')) AS active_searches,
      (SELECT COUNT(*) FROM catalog_items ci
       JOIN scan_runs sr ON sr.id = ci.scan_run_id
       WHERE sr.client_id = ?) AS catalog_total,
      (SELECT COUNT(*) FROM selections WHERE client_id = ? AND status = 'selected') AS selected_count,
      (SELECT COUNT(*) FROM pipeline_items pi JOIN mandates m ON m.id = pi.mandate_id WHERE m.client_id = ?) AS pipeline_count,
      (SELECT COALESCE(SUM(ci.ticket_low_eur), 0) FROM mandate_items mi
       JOIN mandates m ON m.id = mi.mandate_id
       JOIN catalog_items ci ON ci.property_id = mi.property_id
       WHERE m.client_id = ? AND m.status IN ('active','draft')) AS pipeline_capital
     FROM DUAL`,
    [clientId, clientId, clientId, clientId, clientId]
  );
  return stats;
}
