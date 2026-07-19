import fs from 'fs/promises';
import path from 'path';
import { CACHE_DIR, DEFAULT_MAX_RETRIES } from '../config.js';
import { buildWfsUrl } from './buildUrl.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * @param {string} text
 */
function extractWfsException(text) {
  const match = text.match(/<ows:ExceptionText>([^<]+)<\/ows:ExceptionText>/);
  return match?.[1]?.trim();
}

/**
 * @param {string} layer
 * @param {string} tileId
 */
function cachePath(layer, tileId) {
  return path.join(CACHE_DIR, layer, `${tileId}.gml`);
}

/**
 * @param {{
 *   layer: string,
 *   tileId: string,
 *   bbox: [number, number, number, number],
 *   url?: string,
 *   resume?: boolean,
 *   skipCache?: boolean,
 * }} options
 */
export async function fetchTileGml(options) {
  const { layer, tileId, bbox, resume = true, skipCache = false } = options;
  const file = cachePath(layer, tileId);

  if (!skipCache && resume) {
    try {
      const cached = await fs.readFile(file, 'utf8');
      if (cached.trim().length > 0) return cached;
    } catch {
      // cache miss
    }
  }

  const url = options.url ?? buildWfsUrl(layer, bbox);
  let lastError;

  for (let attempt = 0; attempt <= DEFAULT_MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'antberg-stuttgart-alkis-export/1.0' },
        signal: AbortSignal.timeout(120_000),
      });

      const text = await response.text();
      const wfsError = extractWfsException(text);

      if (!response.ok) {
        throw new Error(
          wfsError
            ? `HTTP ${response.status} for ${layer}/${tileId}: ${wfsError}`
            : `HTTP ${response.status} for ${layer}/${tileId}`
        );
      }

      if (wfsError) {
        throw new Error(`WFS exception for ${layer}/${tileId}: ${wfsError}`);
      }

      if (!skipCache) {
        await fs.mkdir(path.dirname(file), { recursive: true });
        await fs.writeFile(file, text, 'utf8');
      }

      return text;
    } catch (err) {
      lastError = err;
      const delay = Math.min(30_000, 1000 * 2 ** attempt);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Download all tiles for a layer, dedupe by feature id.
 * @param {{
 *   layer: string,
 *   tiles: { id: string, bbox: [number, number, number, number] }[],
 *   resume?: boolean,
 *   includeWkt?: boolean,
 *   onProgress?: (info: { tileIndex: number, total: number, featureCount: number }) => void,
 * }} options
 */
export async function downloadLayerTiles(options) {
  const { layer, tiles, resume = true, includeWkt = false, onProgress } = options;
  /** @type {Map<string, import('@turf/helpers').Feature>} */
  const byId = new Map();

  const { parseGmlFeatures } = await import('../parse/gmlToRows.js');

  for (let i = 0; i < tiles.length; i += 1) {
    const tile = tiles[i];
    const gml = await fetchTileGml({
      layer,
      tileId: tile.id,
      bbox: tile.bbox,
      resume,
    });

    const { features } = parseGmlFeatures(gml, { includeWkt });

    for (const f of features) {
      const id = f.properties?.feature_id || f.id;
      if (id) byId.set(String(id), f);
    }

    onProgress?.({ tileIndex: i + 1, total: tiles.length, featureCount: byId.size });
  }

  return Array.from(byId.values());
}
