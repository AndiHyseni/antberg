import {
  DEVELOPABLE_LAND_USES,
  HERITAGE_LEGAL_PATTERN,
  NON_DEVELOPABLE_LAND_USES,
  RESIDENTIAL_BUILDING_FUNCTIONS,
} from './config.js';

const GRID_CELL = 150;

/**
 * @param {number} x
 * @param {number} y
 */
function cellKey(x, y) {
  return `${Math.floor(x / GRID_CELL)}_${Math.floor(y / GRID_CELL)}`;
}

/**
 * @param {Record<string, unknown>} row
 */
function num(row, key) {
  const value = Number(row[key]);
  return Number.isFinite(value) ? value : null;
}

/**
 * @param {import('./types.js').ParcelCandidate} parcel
 */
export function createParcelCandidate(row) {
  const cx = num(row, 'centroid_x');
  const cy = num(row, 'centroid_y');
  const area = num(row, 'amtliche_flaeche');
  const flurstueck = String(row.flurstueckskennzeichen ?? '').trim();

  if (!flurstueck || cx == null || cy == null || area == null || area <= 0) {
    return null;
  }

  return {
    feature_id: String(row.feature_id ?? flurstueck),
    flurstueckskennzeichen: flurstueck,
    parcel_m2: area,
    centroid_x: cx,
    centroid_y: cy,
    radius: Math.sqrt(area / Math.PI) * 1.25,
    gemarkung_name: row.gemarkung_name ?? null,
    flurnummer: row.flurnummer ?? null,
    zaehler: row.zaehler ?? null,
    nenner: row.nenner ?? null,
    gemeinde_name: row.gemeinde_name ?? null,
    buildings: [],
    addresses: new Set(),
    land_uses: new Set(),
    legal_entries: [],
    infrastructure: [],
    nearest_street: null,
    nearest_street_dist: Infinity,
    soil_bodenzahl: null,
    soil_ackerzahl: null,
    soil_nutzungsart: null,
    soil_year: null,
    land_valuation_class: null,
    heritage_detected: false,
  };
}

/**
 * @param {import('./types.js').ParcelCandidate} parcel
 * @param {Map<string, import('./types.js').ParcelCandidate[]>} grid
 */
export function indexParcelInGrid(parcel, grid) {
  const cxCell = Math.floor(parcel.centroid_x / GRID_CELL);
  const cyCell = Math.floor(parcel.centroid_y / GRID_CELL);
  const span = Math.ceil(parcel.radius / GRID_CELL) + 1;

  for (let dx = -span; dx <= span; dx += 1) {
    for (let dy = -span; dy <= span; dy += 1) {
      const key = `${cxCell + dx}_${cyCell + dy}`;
      const bucket = grid.get(key) ?? [];
      bucket.push(parcel);
      grid.set(key, bucket);
    }
  }
}

/**
 * @param {Record<string, unknown>[]} parcelRows
 */
export function indexParcels(parcelRows) {
  /** @type {Map<string, import('./types.js').ParcelCandidate>} */
  const byFlurstueck = new Map();
  /** @type {Map<string, import('./types.js').ParcelCandidate[]>} */
  const grid = new Map();

  for (const row of parcelRows) {
    const parcel = createParcelCandidate(row);
    if (!parcel) continue;
    byFlurstueck.set(parcel.flurstueckskennzeichen, parcel);
    indexParcelInGrid(parcel, grid);
  }

  return { byFlurstueck, grid };
}

/**
 * @param {Map<string, import('./types.js').ParcelCandidate[]>} grid
 * @param {Record<string, unknown>} row
 */
export function findParcelForPoint(grid, row) {
  const cx = num(row, 'centroid_x');
  const cy = num(row, 'centroid_y');
  if (cx == null || cy == null) return null;

  const key = cellKey(cx, cy);
  const candidates = grid.get(key) ?? [];
  let best = null;
  let bestDist = Infinity;

  for (const parcel of candidates) {
    const dx = cx - parcel.centroid_x;
    const dy = cy - parcel.centroid_y;
    const dist = Math.hypot(dx, dy);
    if (dist <= parcel.radius && dist < bestDist) {
      best = parcel;
      bestDist = dist;
    }
  }

  return best;
}

/**
 * @param {Map<string, import('./types.js').ParcelCandidate[]>} grid
 * @param {Record<string, unknown>[]} buildingRows
 */
