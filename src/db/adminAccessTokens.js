import { query } from './pool.js';
import { randomToken, sha256Hex } from './password.js';

export async function listAccessTokens() {
  const [rows] = await query(
    `SELECT t.id, t.client_id, c.name AS client_name, t.label, t.expires_at, t.revoked_at,
            t.last_used_at, t.created_at
     FROM access_tokens t
     JOIN clients c ON c.id = t.client_id
     ORDER BY t.created_at DESC
     LIMIT 200`
  );
  return rows.map((row) => ({
    id: Number(row.id),
    client_id: Number(row.client_id),
    client_name: String(row.client_name),
    label: row.label != null ? String(row.label) : null,
    expires_at: row.expires_at ? String(row.expires_at) : null,
    revoked_at: row.revoked_at ? String(row.revoked_at) : null,
    last_used_at: row.last_used_at ? String(row.last_used_at) : null,
    created_at: row.created_at ? String(row.created_at) : null,
    active: !row.revoked_at && (!row.expires_at || new Date(String(row.expires_at)) > new Date()),
  }));
}

/**
 * @param {{ client_id: number; label?: string; expires_in_days?: number }} input
 */
export async function createAccessToken(input) {
  const raw = randomToken(24);
  const tokenHash = sha256Hex(raw);
  let expiresAt = null;
  if (input.expires_in_days && input.expires_in_days > 0) {
    expiresAt = new Date(Date.now() + input.expires_in_days * 86400000);
  }
  const [result] = await query(
    `INSERT INTO access_tokens (client_id, token_hash, label, expires_at) VALUES (?, ?, ?, ?)`,
    [input.client_id, tokenHash, input.label?.trim() || null, expiresAt]
  );
  return {
    id: Number(result.insertId),
    token: raw,
    expires_at: expiresAt ? expiresAt.toISOString() : null,
  };
}

/**
 * @param {number} tokenId
 */
export async function revokeAccessToken(tokenId) {
  await query(`UPDATE access_tokens SET revoked_at = NOW() WHERE id = ? AND revoked_at IS NULL`, [
    tokenId,
  ]);
  return { ok: true };
}
