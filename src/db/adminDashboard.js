import { query } from './pool.js';

export async function getAdminStats() {
  const [[stats]] = await query(
    `SELECT
      (SELECT COUNT(*) FROM clients) AS clients,
      (SELECT COUNT(*) FROM users WHERE is_active = 1) AS active_users,
      (SELECT COUNT(*) FROM users WHERE role = 'admin' AND is_active = 1) AS admins,
      (SELECT COUNT(*) FROM scouting_orders WHERE status IN ('active','scanning')) AS active_orders,
      (SELECT COUNT(*) FROM properties) AS properties,
      (SELECT COUNT(*) FROM evaluations) AS evaluations,
      (SELECT COUNT(*) FROM mandates WHERE status IN ('active','draft')) AS mandates,
      (SELECT COUNT(*) FROM access_tokens WHERE revoked_at IS NULL) AS access_tokens
     FROM DUAL`
  );

  const [recentActivity] = await query(
    `SELECT a.id, a.client_id, c.name AS client_name, a.entity_type, a.action, a.detail_json, a.created_at
     FROM activity_log a
     LEFT JOIN clients c ON c.id = a.client_id
     ORDER BY a.created_at DESC
     LIMIT 15`
  );

  const [clientsBrief] = await query(
    `SELECT c.id, c.name, c.slug,
            (SELECT COUNT(*) FROM scouting_orders o WHERE o.client_id = c.id) AS orders
     FROM clients c
     ORDER BY c.created_at DESC
     LIMIT 8`
  );

  return {
    stats: {
      clients: Number(stats.clients ?? 0),
      active_users: Number(stats.active_users ?? 0),
      admins: Number(stats.admins ?? 0),
      active_orders: Number(stats.active_orders ?? 0),
      properties: Number(stats.properties ?? 0),
      evaluations: Number(stats.evaluations ?? 0),
      mandates: Number(stats.mandates ?? 0),
      access_tokens: Number(stats.access_tokens ?? 0),
    },
    recent_activity: recentActivity.map((row) => ({
      id: Number(row.id),
      client_name: row.client_name ? String(row.client_name) : '—',
      entity_type: String(row.entity_type),
      action: String(row.action),
      detail: parseJson(row.detail_json),
      created_at: row.created_at ? String(row.created_at) : null,
    })),
    clients: clientsBrief.map((row) => ({
      id: Number(row.id),
      name: String(row.name),
      slug: String(row.slug),
      orders: Number(row.orders ?? 0),
    })),
  };
}

/**
 * @param {number} [limit]
 */
export async function listAllActivity(limit = 100) {
  const [rows] = await query(
    `SELECT a.id, a.client_id, c.name AS client_name, a.user_id, a.entity_type, a.entity_id,
            a.action, a.detail_json, a.created_at
     FROM activity_log a
     LEFT JOIN clients c ON c.id = a.client_id
     ORDER BY a.created_at DESC
     LIMIT ?`,
    [limit]
  );
  return rows.map((row) => ({
    id: Number(row.id),
    client_id: row.client_id != null ? Number(row.client_id) : null,
    client_name: row.client_name ? String(row.client_name) : null,
    user_id: row.user_id != null ? Number(row.user_id) : null,
    entity_type: String(row.entity_type),
    entity_id: row.entity_id != null ? Number(row.entity_id) : null,
    action: String(row.action),
    detail: parseJson(row.detail_json),
    created_at: row.created_at ? String(row.created_at) : null,
  }));
}

/**
 * @param {unknown} raw
 */
function parseJson(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(String(raw));
  } catch {
    return null;
  }
}