export function attachBuildings(grid, buildingRows) {
  let linked = 0;

  for (const row of buildingRows) {
    const parcel = findParcelForPoint(grid, row);
    if (!parcel) continue;

    const functionName = String(row.gebaeudefunktion_name ?? '').trim();
    parcel.buildings.push({
      gml_id: row.gml_id ?? null,
      function_name: functionName || null,
      lage_id: row.lage_id ?? null,
      hochhaus: row.hochhaus ?? null,
      is_residential: RESIDENTIAL_BUILDING_FUNCTIONS.has(functionName),
    });
    linked += 1;
  }

  return linked;
}

/**
 * @param {Map<string, string>} addressByLageId
 * @param {Map<string, import('./types.js').ParcelCandidate>} byFlurstueck
 */
export function attachAddressesFromMap(addressByLageId, byFlurstueck) {
  for (const parcel of byFlurstueck.values()) {
    for (const building of parcel.buildings) {
      const lageId = String(building.lage_id ?? '').trim();
      if (!lageId) continue;
      const label = addressByLageId.get(lageId);
      if (label) parcel.addresses.add(label);
    }
  }
}

/**
 * @param {Record<string, unknown>} row
 */
function legalLabel(row) {
  return [
    row.objektname,
    row.unterart_name,
    row.eigenname,
    row.kennung,
  ]
    .filter(Boolean)
    .map(String)
    .join(' — ');
}

/**
 * @param {import('./types.js').ParcelCandidate} parcel
 * @param {Record<string, unknown>} row
 */
export function attachLandUse(parcel, row) {
  const use = String(row.unterart_name ?? row.objektname ?? '').trim();
  if (use) parcel.land_uses.add(use);
}

/**
 * @param {import('./types.js').ParcelCandidate} parcel
 * @param {Record<string, unknown>} row
 */
export function attachLegalEntry(parcel, row) {
  const label = legalLabel(row);
  if (!label) return;
  parcel.legal_entries.push(label);
  if (HERITAGE_LEGAL_PATTERN.test(label)) {
    parcel.heritage_detected = true;
  }
}

/**
 * @param {import('./types.js').ParcelCandidate} parcel
 * @param {Record<string, unknown>} row
 */
export function attachStreet(parcel, row) {
  const cx = num(row, 'centroid_x');
  const cy = num(row, 'centroid_y');
  if (cx == null || cy == null) return;

  const dist = Math.hypot(cx - parcel.centroid_x, cy - parcel.centroid_y);
  const street = String(row.lagebezeichnung ?? '').trim();
  if (!street || dist >= parcel.nearest_street_dist) return;

  parcel.nearest_street = street;
  parcel.nearest_street_dist = dist;
}

/**
 * @param {import('./types.js').ParcelCandidate} parcel
 * @param {Record<string, unknown>} row
 */
export function attachSoilAssessment(parcel, row) {
  parcel.soil_bodenzahl = num(row, 'bodenzahl') ?? parcel.soil_bodenzahl;
  parcel.soil_ackerzahl = num(row, 'ackerzahl') ?? parcel.soil_ackerzahl;
  parcel.soil_nutzungsart =
    row.nutzungsart_name == null
      ? parcel.soil_nutzungsart
      : String(row.nutzungsart_name);
  parcel.soil_year = num(row, 'jahr') ?? parcel.soil_year;
}

/**
 * @param {import('./types.js').ParcelCandidate} parcel
 * @param {Record<string, unknown>} row
 */
export function attachLandValuation(parcel, row) {
  const label = String(row.klassifizierung_name ?? '').trim();
  if (label) parcel.land_valuation_class = label;
}

/**
 * @param {import('./types.js').ParcelCandidate} parcel
 * @param {Record<string, unknown>} row
 */
export function attachInfrastructure(parcel, row) {
  const label = [row.objektname, row.unterart_name, row.eigenname]
    .filter(Boolean)
    .map(String)
    .join(' — ');
  if (label) parcel.infrastructure.push(label);
}

/**
 * @param {Set<string>} landUses
 */
export function summarizeLandUses(landUses) {
  return Array.from(landUses).sort().join('; ');
}

/**
 * @param {import('./types.js').ParcelCandidate} parcel
 */
export function hasDevelopableLandUse(parcel) {
  if (!parcel.land_uses.size) return true;
  for (const use of parcel.land_uses) {
    if (DEVELOPABLE_LAND_USES.has(use)) return true;
  }
  return false;
}

/**
 * @param {import('./types.js').ParcelCandidate} parcel
 */
export function isOnlyNonDevelopableLandUse(parcel) {
  if (!parcel.land_uses.size) return false;
  for (const use of parcel.land_uses) {
    if (DEVELOPABLE_LAND_USES.has(use)) return false;
    if (!NON_DEVELOPABLE_LAND_USES.has(use)) return false;
  }
  return true;
}
