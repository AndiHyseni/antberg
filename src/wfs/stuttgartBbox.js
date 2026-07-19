import {
  STUTTGART_AGS,
  STUTTGART_FALLBACK_BBOX,
  STUTTGART_LOOKUP_BBOX,
  STUTTGART_NAME,
} from '../config.js';
import { buildWfsUrl } from './buildUrl.js';
import { fetchTileGml } from './fetchTile.js';
import { parseGmlFeatures } from '../parse/gmlToRows.js';

/**
 * @param {[number, number, number, number]} bbox
 * @param {number} tileSize
 * @returns {{ id: string, bbox: [number, number, number, number] }[]}
 */
export function buildTileGrid(bbox, tileSize) {
  const [minX, minY, maxX, maxY] = bbox;
  const tiles = [];
  let index = 0;

  for (let x = minX; x < maxX; x += tileSize) {
    for (let y = minY; y < maxY; y += tileSize) {
      tiles.push({
        id: `tile_${Math.round(x)}_${Math.round(y)}`,
        bbox: [
          x,
          y,
          Math.min(x + tileSize, maxX),
          Math.min(y + tileSize, maxY),
        ],
      });
      index += 1;
    }
  }

  return tiles;
}

function matchesStuttgartCode(value) {
  const s = String(value).replace(/\D/g, '');
  return (
    s === STUTTGART_AGS ||
    s === `${STUTTGART_AGS}000` ||
    s === `0${STUTTGART_AGS}000` ||
    s.startsWith(`${STUTTGART_AGS}000`)
  );
}

/**
 * @param {import('@turf/helpers').Feature} feature
 */
function isStuttgartFeature(feature) {
  const props = feature.properties || {};
  const gemeindeName = String(
    props.gemeinde_name ?? props.gemeindename ?? ''
  ).toLowerCase();

  if (gemeindeName === STUTTGART_NAME.toLowerCase()) return true;

  for (const [key, val] of Object.entries(props)) {
    const lk = key.toLowerCase();
    const sv = val == null ? '' : String(val);

    if (lk.includes('gemeinde') && (lk.includes('name') || lk.endsWith('_name'))) {
      if (sv.toLowerCase() === STUTTGART_NAME.toLowerCase()) return true;
    }

    if (
      lk.includes('gemeinde') &&
      (lk.includes('id') || lk.includes('schluessel') || lk.includes('kennung'))
    ) {
      if (matchesStuttgartCode(sv)) return true;
    }
  }

  return false;
}

/**
 * Resolve Stuttgart extent via v_al_gemeinde WFS lookup.
 * @returns {Promise<{ bbox: [number, number, number, number], polygon: import('@turf/helpers').Feature|null }>}
 */
export async function resolveStuttgartExtent() {
  try {
    const gml = await fetchTileGml({
      layer: 'v_al_gemeinde',
      tileId: 'stuttgart_lookup',
      bbox: STUTTGART_LOOKUP_BBOX,
      skipCache: true,
    });

    const { features } = parseGmlFeatures(gml, { includeWkt: false });

    const stuttgart = features.find((f) => {
      const name = String(f.properties?.gemeinde_name ?? '').toLowerCase();
      return name === STUTTGART_NAME.toLowerCase();
    });

    if (stuttgart?.geometry) {
      const turf = await import('@turf/turf');
      const bbox = turf.bbox(stuttgart);
      return {
        bbox: /** @type {[number, number, number, number]} */ ([
          bbox[0],
          bbox[1],
          bbox[2],
          bbox[3],
        ]),
        polygon: stuttgart,
      };
    }
  } catch (err) {
    console.warn(
      `Gemeinde lookup failed (${err.message}), using fallback bbox.`
    );
  }

  return { bbox: STUTTGART_FALLBACK_BBOX, polygon: null };
}

/**
 * Filter features to Stuttgart municipality when possible.
 * @param {import('@turf/helpers').Feature[]} features
 * @param {import('@turf/helpers').Feature|null} stuttgartPolygon
 */
export async function filterStuttgartFeatures(features, stuttgartPolygon) {
  if (!features.length) return features;

  const turf = await import('@turf/turf');

  const coded = features.filter(isStuttgartFeature);
  if (coded.length > 0) return coded;

  if (stuttgartPolygon?.geometry) {
    return features.filter((f) => {
      try {
        if (!f.geometry) return false;
        const c = turf.centroid(f);
        return turf.booleanPointInPolygon(c, stuttgartPolygon);
      } catch {
        return false;
      }
    });
  }

  // No polygon and no gemeinde attrs — keep features (admin layers).
  return features;
}
