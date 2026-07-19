import fs from 'fs/promises';
import path from 'path';
import { LICENSE_ATTRIBUTION } from '../config.js';
import { writeLayerExcel } from '../export/excel.js';
import { buildAddressMap, enrichParcelsFromAlkis } from './enrich.js';
import {
  attachAddressesFromMap,
  attachBuildings,
  indexParcels,
  summarizeLandUses,
} from './join.js';
import { buildExternalOverlay, parcelsFromIndex } from '../external/index.js';
import { loadOverlay, passesHardFilters } from './hardFilters.js';
import { FILTER_INPUT_LAYERS, FILTER_SKIPPED_LAYERS } from './layerRegistry.js';
import { layerExcelPath, readExcelRows } from './readExcel.js';
import {
  buildScoreReason,
  heatingLabel,
  renovationStatus,
  scoreProperty,
  utilizationPct,
} from './score.js';

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  /** @type {Record<string, string|number|boolean|undefined>} */
  const args = {
    inputDir: 'output/stuttgart-alkis-2026-07-03',
    overlay: undefined,
    minScore: 1,
    limit: undefined,
    fetchGfz: false,
    fetchHeating: false,
    heatingFile: undefined,
    maxFnpTiles: undefined,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--input-dir') args.inputDir = argv[++i];
    else if (arg === '--overlay') args.overlay = argv[++i];
    else if (arg === '--min-score') args.minScore = Number(argv[++i]);
    else if (arg === '--limit') args.limit = Number(argv[++i]);
    else if (arg === '--fetch-gfz') args.fetchGfz = true;
    else if (arg === '--fetch-heating') args.fetchHeating = true;
    else if (arg === '--fetch-external') {
      args.fetchGfz = true;
      args.fetchHeating = true;
    }
    else if (arg === '--heating-file') args.heatingFile = argv[++i];
    else if (arg === '--max-fnp-tiles') args.maxFnpTiles = Number(argv[++i]);
    else if (arg === '--help' || arg === '-h') args.help = true;
  }

  return args;
}

function printHelp() {
  console.log(`Stuttgart redevelopment filter + score

Usage:
  npm run filter:stuttgart [-- options]

Options:
  --input-dir <dir>   Directory with exported layer .xlsx files
  --overlay <file>    Optional JSON/CSV overlay keyed by flurstueckskennzeichen
  --fetch-gfz         Fetch GFZ from Geoportal BW FNP WFS (BauNVO orientierungswerte)
  --fetch-heating     Enrich with Wärmeatlas BW (built GFA, heating proxy)
  --fetch-external    Both --fetch-gfz and --fetch-heating (GFZ first, then heating)
  --heating-file <f>  Local Wärmeatlas GeoJSON if API unreachable
  --max-fnp-tiles <n> Limit FNP tiles when fetching GFZ (testing)
  --min-score <n>     Minimum total score to export (default 1)
  --limit <n>         Limit output rows (testing)
  --help              Show this help

Hard filters (from developmentAntberg.pdf):
  - parcel 800–25,000 m²
  - at least one residential building on parcel
  - heritage signal from v_al_festlegung_recht or overlay
  - non-developable land use only (forest/road/agriculture)
  - optional overlay: zoning, utilization >=75%, recent renovation

ALKIS layers used (${FILTER_INPUT_LAYERS.length}):
${FILTER_INPUT_LAYERS.map((entry) => `  - ${entry.layer}`).join('\n')}

Use --fetch-external or npm run fetch:external for Geoportal GFZ + Wärmeatlas heating.

Attribution: ${LICENSE_ATTRIBUTION}
`);
}

/**
 * @param {import('./types.js').ParcelCandidate} parcel
 * @param {import('./types.js').PropertyOverlay|undefined} overlay
 * @param {number} currentYear
 * @returns {import('./types.js').ScoredProperty}
 */
