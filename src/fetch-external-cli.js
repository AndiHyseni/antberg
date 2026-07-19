import fs from 'fs/promises';
import path from 'path';
import { buildExternalOverlay } from './external/buildOverlay.js';
import { parcelsFromIndex } from './external/index.js';
import { layerExcelPath, readExcelRows } from './filter/readExcel.js';
import { indexParcels, attachBuildings } from './filter/join.js';

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  /** @type {Record<string, string|number|boolean|undefined>} */
  const args = {
    inputDir: 'output/stuttgart-alkis-2026-07-03',
    gfz: true,
    heating: true,
    maxFnpTiles: undefined,
    heatingFile: undefined,
    rebuildCache: false,
    output: undefined,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--input-dir') args.inputDir = argv[++i];
    else if (arg === '--output') args.output = argv[++i];
    else if (arg === '--heating-file') args.heatingFile = argv[++i];
    else if (arg === '--rebuild-cache') args.rebuildCache = true;
    else if (arg === '--max-fnp-tiles') args.maxFnpTiles = Number(argv[++i]);
    else if (arg === '--gfz-only') {
      args.gfz = true;
      args.heating = false;
    } else if (arg === '--heating-only') {
      args.gfz = false;
      args.heating = true;
    } else if (arg === '--no-gfz') args.gfz = false;
    else if (arg === '--no-heating') args.heating = false;
    else if (arg === '--help' || arg === '-h') args.help = true;
  }

  return args;
}

function printHelp() {
  console.log(`Fetch Geoportal GFZ + Wärmeatlas heating overlay

Usage:
  npm run fetch:external -- [options]

Options:
  --input-dir <dir>       ALKIS export directory (default output/stuttgart-alkis-2026-07-03)
  --output <file>         Overlay JSON path (default <input-dir>/_external-overlay.json)
  --gfz-only              Only fetch FNP/BauNVO GFZ (step 1)
  --heating-only          Only fetch Wärmeatlas heating (step 2)
  --no-gfz                Skip GFZ fetch
  --no-heating            Skip heating fetch
  --heating-file <path>   KEA download (.gpkg, .shp, .geojson) — or put file in data/waermeatlas/
  --rebuild-cache         Rebuild Stuttgart cache from source file
  --max-fnp-tiles <n>     Limit FNP WFS tiles (testing)
  --help                  Show help

Wärmeatlas (Option A):
  1. Download: https://share.kea-bw.de/index.php/s/y8frJ42eBdJQBgx
  2. Place building layer in data/waermeatlas/
  3. npm run import:waermeatlas
  4. npm run fetch:external -- --heating-only

Pipeline order: GFZ first, then heating (merged into one overlay).

Then run:
  npm run filter:stuttgart -- --overlay <input-dir>/_external-overlay.json
`);
}

export async function runExternalFetch(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    printHelp();
    return;
  }

  const inputDir = String(args.inputDir);
  const parcelsFile = layerExcelPath(inputDir, 'v_al_flurstueck');
  const buildingsFile = layerExcelPath(inputDir, 'v_al_gebaeude');

  const parcels = await readExcelRows(parcelsFile, 'v_al_flurstueck');
  const buildings = await readExcelRows(buildingsFile, 'v_al_gebaeude');
  const { byFlurstueck, grid } = indexParcels(parcels.rows);
  const linkedBuildings = attachBuildings(grid, buildings.rows);
  console.log(`Linked ${linkedBuildings} building(s) to ${byFlurstueck.size} parcel(s)`);

  const parcelPoints = parcelsFromIndex(byFlurstueck, buildings.rows);

  const outputPath =
    args.output != null
      ? String(args.output)
      : path.join(inputDir, '_external-overlay.json');

  await buildExternalOverlay(parcelPoints, {
    gfz: args.gfz !== false,
    heating: args.heating !== false,
    heatingFile: args.heatingFile ? String(args.heatingFile) : undefined,
    maxFnpTiles: args.maxFnpTiles ? Number(args.maxFnpTiles) : undefined,
    outputPath,
    mergeExisting: args.heating === true && args.gfz === false,
    rebuildCache: args.rebuildCache === true,
  });
}

runExternalFetch().catch((err) => {
  console.error(err);
  process.exit(1);
});
