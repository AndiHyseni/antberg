import fs from 'fs/promises';
import path from 'path';
import { ALKIS_LAYERS, NON_SPATIAL_LAYERS } from './layers.js';
import {
  DEFAULT_TILE_SIZE,
  LICENSE_ATTRIBUTION,
  OUTPUT_DIR,
  WFS_BASE_URL,
} from './config.js';
import { layerOutputFilename, writeLayerExcel } from './export/excel.js';
import { featuresToRows } from './parse/gmlToRows.js';
import {
  collectReferenceIdsFromCachedTiles,
  downloadLayerByReferenceIds,
} from './wfs/fetchByFilter.js';
import { downloadLayerTiles } from './wfs/fetchTile.js';
import {
  buildTileGrid,
  filterStuttgartFeatures,
  resolveStuttgartExtent,
} from './wfs/stuttgartBbox.js';

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  /** @type {Record<string, string|boolean|number|string[]|undefined>} */
  const args = {
    resume: false,
    includeWkt: false,
    tileSize: DEFAULT_TILE_SIZE,
    layers: undefined,
    maxTiles: undefined,
    outDir: undefined,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--resume') args.resume = true;
    else if (arg === '--include-wkt') args.includeWkt = argv[++i] !== 'false';
    else if (arg === '--tile-size') args.tileSize = Number(argv[++i]);
    else if (arg === '--layer') args.layers = [argv[++i]];
    else if (arg === '--layers') args.layers = argv[++i].split(',');
    else if (arg === '--max-tiles') args.maxTiles = Number(argv[++i]);
    else if (arg === '--out-dir') args.outDir = argv[++i];
    else if (arg === '--out') args.outDir = argv[++i];
    else if (arg === '--help' || arg === '-h') args.help = true;
  }

  return args;
}

function defaultOutputDir() {
  const date = new Date().toISOString().slice(0, 10);
  return path.join(OUTPUT_DIR, `stuttgart-alkis-${date}`);
}

function printHelp() {
  console.log(`Stuttgart ALKIS Full Excel Export

Usage:
  npm run export:stuttgart [-- options]

Options:
  --out-dir <dir>        Output directory (one .xlsx per layer)
  --resume               Reuse cached GML tiles; skip layers already exported
  --tile-size <meters>   Tile size in EPSG:25832 (default ${DEFAULT_TILE_SIZE})
  --layer <name>         Export only one layer (e.g. v_al_flurstueck)
  --layers a,b,c         Export comma-separated layers
  --max-tiles <n>        Limit tiles (smoke testing)
  --include-wkt true     Include geometry_wkt column (default false, saves memory)
  --help                 Show this help

Attribution: ${LICENSE_ATTRIBUTION}
WFS: ${WFS_BASE_URL}
`);
}

/**
 * @param {import('@turf/helpers').Feature[]} features
 * @param {boolean} includeWkt
 */
async function toRows(features, includeWkt) {
  const rows = await featuresToRows(features);
  if (includeWkt) return rows;
  return rows.map(({ geometry_wkt, ...rest }) => rest);
}

/**
 * @param {string} outDir
 * @param {string} layer
 */
function layerFilePath(outDir, layer) {
  return path.join(outDir, layerOutputFilename(layer));
}

