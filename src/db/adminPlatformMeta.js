import fs from 'fs/promises';
import path from 'path';
import { loadDatabaseEnv } from './loadEnv.js';
import { listEvaluations } from '../evaluation/store.js';

/**
 * @param {boolean} connected
 */
export async function getDatabaseMeta(connected) {
  await loadDatabaseEnv();
  return {
    connected,
    host: process.env.MYSQL_HOST ?? '127.0.0.1',
    port: Number(process.env.MYSQL_PORT ?? 3306),
    database: process.env.MYSQL_DATABASE ?? 'antberg',
    user: process.env.MYSQL_USER ?? 'root',
  };
}

/**
 * @param {string} root
 */
export async function getFileLayerStats(root) {
  const catalogPath = path.join(root, 'data', 'catalog.json');
  /** @type {{ catalog_opportunities: number; dossiers: number; scan_parcels_scanned: number | null; scan_opportunities: number | null }} */
  const out = {
    catalog_opportunities: 0,
    dossiers: 0,
    scan_parcels_scanned: null,
    scan_opportunities: null,
  };

  try {
    const raw = JSON.parse(await fs.readFile(catalogPath, 'utf8'));
    out.catalog_opportunities = Array.isArray(raw.cards) ? raw.cards.length : 0;
    out.dossiers = raw.dossiers && typeof raw.dossiers === 'object' ? Object.keys(raw.dossiers).length : 0;
    if (raw.scan) {
      out.scan_parcels_scanned = raw.scan.parcels_scanned ?? null;
      out.scan_opportunities = raw.scan.opportunities_found ?? null;
    }
  } catch {
    /* no bundled catalog */
  }

  const evaluations = await listEvaluations();
  return {
    ...out,
    evaluations_files: evaluations.length,
    catalog_path: 'data/catalog.json',
  };
}

/**
 * Merge file-layer counts into KPI stats when MySQL is empty or offline.
 * @param {Record<string, number>} stats
 * @param {Awaited<ReturnType<typeof getFileLayerStats>>} fileLayer
 */
export function applyFileLayerToStats(stats, fileLayer) {
  const next = { ...stats };
  if (!next.properties && fileLayer.catalog_opportunities) {
    next.properties = fileLayer.catalog_opportunities;
  }
  if (!next.evaluations && fileLayer.evaluations_files) {
    next.evaluations = fileLayer.evaluations_files;
  }
  if (!next.catalog_total) {
    next.catalog_total = fileLayer.catalog_opportunities;
  }
  return next;
}
