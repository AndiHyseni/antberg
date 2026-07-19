import fs from 'fs/promises';
import path from 'path';
import pLimit from 'p-limit';
import { WFS_BASE_URL, CACHE_DIR, DEFAULT_MAX_RETRIES, DEFAULT_CONCURRENCY } from '../config.js';
import { parseGmlFeatures } from '../parse/gmlToRows.js';
import { filterStuttgartFeatures } from './stuttgartBbox.js';
import { fetchTileGml } from './fetchTile.js';

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
 * @param {string} propertyName
 * @param {string[]} ids
 * @param {number} [count]
 */
function buildGetFeatureXml(layer, propertyName, ids, count = 100000) {
  const filters = ids
    .map(
      (id) =>
        `<fes:PropertyIsEqualTo><fes:ValueReference>${propertyName}</fes:ValueReference><fes:Literal>${id}</fes:Literal></fes:PropertyIsEqualTo>`
    )
    .join('');

  const filterBody =
    ids.length === 1
      ? filters
      : `<fes:Or>${filters}</fes:Or>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<wfs:GetFeature service="WFS" version="2.0.0"
  xmlns:wfs="http://www.opengis.net/wfs/2.0"
  xmlns:fes="http://www.opengis.net/fes/2.0"
  xmlns:nora="http://nora-prod.lgl.bwl.de/nora"
  count="${count}">
  <wfs:Query typeNames="nora:${layer}">
    <fes:Filter>${filterBody}</fes:Filter>
  </wfs:Query>
</wfs:GetFeature>`;
}

/**
 * @param {string} layer
 * @param {number} batchIndex
 * @param {string[]} ids
 */
function filterCachePath(layer, batchIndex, ids) {
  const safe = (value) => String(value).replace(/[^a-zA-Z0-9._-]/g, '_');
  const name = `filter_${String(batchIndex).padStart(5, '0')}_${safe(ids[0])}_${safe(ids[ids.length - 1])}_n${ids.length}.gml`;
  return path.join(CACHE_DIR, layer, name);
}

/**
 * @param {string} xml
 * @param {string} layer
 * @param {string} batchId
 */
async function postGetFeature(xml, layer, batchId) {
  let lastError;

  for (let attempt = 0; attempt <= DEFAULT_MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(WFS_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          'User-Agent': 'antberg-stuttgart-alkis-export/1.0',
        },
        body: xml,
        signal: AbortSignal.timeout(120_000),
      });

      const text = await response.text();
      const wfsError = extractWfsException(text);

      if (!response.ok) {
        throw new Error(
          wfsError
            ? `HTTP ${response.status} for ${layer}/${batchId}: ${wfsError}`
            : `HTTP ${response.status} for ${layer}/${batchId}`
        );
      }

      if (wfsError) {
        throw new Error(`WFS exception for ${layer}/${batchId}: ${wfsError}`);
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
 * Collect Stuttgart reference IDs from cached spatial layer tiles.
 * @param {{
 *   referenceLayer: string,
 *   referenceProperty: string,
 *   tiles: { id: string, bbox: [number, number, number, number] }[],
 *   polygon: import('@turf/helpers').Feature|null,
 *   resume?: boolean,
 * }} options
 */
export async function collectReferenceIdsFromCachedTiles(options) {
  const { referenceLayer, referenceProperty, tiles, polygon, resume = true } =
    options;
  const ids = new Set();

  for (const tile of tiles) {
    const gml = await fetchTileGml({
      layer: referenceLayer,
      tileId: tile.id,
      bbox: tile.bbox,
      resume,
    });

    const { features } = parseGmlFeatures(gml);
    const filtered = await filterStuttgartFeatures(features, polygon);

    for (const feature of filtered) {
      const id = feature.properties?.[referenceProperty];
      if (id) ids.add(String(id));
    }
  }

  return ids;
}

/**
 * Download a geometry-less layer by matching reference IDs via WFS POST filter.
 * @param {{
 *   layer: string,
 *   matchProperty: string,
 *   referenceIds: Set<string>|string[],
 *   batchSize?: number,
 *   resume?: boolean,
 *   includeWkt?: boolean,
 *   onProgress?: (info: { batchIndex: number, total: number, featureCount: number }) => void,
 * }} options
 */
export async function downloadLayerByReferenceIds(options) {
  const {
    layer,
    matchProperty,
    referenceIds,
    batchSize = 50,
    resume = true,
    includeWkt = false,
    concurrency = DEFAULT_CONCURRENCY,
    onProgress,
  } = options;

  const ids = Array.from(referenceIds).sort();
  if (!ids.length) return [];

  /** @type {Map<string, import('@turf/helpers').Feature>} */
  const byId = new Map();
  const batches = [];

  for (let i = 0; i < ids.length; i += batchSize) {
    batches.push(ids.slice(i, i + batchSize));
  }

  let completed = 0;
  const limit = pLimit(concurrency);

  await Promise.all(
    batches.map((batch, i) =>
      limit(async () => {
        const batchId = `filter_batch_${String(i).padStart(5, '0')}`;
        const cacheFile = filterCachePath(layer, i, batch);
        let gml;

        if (resume) {
          try {
            gml = await fs.readFile(cacheFile, 'utf8');
            if (!gml.trim()) gml = undefined;
          } catch {
            // cache miss
          }
        }

        if (!gml) {
          const xml = buildGetFeatureXml(layer, matchProperty, batch);
          gml = await postGetFeature(xml, layer, batchId);
          await fs.mkdir(path.dirname(cacheFile), { recursive: true });
          await fs.writeFile(cacheFile, gml, 'utf8');
        }

        const { features } = parseGmlFeatures(gml, { includeWkt });
        for (const feature of features) {
          const id = feature.properties?.feature_id || feature.id;
          if (id) byId.set(String(id), feature);
        }

        completed += 1;
        onProgress?.({
          batchIndex: completed,
          total: batches.length,
          featureCount: byId.size,
        });
      })
    )
  );

  return Array.from(byId.values());
}
