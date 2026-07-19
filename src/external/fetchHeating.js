import { WAERMEATLAS_BASE_URL } from './config.js';
import {
  BAUALTER_MIDYEAR,
  heatingSignalFromHeatDemand,
  heatingSignalFromYear,
} from './baunvo.js';
import { loadWaermeatlasBuildingMap } from './loadWaermeatlas.js';
import { fetchWithCache } from './wfsClient.js';

/**
 * @param {string} path
 */
async function waermeatlasFetch(path) {
  const url = `${WAERMEATLAS_BASE_URL}${path}`;
  return fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'antberg-stuttgart-external/1.0' },
    signal: AbortSignal.timeout(180_000),
  });
}

/**
 * @returns {Promise<string>}
 */
export async function resolveBuildingsCollectionId() {
  const cacheKey = 'waermeatlas/collections.json';
  let text;

  try {
    text = await fetchWithCache(`${WAERMEATLAS_BASE_URL}/collections?f=json`, cacheKey);
  } catch (err) {
    throw new Error(
      `Wärmeatlas API unreachable (${err.message}). Download building GeoJSON from KEA-BW and pass --heating-file.`
    );
  }

  const data = JSON.parse(text);
  const collections = data.collections ?? [];
  const match =
    collections.find((c) => /building/i.test(c.id)) ??
    collections.find((c) => /gebaeud/i.test(c.id)) ??
    collections[0];

  if (!match?.id) {
    throw new Error('Wärmeatlas: no buildings collection found in /collections');
  }

  return match.id;
}

/**
 * @param {[number, number, number, number]} bbox25832
 */
async function bbox25832ToWgsString(bbox25832) {
  const turf = await import('@turf/turf');
  const [minX, minY, maxX, maxY] = bbox25832;
  const sw = turf.toWgs84(turf.point([minX, minY]));
  const ne = turf.toWgs84(turf.point([maxX, maxY]));
  return [
    sw.geometry.coordinates[0],
    sw.geometry.coordinates[1],
    ne.geometry.coordinates[0],
    ne.geometry.coordinates[1],
  ].join(',');
}

/**
 * @param {[number, number, number, number]} bbox EPSG:25832
 * @param {string} collectionId
 * @param {number} offset
 */
