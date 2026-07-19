import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  isArray: (name) =>
    ['member', 'posList', 'pos', 'coordinates', 'LinearRing', 'Polygon', 'surfaceMember', 'curveMember', 'pointMember'].includes(
      name
    ),
});

/**
 * @param {unknown} node
 * @returns {unknown[]}
 */
function asArray(node) {
  if (node == null) return [];
  return Array.isArray(node) ? node : [node];
}

/**
 * @param {unknown} value
 */
function scalarValue(value) {
  if (value == null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'object') {
    if ('#text' in value) return value['#text'];
    if ('@_uom' in value && '#text' in value) return value['#text'];
    if ('@_codeSpace' in value && '#text' in value) return value['#text'];
  }
  return JSON.stringify(value);
}

/**
 * @param {Record<string, unknown>} obj
 * @param {string} [prefix]
 * @param {Record<string, unknown>} out
 */
function flattenProperties(obj, prefix = '', out = {}) {
  for (const [key, val] of Object.entries(obj)) {
    if (key.startsWith('@_') || key === 'boundedBy') continue;
    if (
      key === 'Polygon' ||
      key === 'MultiSurface' ||
      key === 'MultiPolygon' ||
      key === 'Point' ||
      key === 'LineString' ||
      key === 'MultiCurve' ||
      key === 'Curve' ||
      key === 'Surface' ||
      key === 'MultiPoint' ||
      key === 'geometry' ||
      key === 'geom' ||
      key === 'identifier'
    ) {
      continue;
    }

    const fullKey = prefix ? `${prefix}_${key}` : key;

    if (val == null) {
      out[fullKey] = null;
    } else if (typeof val === 'object' && !Array.isArray(val)) {
      const keys = Object.keys(val);
      if ('#text' in val || keys.every((k) => k.startsWith('@_'))) {
        out[fullKey] = scalarValue(val);
      } else {
        flattenProperties(val, fullKey, out);
      }
    } else if (Array.isArray(val)) {
      out[fullKey] = val.map((v) => scalarValue(v)).join('; ');
    } else {
      out[fullKey] = val;
    }
  }
  return out;
}

/**
 * @param {string} posListText
 * @returns {[number, number][]}
 */
function parsePosList(posListText) {
  const nums = String(posListText)
    .trim()
    .split(/[\s,]+/)
    .map(Number)
    .filter((n) => !Number.isNaN(n));

  /** @type {[number, number][]} */
  const coords = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    coords.push([nums[i], nums[i + 1]]);
  }
  return coords;
}

/**
 * @param {unknown} geomNode
 * @returns {import('geojson').Geometry | null}
 */
function extractGeometry(geomNode) {
  if (!geomNode || typeof geomNode !== 'object') return null;

  /** @type {Record<string, unknown>} */
  const node = geomNode;

  const pointNode = asArray(node.Point)[0];
  if (pointNode) {
    const pos = pointNode.pos ?? pointNode.coordinates;
    const text = Array.isArray(pos) ? pos[0] : pos;
    const [x, y] = String(text).trim().split(/[\s,]+/).map(Number);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      return { type: 'Point', coordinates: [x, y] };
    }
  }

  const polygonNode =
    asArray(node.Polygon)[0] ??
    asArray(asArray(node.MultiSurface)[0]?.surfaceMember)[0]?.Polygon?.[0] ??
    asArray(asArray(node.MultiSurface)[0]?.surfaceMember)[0]?.Polygon ??
    asArray(asArray(node.MultiPolygon)[0]?.polygonMember)[0]?.Polygon?.[0];

  if (polygonNode && typeof polygonNode === 'object') {
    /** @type {Record<string, unknown>} */
    const poly = polygonNode;
    const linearRing = asArray(
      /** @type {Record<string, unknown>} */ (asArray(poly.exterior)[0] ?? poly.exterior)
        ?.LinearRing
    )[0];

    const ring =
      linearRing?.posList ??
      asArray(linearRing?.segments)[0]?.LineStringSegment?.posList ??
      asArray(asArray(poly.exterior)[0]?.Ring)[0]?.curveMember?.[0]?.LineString
        ?.posList;

    const posList = Array.isArray(ring) ? ring[0] : ring;
    const coords = parsePosList(posList);
    if (coords.length >= 3) {
      if (coords[0][0] !== coords.at(-1)[0] || coords[0][1] !== coords.at(-1)[1]) {
        coords.push(coords[0]);
      }
      return { type: 'Polygon', coordinates: [coords] };
    }
  }

  const line = asArray(node.LineString ?? node.Curve)[0];
  if (line) {
    const posList = line.posList ?? asArray(line.segments)[0]?.LineStringSegment?.posList;
    const text = Array.isArray(posList) ? posList[0] : posList;
    const coords = parsePosList(text);
    if (coords.length >= 2) {
      return { type: 'LineString', coordinates: coords };
    }
  }

  if (node.MultiPoint) {
    const points = asArray(asArray(node.MultiPoint)[0]?.pointMember ?? []);
    const coords = points
      .map((pm) => {
        const pt = asArray(pm?.Point)[0] ?? pm;
        const pos = pt?.pos ?? pm?.pos;
        const text = Array.isArray(pos) ? pos[0] : pos;
        const [x, y] = String(text).trim().split(/[\s,]+/).map(Number);
        return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null;
      })
      .filter(Boolean);
    if (coords.length) return { type: 'MultiPoint', coordinates: coords };
  }

  return null;
}

