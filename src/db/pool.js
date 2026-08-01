import mysql from 'mysql2/promise';
import { loadDatabaseEnv } from './loadEnv.js';

/** @type {import('mysql2/promise').Pool | null} */
let pool = null;

/** @type {boolean | null} */
let dbAvailable = null;

export const DEFAULT_CLIENT_ID = Number(process.env.ANTBERG_CLIENT_ID ?? 1);

export async function getPool() {
  if (pool) return pool;
  const config = await loadDatabaseEnv();
  pool = mysql.createPool({
    ...config,
    waitForConnections: true,
    connectionLimit: 10,
    enableKeepAlive: true,
  });
  return pool;
}

export async function isDatabaseAvailable() {
  if (dbAvailable != null) return dbAvailable;
  try {
    const p = await getPool();
    await p.query('SELECT 1');
    dbAvailable = true;
  } catch {
    dbAvailable = false;
  }
  return dbAvailable;
}

export async function query(sql, params = []) {
  const p = await getPool();
  return p.query(sql, params);
}
