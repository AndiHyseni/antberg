import { isDatabaseAvailable, query } from './pool.js';
import { hashPassword, randomToken, sha256Hex, verifyPassword } from './password.js';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const FALLBACK_ADMIN_EMAIL = (process.env.ANTBERG_ADMIN_EMAIL ?? 'admin@antberg.io').trim().toLowerCase();
const FALLBACK_ADMIN_PASSWORD = (process.env.ANTBERG_ADMIN_PASSWORD ?? 'antberg-admin-2026').trim();

/** @type {Map<string, { user: AdminUser; expiresAt: number }>} */
const memorySessions = new Map();

/**
 * @typedef {{ id: number; email: string; display_name: string; role: string; client_id: number; client_name?: string }} AdminUser
 */

/**
 * @param {string} bearer
 */
export async function resolveAdminSession(bearer) {
  const token = bearer?.trim();
  if (!token) return null;

  const tokenHash = sha256Hex(token);

  if (await isDatabaseAvailable()) {
    try {
      const [rows] = await query(
        `SELECT u.id, u.email, u.display_name, u.role, u.client_id, c.name AS client_name
         FROM admin_sessions s
         JOIN users u ON u.id = s.user_id
         JOIN clients c ON c.id = u.client_id
         WHERE s.token_hash = ? AND s.expires_at > NOW() AND u.is_active = 1 AND u.role = 'admin'
         LIMIT 1`,
        [tokenHash]
      );
      if (rows[0]) return formatUser(rows[0]);
    } catch {
      // schema may not be migrated yet — fall through to memory
    }
  }

  const mem = memorySessions.get(tokenHash);
  if (mem && mem.expiresAt > Date.now()) return mem.user;
  if (mem) memorySessions.delete(tokenHash);
  return null;
}

/**
 * @param {string} email
 * @param {string} password
 */
export async function adminLogin(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const plainPassword = password;

  if (await isDatabaseAvailable()) {
    try {
      const [rows] = await query(
        `SELECT u.id, u.email, u.display_name, u.role, u.client_id, u.password_hash, c.name AS client_name
         FROM users u
         JOIN clients c ON c.id = u.client_id
         WHERE u.email = ? AND u.is_active = 1 AND u.role = 'admin'
         LIMIT 1`,
        [normalizedEmail]
      );
      const row = rows[0];
      if (row?.password_hash && (await verifyPassword(plainPassword, String(row.password_hash)))) {
        const user = formatUser(row);
        const session = await createDbSession(user.id);
        await query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);
        return { user, token: session.token };
      }
    } catch {
      // fall through to env fallback
    }
  }

  if (
    normalizedEmail === FALLBACK_ADMIN_EMAIL &&
    plainPassword === FALLBACK_ADMIN_PASSWORD
  ) {
    /** @type {AdminUser} */
    const user = {
      id: 0,
      email: FALLBACK_ADMIN_EMAIL,
      display_name: 'Platform Admin',
      role: 'admin',
      client_id: 0,
      client_name: 'Antberg (offline mode)',
    };
    const token = randomToken();
    const tokenHash = sha256Hex(token);
    memorySessions.set(tokenHash, { user, expiresAt: Date.now() + SESSION_TTL_MS });
    return { user, token };
  }

  return null;
}

/**
 * @param {number} userId
 */
async function createDbSession(userId) {
  const token = randomToken();
  const tokenHash = sha256Hex(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await query(
    `INSERT INTO admin_sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)`,
    [userId, tokenHash, expiresAt]
  );
  return { token };
}

/**
 * @param {string} bearer
 */
export async function adminLogout(bearer) {
  const token = bearer?.trim();
  if (!token) return;
  const tokenHash = sha256Hex(token);
  memorySessions.delete(tokenHash);
  if (await isDatabaseAvailable()) {
    try {
      await query('DELETE FROM admin_sessions WHERE token_hash = ?', [tokenHash]);
    } catch {
      /* ignore */
    }
  }
}

/**
 * @param {Record<string, unknown>} row
 */
function formatUser(row) {
  return {
    id: Number(row.id),
    email: String(row.email),
    display_name: String(row.display_name),
    role: String(row.role),
    client_id: Number(row.client_id),
    client_name: row.client_name != null ? String(row.client_name) : undefined,
  };
}

export { hashPassword };