/**
 * @param {import('geojson').Geometry | null} geometry
 */
function geometryToWkt(geometry) {
  if (!geometry) return null;

  if (geometry.type === 'Point') {
    const [x, y] = geometry.coordinates;
    return `POINT (${x} ${y})`;
  }

  if (geometry.type === 'LineString') {
    const pts = geometry.coordinates.map(([x, y]) => `${x} ${y}`).join(', ');
    return `LINESTRING (${pts})`;
  }

  if (geometry.type === 'Polygon') {
    const ring = geometry.coordinates[0].map(([x, y]) => `${x} ${y}`).join(', ');
    return `POLYGON ((${ring}))`;
  }

  return JSON.stringify(geometry);
}

/**
 * @param {string} gml
 * @param {{ includeWkt?: boolean }} [options]
 */
export function parseGmlFeatures(gml, options = {}) {
  const includeWkt = options.includeWkt !== false;
  const doc = parser.parse(gml);
  const collection = doc?.FeatureCollection ?? doc?.wfs_FeatureCollection ?? doc;
  const members = asArray(collection?.member);

  /** @type {import('@turf/helpers').Feature[]} */
  const features = [];

  for (const member of members) {
    if (!member || typeof member !== 'object') continue;

    const keys = Object.keys(member).filter((k) => !k.startsWith('@_'));
    if (!keys.length) continue;

    const rootKey = keys[0];
    const featureNode = member[rootKey];
    if (!featureNode || typeof featureNode !== 'object') continue;

    const gmlId = featureNode['@_id'] ?? featureNode['@_gml:id'] ?? null;
    const flat = flattenProperties(featureNode);
    const geometry =
      extractGeometry(featureNode) ??
      extractGeometry(featureNode.position) ??
      extractGeometry(featureNode.geom) ??
      extractGeometry(featureNode.geometry) ??
      extractGeometry(featureNode.Polygon ?? featureNode.MultiSurface ?? featureNode.Point);

    /** @type {Record<string, unknown>} */
    const properties = {
      ...flat,
      feature_id: gmlId,
      _layer_root: rootKey,
    };

    if (geometry && includeWkt) {
      properties.geometry_wkt = geometryToWkt(geometry);
    }

    features.push({
      type: 'Feature',
      id: gmlId ? String(gmlId) : undefined,
      geometry,
      properties,
    });
  }

  return { features };
}

/**
 * Convert parsed features to flat Excel rows with centroid columns.
 * @param {import('@turf/helpers').Feature[]} features
 */
export async function featuresToRows(features) {
  const turf = await import('@turf/turf');

  return features.map((f) => {
    /** @type {Record<string, unknown>} */
    const row = { ...(f.properties || {}) };

    if (f.geometry) {
      try {
        const c = turf.centroid(f);
        row.centroid_x = c.geometry.coordinates[0];
        row.centroid_y = c.geometry.coordinates[1];
      } catch {
        row.centroid_x = null;
        row.centroid_y = null;
      }
    } else {
      row.centroid_x = null;
      row.centroid_y = null;
    }

    return row;
  });
}
