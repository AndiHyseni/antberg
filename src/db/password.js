import crypto from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(crypto.scrypt);

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;

/**
 * @param {string} password
 */
export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = /** @type {Buffer} */ (
    await scryptAsync(password, salt, KEY_LEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P })
  );
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

/**
 * @param {string} password
 * @param {string} stored
 */
export async function verifyPassword(password, stored) {
  if (!stored?.startsWith('scrypt$')) return false;
  const parts = stored.split('$');
  if (parts.length !== 3) return false;
  const salt = Buffer.from(parts[1], 'hex');
  const expected = Buffer.from(parts[2], 'hex');
  const derived = /** @type {Buffer} */ (
    await scryptAsync(password, salt, expected.length, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P })
  );
  return crypto.timingSafeEqual(derived, expected);
}

/**
 * @param {string} raw
 */
export function sha256Hex(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * @param {number} [bytes]
 */
export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}
