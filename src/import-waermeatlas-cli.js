import path from 'path';
import {
  buildWaermeatlasStuttgartCache,
  findWaermeatlasDownload,
  resolveWaermeatlasPath,
} from './external/loadWaermeatlas.js';
import { EXTERNAL_CACHE_DIR } from './external/config.js';
import { STUTTGART_AGS } from './config.js';

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  /** @type {Record<string, string|boolean|undefined>} */
  const args = {
    file: undefined,
    ags: STUTTGART_AGS,
    out: undefined,
    rebuild: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--file') args.file = argv[++i];
    else if (arg === '--ags') args.ags = argv[++i];
    else if (arg === '--out') args.out = argv[++i];
    else if (arg === '--rebuild-cache') args.rebuild = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
  }

  return args;
}

function printHelp() {
  console.log(`Import Wärmeatlas Baden-Württemberg (KEA-BW download, Option A)

1. Download building data from KEA-BW:
   https://www.kea-bw.de/waermewende/angebote/downloads
   → "Link zum Online-Speicher mit den Daten des WärmeatlasBW"
   https://share.kea-bw.de/index.php/s/y8frJ42eBdJQBgx

2. Extract the gebäudescharf / building layer (.gpkg or .shp) into:
   data/waermeatlas/

3. Run this command to build a Stuttgart-only cache:

   npm run import:waermeatlas -- --file data/waermeatlas/your-file.gpkg

4. Merge heating into overlay + re-filter:

   npm run fetch:external -- --heating-only
   npm run filter:stuttgart -- --overlay output/stuttgart-alkis-2026-07-03/_external-overlay.json

Options:
  --file <path>       .gpkg, .shp, .geojson, or .json (default: auto-find in data/waermeatlas/)
  --ags <code>        Municipality filter prefix (default 08111 = Stuttgart)
  --out <path>        Cache output (default cache/external/waermeatlas/stuttgart-buildings.json)
  --rebuild-cache     Force rebuild even if cache exists
  --help              Show help
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const file =
    args.file != null
      ? String(args.file)
      : await resolveWaermeatlasPath(undefined);

  if (!file) {
    const dir = path.join('data', 'waermeatlas');
    console.error(`No Wärmeatlas file found in ${dir}/`);
    console.error('Download from KEA-BW and place .gpkg or .shp there, then re-run.');
    console.error('');
    printHelp();
    process.exit(1);
  }

  const out =
    args.out != null
      ? String(args.out)
      : path.join(EXTERNAL_CACHE_DIR, 'waermeatlas', 'stuttgart-buildings.json');

  const found = await findWaermeatlasDownload(path.dirname(file));
  if (found && found !== file) {
    console.log(`Note: also found ${found}`);
  }

  await buildWaermeatlasStuttgartCache(file, out, {
    agsPrefix: String(args.ags),
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
