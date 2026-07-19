import {
  attachInfrastructure,
  attachLandUse,
  attachLandValuation,
  attachLegalEntry,
  attachSoilAssessment,
  attachStreet,
  findParcelForPoint,
} from './join.js';
import { streamExcelRows, layerExcelPath, layerFileExists, streamLayerRows } from './readExcel.js';
import { FILTER_INPUT_LAYERS } from './layerRegistry.js';

/**
 * @param {Map<string, import('./types.js').ParcelCandidate[]>} grid
 * @param {string} inputDir
 * @param {string} layer
 * @param {(parcel: import('./types.js').ParcelCandidate, row: Record<string, unknown>) => void} attach
 */
async function streamLayerAttach(grid, inputDir, layer, attach) {
  const filePath = layerExcelPath(inputDir, layer);
  if (!layerFileExists(filePath)) {
    console.log(`  skip ${layer} (file missing)`);
    return 0;
  }

  let linked = 0;
  const count = await streamLayerRows(filePath, layer, (row) => {
    const parcel = findParcelForPoint(grid, row);
    if (!parcel) return;
    attach(parcel, row);
    linked += 1;
  });

  console.log(`  ${layer}: scanned ${count}, linked ${linked}`);
  return linked;
}

/**
 * @param {Map<string, import('./types.js').ParcelCandidate[]>} grid
 * @param {string} inputDir
 */
export async function enrichParcelsFromAlkis(grid, inputDir) {
  console.log('Enriching parcels from additional ALKIS layers...');

  const stats = {
    nutzung: await streamLayerAttach(
      grid,
      inputDir,
      'v_al_tatsaechliche_nutzung',
      attachLandUse
    ),
    festlegung: await streamLayerAttach(
      grid,
      inputDir,
      'v_al_festlegung_recht',
      attachLegalEntry
    ),
    strasse: await streamLayerAttach(
      grid,
      inputDir,
      'v_al_strasse_gewann',
      attachStreet
    ),
    bodenschaetzung: await streamLayerAttach(
      grid,
      inputDir,
      'v_al_bodenschaetzung_f',
      attachSoilAssessment
    ),
    bodenbewertung: await streamLayerAttach(
      grid,
      inputDir,
      'v_al_bodenbewertung',
      attachLandValuation
    ),
    bauwerk_l: await streamLayerAttach(
      grid,
      inputDir,
      'v_al_bauwerk_einrichtung_l',
      attachInfrastructure
    ),
    bauwerk_f: await streamLayerAttach(
      grid,
      inputDir,
      'v_al_bauwerk_einrichtung_f',
      attachInfrastructure
    ),
  };

  return {
    stats,
    layers_used: FILTER_INPUT_LAYERS.map((entry) => entry.layer),
  };
}

/**
 * Build lage_id -> address label map from streamed address layer.
 * @param {string} inputDir
 */
export async function buildAddressMap(inputDir) {
  /** @type {Map<string, string>} */
  const byLageId = new Map();
  const filePath = layerExcelPath(inputDir, 'v_al_lagebezeichnung');
  if (!layerFileExists(filePath)) return byLageId;

  let count = 0;
  for await (const row of streamExcelRows(
    filePath,
    'v_al_lagebezeichnung',
    ['lage_id', 'lagebezeichnung', 'hausnummer']
  )) {
    const lageId = String(row.lage_id ?? '').trim();
    if (!lageId) continue;
    const street = row.lagebezeichnung == null ? null : String(row.lagebezeichnung);
    const houseNumber = row.hausnummer == null ? null : String(row.hausnummer);
    const label = [street, houseNumber].filter(Boolean).join(' ') || street;
    if (label) byLageId.set(lageId, label);
    count += 1;
  }

  console.log(`  v_al_lagebezeichnung: ${count} rows -> ${byLageId.size} address IDs`);
  return byLageId;
}