async function fetchBuildingsPage(bbox, collectionId, offset) {
  const wgsBbox = await bbox25832ToWgsString(bbox);
  const path = `/collections/${encodeURIComponent(collectionId)}/items?f=json&limit=10000&bbox=${wgsBbox}&offset=${offset}`;
  const response = await waermeatlasFetch(path);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Wärmeatlas items HTTP ${response.status}: ${body.slice(0, 200)}`);
  }
  return response.json();
}

/**
 * @param {[number, number, number, number]} bbox
 * @param {{ collectionId?: string, maxPages?: number }} [options]
 */
export async function fetchWaermeatlasBuildings(bbox, options = {}) {
  const collectionId = options.collectionId ?? (await resolveBuildingsCollectionId());
  /** @type {Record<string, unknown>[]} */
  const buildings = [];

  const wgsBbox = await bbox25832ToWgsString(bbox);

  for (let page = 0; page < (options.maxPages ?? 50); page += 1) {
    const offset = page * 10000;
    const cacheKey = `waermeatlas/items_${collectionId}_${bbox.join('_')}_${offset}.json`;
    const itemsUrl = `${WAERMEATLAS_BASE_URL}/collections/${encodeURIComponent(collectionId)}/items?f=json&limit=10000&bbox=${wgsBbox}&offset=${offset}`;

    let data;
    try {
      const text = await fetchWithCache(itemsUrl, cacheKey);
      data = JSON.parse(text);
    } catch {
      data = await fetchBuildingsPage(bbox, collectionId, offset);
    }

    const features = data.features ?? [];
    if (!features.length) break;

    for (const feature of features) {
      buildings.push({ ...(feature.properties ?? {}), _geometry: feature.geometry });
    }

    if (features.length < 10000) break;
  }

  return buildings;
}

/**
 * @param {Record<string, unknown>} record
 */
function num(record, ...keys) {
  for (const key of keys) {
    const value = Number(record[key]);
    if (Number.isFinite(value)) return value;
  }
  return null;
}

/**
 * @param {Record<string, unknown>} record
 */
function constructionYearFromRecord(record) {
  for (const key of ['baujahr', 'construction_year', 'bjahr', 'year_built']) {
    const year = Number(record[key]);
    if (Number.isFinite(year) && year > 1800 && year < 2100) return year;
  }

  for (const key of [
    'baualtersklasse',
    'bkl',
    'baualtersklasse_id',
    'gemod_bkl',
    'gebalter_t',
    'gebalter',
  ]) {
    const raw = record[key];
    if (raw == null) continue;
    const text = String(raw).trim();
    const mapped = BAUALTER_MIDYEAR[text];
    if (mapped) return mapped;
    const range = text.match(/(\d{4})\s*[_-]\s*(\d{4})/);
    if (range) return Math.round((Number(range[1]) + Number(range[2])) / 2);
  }

  return null;
}

/**
 * @param {Record<string, unknown>} record
 */
export function mapWaermeatlasRecord(record) {
  const alkisId = String(
    record.alkis_id ?? record.alkisId ?? record.ALKIS_ID ?? ''
  ).trim();
  if (!alkisId) return null;

  const energieflaeche = num(
    record,
    'energieflaeche_m2',
    'energief_m',
    'energieflaeche',
    'energief_m2',
    'nutzflaeche_m2'
  );
  const grundflaeche = num(record, 'grundflaeche_m2', 'grundfl_m2', 'grundflaeche');
  const qh = num(
    record,
    'qh_2024_mbv_kwh',
    'qh_mbv_kwh',
    'qh_2024_ekv_kwh',
    'qh_ekv_kwh',
    'qh_kwh_a',
    'qh_kwh'
  );

  const constructionYear = constructionYearFromRecord(record);
  const heatingFromYear = heatingSignalFromYear(constructionYear);
  const heatingFromDemand = heatingSignalFromHeatDemand(qh, energieflaeche);
  const heating_signal = heatingFromYear ?? heatingFromDemand;

  let built_floors = null;
  if (energieflaeche != null && grundflaeche != null && grundflaeche > 0) {
    built_floors = Math.max(1, Math.round(energieflaeche / grundflaeche));
  }

  return {
    alkis_id: alkisId,
    built_gfa: energieflaeche,
    built_floors,
    construction_year: constructionYear,
    heating_signal,
    qh_kwh: qh,
    energieflaeche_m2: energieflaeche,
    heating_source: 'waermeatlas-bw',
  };
}

/**
 * @param {import('./types.js').ParcelWithBuildings[]} parcels
 * @param {[number, number, number, number]} bbox
 * @param {{ heatingFile?: string, maxPages?: number }} [options]
 * @returns {Promise<Map<string, import('./types.js').HeatingOverlayEntry>>}
 */
export async function buildHeatingOverlayForParcels(parcels, bbox, options = {}) {
  /** @type {Map<string, ReturnType<typeof mapWaermeatlasRecord>>} */
  const byAlkis = new Map();

  let loadedFrom = null;

  try {
    const { source, records } = await loadWaermeatlasBuildingMap(options.heatingFile, {
      rebuildCache: options.rebuildCache,
    });
    for (const record of records) {
      const mapped = mapWaermeatlasRecord(record);
      if (mapped) byAlkis.set(mapped.alkis_id, mapped);
    }
    loadedFrom = source;
    console.log(`Loaded ${byAlkis.size} Wärmeatlas building(s) from ${source}`);
  } catch (localErr) {
    if (options.heatingFile) throw localErr;

    console.log('No local Wärmeatlas file; trying online API...');
    try {
      const records = await fetchWaermeatlasBuildings(bbox, { maxPages: options.maxPages });
      for (const record of records) {
        const mapped = mapWaermeatlasRecord(record);
        if (mapped) byAlkis.set(mapped.alkis_id, mapped);
      }
      loadedFrom = WAERMEATLAS_BASE_URL;
      console.log(`Loaded ${byAlkis.size} Wärmeatlas building record(s) from API`);
    } catch (apiErr) {
      console.warn(`Wärmeatlas skipped: ${apiErr.message}`);
      console.warn(
        'Download from KEA-BW → data/waermeatlas/ → npm run import:waermeatlas'
      );
      return new Map();
    }
  }

  if (!byAlkis.size) {
    console.warn(`Wärmeatlas source ${loadedFrom ?? 'unknown'} had no usable alkis_id rows`);
    return new Map();
  }

  /** @type {Map<string, import('./types.js').HeatingOverlayEntry>} */
  const overlay = new Map();

  for (const parcel of parcels) {
    /** @type {ReturnType<typeof mapWaermeatlasRecord>[]} */
    const hits = [];

    for (const building of parcel.buildings) {
      const alkisId = String(building.gml_id ?? '').trim();
      const hit = byAlkis.get(alkisId);
      if (hit) hits.push(hit);
    }

    if (!hits.length) continue;

    const built_gfa = hits.reduce((sum, h) => sum + (h.built_gfa ?? 0), 0) || null;
    const built_floors = Math.max(
      ...hits.map((h) => h.built_floors ?? 0),
      0
    ) || null;
    const construction_year =
      hits.map((h) => h.construction_year).find((y) => y != null) ?? null;
    const heating_signal =
      hits.map((h) => h.heating_signal).find((s) => s) ?? null;

    overlay.set(parcel.flurstueckskennzeichen, {
      flurstueckskennzeichen: parcel.flurstueckskennzeichen,
      built_gfa: built_gfa && built_gfa > 0 ? Math.round(built_gfa) : null,
      built_floors: built_floors && built_floors > 0 ? built_floors : null,
      construction_year,
      heating_signal,
      heating_source: 'waermeatlas-bw',
    });
  }

  console.log(`Heating overlay: matched ${overlay.size}/${parcels.length} parcels`);
  return overlay;
}