function buildScoredProperty(parcel, overlay, currentYear) {
  /** @type {string[]} */
  const dataGaps = [];

  const allowedFloors = overlay?.allowed_floors ?? null;
  const builtFloors = overlay?.built_floors ?? null;
  const allowedGfa = overlay?.allowed_gfa ?? null;
  const builtGfa = overlay?.built_gfa ?? null;
  const constructionYear = overlay?.construction_year ?? null;
  const lastRenovationYear = overlay?.last_renovation_year ?? null;
  const heatingSignal = overlay?.heating_signal ?? null;

  if (allowedFloors == null || builtFloors == null) dataGaps.push('floor data');
  if (allowedGfa == null || builtGfa == null) dataGaps.push('GFZ/GFA data');
  if (constructionYear == null) dataGaps.push('construction year');
  if (lastRenovationYear == null) dataGaps.push('renovation history');
  if (!heatingSignal) dataGaps.push('heating signal');

  const scores = scoreProperty(
    {
      parcel_m2: parcel.parcel_m2,
      allowed_floors: allowedFloors,
      built_floors: builtFloors,
      allowed_gfa: allowedGfa,
      built_gfa: builtGfa,
      construction_year: constructionYear,
      last_renovation_year: lastRenovationYear,
      heating_signal: heatingSignal,
    },
    currentYear
  );

  const addresses = Array.from(parcel.addresses);
  const landUse = summarizeLandUses(parcel.land_uses);
  const legalRestrictions = parcel.legal_entries.slice(0, 5).join('; ') || null;

  /** @type {import('./types.js').ScoredProperty} */
  const property = {
    flurstueckskennzeichen: parcel.flurstueckskennzeichen,
    address: addresses[0] ?? null,
    nearest_street: parcel.nearest_street,
    municipality: parcel.gemeinde_name == null ? null : String(parcel.gemeinde_name),
    parcel_m2: parcel.parcel_m2,
    land_use: landUse || null,
    legal_restrictions: legalRestrictions,
    land_valuation_class: parcel.land_valuation_class,
    soil_bodenzahl: parcel.soil_bodenzahl,
    soil_ackerzahl: parcel.soil_ackerzahl,
    soil_nutzungsart: parcel.soil_nutzungsart,
    built_floors: builtFloors,
    allowed_floors: allowedFloors,
    built_gfa: builtGfa,
    allowed_gfa: allowedGfa,
    utilization_pct: utilizationPct(allowedGfa, builtGfa),
    construction_year: constructionYear,
    renovation_status: renovationStatus(lastRenovationYear, currentYear),
    heating_signal: heatingLabel(heatingSignal),
    building_count: parcel.buildings.length,
    residential_building_count: parcel.buildings.filter((b) => b.is_residential)
      .length,
    infrastructure_count: parcel.infrastructure.length,
    centroid_x: parcel.centroid_x,
    centroid_y: parcel.centroid_y,
    data_gaps: dataGaps,
    score_reason: '',
    ...scores,
  };

  property.score_reason = buildScoreReason(property);
  return property;
}