/**
 * @param {string} filePath
 */
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const outDir = args.outDir ? String(args.outDir) : defaultOutputDir();
  await fs.mkdir(outDir, { recursive: true });

  console.log('Resolving Stuttgart extent...');
  const { bbox, polygon } = await resolveStuttgartExtent();
  console.log(`BBox EPSG:25832: [${bbox.join(', ')}]`);

  let tiles = buildTileGrid(bbox, Number(args.tileSize));
  if (args.maxTiles) {
    tiles = tiles.slice(0, Number(args.maxTiles));
    console.log(`Limited to ${tiles.length} tile(s) for smoke test.`);
  } else {
    console.log(`Tile grid: ${tiles.length} tiles @ ${args.tileSize}m`);
  }

  const layers = args.layers?.length ? args.layers : ALKIS_LAYERS;
  const exportInfo = {
    bbox,
    tile_count: tiles.length,
    tile_size_m: args.tileSize,
    resume: args.resume,
    include_wkt: args.includeWkt,
  };

  console.log(`Exporting ${layers.length} layer(s) -> ${outDir}/<layer>.xlsx`);

  /** @type {{ layer: string, file: string, rowCount: number, skipped?: boolean, error?: string }[]} */
  const summary = [];
  let totalFeatures = 0;

  for (let i = 0; i < layers.length; i += 1) {
    const layer = layers[i];
    const outputPath = layerFilePath(outDir, layer);

    if (args.resume && (await fileExists(outputPath))) {
      console.log(`\n[${i + 1}/${layers.length}] Layer ${layer} — skipped (already exists)`);
      summary.push({ layer, file: outputPath, rowCount: 0, skipped: true });
      continue;
    }

    console.log(`\n[${i + 1}/${layers.length}] Layer ${layer}`);

    try {
      const nonSpatial = NON_SPATIAL_LAYERS[layer];
      let features;

      if (nonSpatial) {
        console.log(
          `  geometry-less layer — fetching via ${nonSpatial.referenceLayer}.${nonSpatial.referenceProperty}`
        );

        const referenceIds = await collectReferenceIdsFromCachedTiles({
          referenceLayer: nonSpatial.referenceLayer,
          referenceProperty: nonSpatial.referenceProperty,
          tiles,
          polygon,
          resume: Boolean(args.resume),
        });
        console.log(`  ${referenceIds.size} Stuttgart reference ID(s)`);

        features = await downloadLayerByReferenceIds({
          layer,
          matchProperty: nonSpatial.matchProperty,
          referenceIds,
          batchSize: nonSpatial.batchSize,
          resume: Boolean(args.resume),
          includeWkt: Boolean(args.includeWkt),
          onProgress: ({ batchIndex, total, featureCount }) => {
            process.stdout.write(
              `\r  batch ${batchIndex}/${total} — ${featureCount} unique features`
            );
          },
        });
        process.stdout.write('\n');
      } else {
        features = await downloadLayerTiles({
          layer,
          tiles,
          resume: Boolean(args.resume),
          includeWkt: Boolean(args.includeWkt),
          onProgress: ({ tileIndex, total, featureCount }) => {
            process.stdout.write(
              `\r  tile ${tileIndex}/${total} — ${featureCount} unique features`
            );
          },
        });
        process.stdout.write('\n');
      }

      const filtered = nonSpatial
        ? features
        : await filterStuttgartFeatures(features, polygon);

      if (!nonSpatial) {
        console.log(
          `  raw ${features.length} -> stuttgart ${filtered.length} features`
        );
      } else {
        console.log(`  ${filtered.length} feature(s) matched`);
      }

      const rows = await toRows(filtered, Boolean(args.includeWkt));
      const result = await writeLayerExcel({
        outputPath,
        layer,
        rows,
        exportInfo,
      });

      totalFeatures += result.rowCount;
      summary.push({ layer, file: outputPath, rowCount: result.rowCount });
      console.log(`  wrote ${outputPath} (${result.rowCount} rows)`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ERROR: ${message}`);
      summary.push({ layer, file: outputPath, rowCount: 0, error: message });
    }
  }

  const manifestPath = path.join(outDir, '_export-manifest.json');
  await fs.writeFile(
    manifestPath,
    JSON.stringify(
      {
        exported_at: new Date().toISOString(),
        output_dir: outDir,
        total_features: totalFeatures,
        layers: summary,
        ...exportInfo,
        attribution: LICENSE_ATTRIBUTION,
      },
      null,
      2
    ),
    'utf8'
  );

  console.log(`\nDone. ${layers.length} layer file(s) in ${outDir}`);
  console.log(`Total features exported: ${totalFeatures}`);
  console.log(`Manifest: ${manifestPath}`);
  console.log(LICENSE_ATTRIBUTION);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
