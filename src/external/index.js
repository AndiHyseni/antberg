import { buildExternalOverlay, parcelsForExternalFetch } from './buildOverlay.js';

/**
 * @param {Map<string, import('../filter/types.js').ParcelCandidate>} byFlurstueck
 * @param {Record<string, unknown>[]} buildingRows
 */
export function parcelsFromIndex(byFlurstueck, buildingRows) {
  /** @type {import('./types.js').ParcelWithBuildings[]} */
  const parcels = [];

  for (const parcel of byFlurstueck.values()) {
    parcels.push({
      flurstueckskennzeichen: parcel.flurstueckskennzeichen,
      parcel_m2: parcel.parcel_m2,
      centroid_x: parcel.centroid_x,
      centroid_y: parcel.centroid_y,
      buildings: parcel.buildings.map((b) => ({ gml_id: b.gml_id })),
    });
  }

  if (!buildingRows.length || parcels.every((p) => p.buildings.length)) {
    return parcels;
  }

  return parcelsForExternalFetch([], buildingRows, byFlurstueck);
}

export { buildExternalOverlay, parcelsForExternalFetch };