export async function runFilter(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    printHelp();
    return;
  }

  const inputDir = String(args.inputDir);
  const currentYear = new Date().getFullYear();

  console.log(`Loading ALKIS layers from ${inputDir}...`);

  const parcels = await readExcelRows(
    layerExcelPath(inputDir, 'v_al_flurstueck'),
    'v_al_flurstueck'
  );
  const buildings = await readExcelRows(
    layerExcelPath(inputDir, 'v_al_gebaeude'),
    'v_al_gebaeude'
  );

  console.log(
    `Loaded ${parcels.rows.length} parcels, ${buildings.rows.length} buildings`
  );

  const { byFlurstueck, grid } = indexParcels(parcels.rows);
  const linkedBuildings = attachBuildings(grid, buildings.rows);

  const addressMap = await buildAddressMap(inputDir);
  attachAddressesFromMap(addressMap, byFlurstueck);

  const enrichStats = await enrichParcelsFromAlkis(grid, inputDir);

  /** @type {Map<string, import('./types.js').PropertyOverlay>} */
  let overlay = args.overlay
    ? await loadOverlay(String(args.overlay))
    : new Map();

  let externalOverlayPath = null;

  if (args.fetchGfz || args.fetchHeating) {
    const parcelPoints = parcelsFromIndex(byFlurstueck, buildings.rows);
    const external = await buildExternalOverlay(parcelPoints, {
      gfz: args.fetchGfz,
      heating: args.fetchHeating,
      heatingFile: args.heatingFile ? String(args.heatingFile) : undefined,
      maxFnpTiles: args.maxFnpTiles ? Number(args.maxFnpTiles) : undefined,
      outputPath: path.join(inputDir, '_external-overlay.json'),
    });
    externalOverlayPath = external.path;
    for (const [key, row] of external.map) {
      overlay.set(key, { ...(overlay.get(key) ?? {}), ...row });
    }
  }

  console.log(`Indexed ${byFlurstueck.size} parcels, linked ${linkedBuildings} buildings`);
  console.log('Applying hard filters and scoring...');

  /** @type {import('./types.js').ScoredProperty[]} */
  const scored = [];
  let eliminated = 0;
  let processed = 0;

  for (const parcel of byFlurstueck.values()) {
    processed += 1;
    if (processed % 25000 === 0) {
      console.log(`  processed ${processed}/${byFlurstueck.size} parcels...`);
    }

    const overlayRow = overlay.get(parcel.flurstueckskennzeichen);
    const hard = passesHardFilters(parcel, overlayRow, currentYear);
    if (!hard.pass) {
      eliminated += 1;
      continue;
    }

    const property = buildScoredProperty(parcel, overlayRow, currentYear);
    if (property.total_score >= Number(args.minScore)) {
      scored.push(property);
    }
  }

  console.log(`Scoring complete: ${scored.length} candidate(s)`);

  scored.sort((a, b) => {
    if (b.total_score !== a.total_score) return b.total_score - a.total_score;
    return b.parcel_m2 - a.parcel_m2;
  });

  const limited = args.limit ? scored.slice(0, Number(args.limit)) : scored;
  const outputPath = path.join(inputDir, 'redevelopment-candidates.xlsx');

  console.log(`Writing ${limited.length} row(s) to ${outputPath}...`);

  await writeLayerExcel({
    outputPath,
    layer: 'redevelopment_candidates',
    rows: limited.map((row) => ({
      ...row,
      data_gaps: row.data_gaps.join('; '),
    })),
    exportInfo: {
      source_dir: inputDir,
      filter_model: 'developmentAntberg.pdf',
      alkis_layers_used: FILTER_INPUT_LAYERS.map((entry) => entry.layer),
      alkis_layers_skipped: FILTER_SKIPPED_LAYERS,
      enrich_stats: enrichStats.stats,
      parcels_loaded: parcels.rows.length,
      parcels_indexed: byFlurstueck.size,
      buildings_linked: linkedBuildings,
      address_ids: addressMap.size,
      hard_filter_eliminated: eliminated,
      candidates_exported: limited.length,
      overlay_rows: overlay.size,
      external_overlay_file: externalOverlayPath,
      min_score: args.minScore,
      external_data_needed: [
        'Bebauungsplan-specific GFZ (raster BPL; FNP BauNVO values used as proxy)',
        'Renovation year (Baugesuch portals, listings)',
        'Official Denkmalschutz list (LKI / Landesamt für Denkmalpflege)',
      ],
    },
  });

  const manifestPath = path.join(inputDir, '_filter-manifest.json');
  await fs.writeFile(
    manifestPath,
    JSON.stringify(
      {
        filtered_at: new Date().toISOString(),
        input_dir: inputDir,
        output_file: outputPath,
        parcels_loaded: parcels.rows.length,
        parcels_indexed: byFlurstueck.size,
        buildings_linked: linkedBuildings,
        address_ids: addressMap.size,
        alkis_layers_used: FILTER_INPUT_LAYERS.map((entry) => entry.layer),
        enrich_stats: enrichStats.stats,
        hard_filter_eliminated: eliminated,
        candidates_total: scored.length,
        candidates_exported: limited.length,
        top_score: limited[0]?.total_score ?? 0,
        overlay_file: args.overlay ?? externalOverlayPath ?? null,
        external_overlay_file: externalOverlayPath,
        fetch_gfz: args.fetchGfz,
        fetch_heating: args.fetchHeating,
        min_score: args.minScore,
      },
      null,
      2
    ),
    'utf8'
  );

  console.log(`\nHard-filter eliminated: ${eliminated}`);
  console.log(`Candidates scored: ${scored.length}`);
  console.log(`Exported: ${outputPath}`);
  console.log(`Manifest: ${manifestPath}`);

  if (limited[0]) {
    console.log(`Top score: ${limited[0].total_score} (${limited[0].score_reason})`);
  }
}
