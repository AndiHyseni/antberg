import { query } from './pool.js';

export async function listClients() {
  const [rows] = await query(
    `SELECT c.id, c.name, c.slug, c.created_at,
            (SELECT COUNT(*) FROM users u WHERE u.client_id = c.id) AS user_count,
            (SELECT COUNT(*) FROM scouting_orders o WHERE o.client_id = c.id) AS order_count
     FROM clients c
     ORDER BY c.name ASC`
  );
  return rows.map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    slug: String(row.slug),
    created_at: row.created_at ? String(row.created_at) : null,
    user_count: Number(row.user_count ?? 0),
    order_count: Number(row.order_count ?? 0),
  }));
}

/**
 * @param {{ name: string; slug: string }} input
 */
export async function createClient(input) {
  const slug = input.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  const [result] = await query(`INSERT INTO clients (name, slug) VALUES (?, ?)`, [
    input.name.trim(),
    slug,
  ]);
  return { id: Number(result.insertId), slug };
}
