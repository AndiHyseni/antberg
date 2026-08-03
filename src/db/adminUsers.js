import { query } from './pool.js';
import { hashPassword } from './password.js';

/**
 * @param {{ q?: string; role?: string; clientId?: number }} [filters]
 */
export async function listUsers(filters = {}) {
  const clauses = ['1=1'];
  /** @type {unknown[]} */
  const params = [];

  if (filters.q) {
    clauses.push('(u.email LIKE ? OR u.display_name LIKE ?)');
    const like = `%${filters.q}%`;
    params.push(like, like);
  }
  if (filters.role) {
    clauses.push('u.role = ?');
    params.push(filters.role);
  }
  if (filters.clientId != null) {
    clauses.push('u.client_id = ?');
    params.push(filters.clientId);
  }

  const [rows] = await query(
    `SELECT u.id, u.client_id, c.name AS client_name, u.email, u.display_name, u.role,
            u.is_active, u.last_login_at, u.created_at
     FROM users u
     JOIN clients c ON c.id = u.client_id
     WHERE ${clauses.join(' AND ')}
     ORDER BY u.created_at DESC
     LIMIT 500`,
    params
  );

  return rows.map(formatUserRow);
}

/**
 * @param {{ client_id: number; email: string; display_name: string; role: string; password?: string; is_active?: boolean }} input
 */
export async function createUser(input) {
  const email = input.email.trim().toLowerCase();
  let passwordHash = null;
  if (input.password) {
    passwordHash = await hashPassword(input.password);
  } else if (input.role === 'admin') {
    throw new Error('Password required for admin users');
  }

  const [result] = await query(
    `INSERT INTO users (client_id, email, display_name, role, password_hash, is_active)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.client_id,
      email,
      input.display_name.trim(),
      input.role,
      passwordHash,
      input.is_active === false ? 0 : 1,
    ]
  );

  return { id: Number(result.insertId) };
}

/**
 * @param {number} userId
 * @param {{ display_name?: string; role?: string; is_active?: boolean; password?: string; client_id?: number }} patch
 */
export async function updateUser(userId, patch) {
  /** @type {string[]} */
  const sets = [];
  /** @type {unknown[]} */
  const params = [];

  if (patch.display_name != null) {
    sets.push('display_name = ?');
    params.push(patch.display_name.trim());
  }
  if (patch.role != null) {
    sets.push('role = ?');
    params.push(patch.role);
  }
  if (patch.is_active != null) {
    sets.push('is_active = ?');
    params.push(patch.is_active ? 1 : 0);
  }
  if (patch.client_id != null) {
    sets.push('client_id = ?');
    params.push(patch.client_id);
  }
  if (patch.password) {
    sets.push('password_hash = ?');
    params.push(await hashPassword(patch.password));
  }

  if (!sets.length) return { ok: true };

  params.push(userId);
  await query(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
  return { ok: true };
}

/**
 * @param {Record<string, unknown>} row
 */
function formatUserRow(row) {
  return {
    id: Number(row.id),
    client_id: Number(row.client_id),
    client_name: String(row.client_name),
    email: String(row.email),
    display_name: String(row.display_name),
    role: String(row.role),
    is_active: Boolean(row.is_active),
    last_login_at: row.last_login_at ? String(row.last_login_at) : null,
    created_at: row.created_at ? String(row.created_at) : null,
  };
}
