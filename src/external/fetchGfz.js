import { buildTileGrid } from '../wfs/stuttgartBbox.js';
import { parseGmlFeatures } from '../parse/gmlToRows.js';
import { resolveBaunvo } from './baunvo.js';
import pLimit from 'p-limit';
import { STUTTGART_AGS } from '../config.js';
import {
  FNP_LAYER,
  FNP_WFS_URL,
  GFZ_BBOX,
  GFZ_TILE_SIZE,
  STUTTGART_BEREICH_ID,
} from './config.js';
import { buildWfsGetFeatureUrl, fetchWithCache } from './wfsClient.js';
import { buildZoneIndex, findZoneAtPoint } from './spatialIndex.js';

/**
 * @param {[number, number, number, number]} bbox
 * @param {string} tileId
 */
function fnpTileUrl(bbox, tileId) {
  return buildWfsGetFeatureUrl(FNP_WFS_URL, {
    SERVICE: 'WFS',
    VERSION: '2.0.0',
    REQUEST: 'GetFeature',
    TYPENAMES: FNP_LAYER,
    outputFormat: 'application/gml+xml; version=3.2',
    srsName: 'urn:ogc:def:crs:EPSG::25832',
    BBOX: `${bbox.join(',')},urn:ogc:def:crs:EPSG::25832`,
    COUNT: 5000,
  });
}

/**
 * @param {Record<string, unknown>} props
 */
function bereichReference(props) {
  const ref = props.gehoertZuBereich;
  if (ref && typeof ref === 'object' && '@_href' in ref) {
    return String(ref['@_href']);
  }
  return String(
    props.gehoertZuBereich ??
      props.gehoert_zu_bereich ??
      props['gehoertZuBereich_xlink_href'] ??
      ''
  );
}

/**
 * Prefer Stuttgart FNP; still keep other zones in tile (border parcels).
 * @param {Record<string, unknown>} props
 */
function isRelevantFnpFeature(props) {
  const bereich = bereichReference(props);
  if (!bereich) return true;
  if (bereich.includes(STUTTGART_BEREICH_ID) || bereich.includes(`${STUTTGART_AGS}000000`)) {
    return true;
  }
  return bereich.includes(STUTTGART_AGS);
}

/**
 * @param {{ resume?: boolean, maxTiles?: number, onProgress?: (info: { tile: number, total: number, zones: number }) => void }} [options]
 */
export async function fetchStuttgartFnpZones(options = {}) {
  const tiles = buildTileGrid(GFZ_BBOX, GFZ_TILE_SIZE);
  const limited = options.maxTiles ? tiles.slice(0, options.maxTiles) : tiles;
  const seen = new Set();
  const limit = pLimit(3);
  let completed = 0;

  const tileResults = await Promise.all(
    limited.map((tile) =>
      limit(async () => {
        const url = fnpTileUrl(tile.bbox, tile.id);
        const cacheKey = `fnp/${tile.id}.gml`;
        const gml = await fetchWithCache(url, cacheKey);
        const { features } = parseGmlFeatures(gml, { includeWkt: false });

        /** @type {import('./spatialIndex.js').ZoneFeature[]} */
        const local = [];
        for (const feature of features) {
          const props = feature.properties ?? {};
          if (!isRelevantFnpFeature(props)) continue;

          const id = String(props.feature_id ?? feature.id ?? '');
          if (!id) continue;
          local.push({ id, feature, props });
        }

        completed += 1;
        options.onProgress?.({
          tile: completed,
          total: limited.length,
          zones: local.length,
        });
        return local;
      })
    )
  );

  /** @type {import('./spatialIndex.js').ZoneFeature[]} */
  const zones = [];
  for (const local of tileResults) {
    for (const zone of local) {
      if (seen.has(zone.id)) continue;
      seen.add(zone.id);
      zones.push(zone);
    }
  }

  return zones;
}

/**
 * @param {import('./types.js').ParcelPoint[]} parcels
 * @param {{ resume?: boolean, maxTiles?: number }} [options]
 * @returns {Promise<Map<string, import('./types.js').GfzOverlayEntry>>}
 */
export async function buildGfzOverlayForParcels(parcels, options = {}) {
  console.log('Fetching Stuttgart FNP (Geoportal Raumordnung BW) for GFZ zones...');
  const zones = await fetchStuttgartFnpZones({
    ...options,
    onProgress: ({ tile, total, zones: count }) => {
      if (tile % 5 === 0 || tile === total) {
        console.log(`  FNP tiles ${tile}/${total}, zones ${count}`);
      }
    },
  });

  console.log(`Loaded ${zones.length} FNP Bebauungsfläche zone(s), indexing...`);
  const grid = await buildZoneIndex(zones);

  /** @type {Map<string, import('./types.js').GfzOverlayEntry>} */
  const overlay = new Map();
  let matched = 0;

  for (const parcel of parcels) {
    const zone = await findZoneAtPoint(grid, parcel.centroid_x, parcel.centroid_y);
    if (!zone) continue;

    const landUseCode = zone.props.allgArtDerBaulNutzung ?? zone.props.allg_art_der_baul_nutzung;
    const baunvo = resolveBaunvo(
      landUseCode == null ? null : String(landUseCode)
    );
    if (!baunvo) continue;

    const allowedGfa = Math.round(baunvo.gfz * parcel.parcel_m2);

    overlay.set(parcel.flurstueckskennzeichen, {
      flurstueckskennzeichen: parcel.flurstueckskennzeichen,
      allowed_gfa: allowedGfa,
      allowed_floors: baunvo.maxFloors,
      allows_densification: baunvo.allowsDensification,
      gfz: baunvo.gfz,
      grz: baunvo.grz,
      fnp_land_use_code: landUseCode == null ? null : String(landUseCode),
      fnp_zone: baunvo.zone,
      gfz_source: 'geoportal-bw-fnp-baunvo-orientierungswert',
    });
    matched += 1;
  }

  console.log(`GFZ overlay: matched ${matched}/${parcels.length} parcels`);
  return overlay;
}
