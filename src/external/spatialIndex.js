/**
 * @typedef {Object} ZoneFeature
 * @property {string} id
 * @property {import('@turf/helpers').Feature} feature
 * @property {Record<string, unknown>} props
 */

const CELL = 500;

/**
 * @param {number} x
 * @param {number} y
 */
function cellKey(x, y) {
  return `${Math.floor(x / CELL)}_${Math.floor(y / CELL)}`;
}

/**
 * @param {import('@turf/helpers').Feature} feature
 */
function geometryCrs(feature) {
  const geom = feature.geometry;
  if (!geom) return 'EPSG:25832';
  const crs =
    /** @type {{ crs?: { properties?: { name?: string } } }} */ (geom).crs?.properties
      ?.name ?? feature.properties?.srsName;
  if (typeof crs === 'string' && crs.includes('4326')) return 'EPSG:4326';
  if (typeof crs === 'string' && crs.includes('4258')) return 'EPSG:4326';
  if (typeof crs === 'string' && crs.includes('25832')) return 'EPSG:25832';
  return 'EPSG:25832';
}

/**
 * @param {import('@turf/helpers').Feature} feature
 * @param {import('@turf/turf').TurfStatic} turf
 */
function to25832(feature, turf) {
  const crs = geometryCrs(feature);
  if (crs === 'EPSG:25832') return feature;
  return turf.reproject(feature, { from: crs, to: 'EPSG:25832' });
}

/**
 * @param {import('@turf/helpers').Feature} feature
 * @param {import('@turf/turf').TurfStatic} turf
 * @returns {[number, number, number, number]|null}
 */
function featureBbox25832(feature, turf) {
  if (!feature.geometry) return null;
  try {
    const projected = to25832(feature, turf);
    const bbox = turf.bbox(projected);
    return /** @type {[number, number, number, number]} */ ([
      bbox[0],
      bbox[1],
      bbox[2],
      bbox[3],
    ]);
  } catch {
    return null;
  }
}

/**
 * @param {ZoneFeature[]} zones
 */
export async function buildZoneIndex(zones) {
  const turf = await import('@turf/turf');
  /** @type {Map<string, ZoneFeature[]>} */
  const grid = new Map();

  for (const zone of zones) {
    const bbox = featureBbox25832(zone.feature, turf);
    if (!bbox) continue;

    const [minX, minY, maxX, maxY] = bbox;
    const x0 = Math.floor(minX / CELL);
    const x1 = Math.floor(maxX / CELL);
    const y0 = Math.floor(minY / CELL);
    const y1 = Math.floor(maxY / CELL);

    for (let x = x0; x <= x1; x += 1) {
      for (let y = y0; y <= y1; y += 1) {
        const key = `${x}_${y}`;
        const bucket = grid.get(key) ?? [];
        bucket.push(zone);
        grid.set(key, bucket);
      }
    }
  }

  return grid;
}

/**
 * @param {Map<string, ZoneFeature[]>} grid
 * @param {number} x EPSG:25832
 * @param {number} y EPSG:25832
 */
export async function findZoneAtPoint(grid, x, y) {
  const turf = await import('@turf/turf');
  const point = turf.point([x, y]);
  const key = cellKey(x, y);
  const candidates = grid.get(key) ?? [];

  for (const zone of candidates) {
    try {
      const projected = to25832(zone.feature, turf);
      if (turf.booleanPointInPolygon(point, projected)) return zone;
    } catch {
      // skip invalid geometry
    }
  }

  return null;
}
