import { query } from './pool.js';
import { sha256Hex } from './password.js';
import { isDatabaseAvailable } from './pool.js';

/**
 * @param {string} rawToken
 */
export async function validateClientAccessToken(rawToken) {
  const token = rawToken.trim();
  if (!token) return { valid: false };

  if (await isDatabaseAvailable()) {
    try {
      const tokenHash = sha256Hex(token);
      const [rows] = await query(
        `SELECT t.id, t.client_id, c.name AS client_name, c.slug AS client_slug
         FROM access_tokens t
         JOIN clients c ON c.id = t.client_id
         WHERE t.token_hash = ? AND t.revoked_at IS NULL
           AND (t.expires_at IS NULL OR t.expires_at > NOW())
         LIMIT 1`,
        [tokenHash]
      );
      if (rows[0]) {
        await query('UPDATE access_tokens SET last_used_at = NOW() WHERE id = ?', [rows[0].id]);
        return {
          valid: true,
          client: {
            id: Number(rows[0].client_id),
            name: String(rows[0].client_name),
            slug: String(rows[0].client_slug),
          },
        };
      }
    } catch {
      /* schema or connection issue — fall through */
    }
  }

  return { valid: false };
}
