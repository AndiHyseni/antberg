import fs from 'fs/promises';
import path from 'path';
import { STUTTGART_AGS } from '../config.js';
import { EXTERNAL_CACHE_DIR } from './config.js';

/** @typedef {{ agsPrefix?: string, onProgress?: (info: { loaded: number }) => void }} LoadOptions */

const SUPPORTED_EXT = new Set(['.json', '.geojson', '.ndjson', '.shp', '.gpkg']);

/**
 * @param {string} dir
 * @param {string} [baseDir]
 */
async function collectWaermeatlasFiles(dir, baseDir = dir) {
  /** @type {string[]} */
  const found = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return found;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...(await collectWaermeatlasFiles(full, baseDir)));
      continue;
    }
    if (!SUPPORTED_EXT.has(path.extname(entry.name).toLowerCase())) continue;
    found.push(full);
  }

  return found;
}

/**
 * @param {string} dir
 */
export async function findWaermeatlasDownload(dir) {
  const files = await collectWaermeatlasFiles(dir);
  if (!files.length) return null;

  const scored = files.map((file) => {
    const lower = file.toLowerCase();
    let score = 0;
    if (/gebaeude|gebäude|building/.test(lower)) score += 100;
    if (/baublock|strassen|raster|gemeinden|aggregiert/.test(lower)) score -= 50;
    if (path.extname(file).toLowerCase() === '.gpkg') score += 10;
    if (path.extname(file).toLowerCase() === '.shp') score += 5;
    if (/wad_bw.*\.shp$/i.test(file) && /gebaeude/.test(lower)) score += 20;
    return { file, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].file;
}

/**
 * @param {string} [explicitPath]
 */
export async function resolveWaermeatlasPath(explicitPath) {
  if (explicitPath) return path.resolve(explicitPath);

  const candidates = [
    path.join('data', 'waermeatlas'),
    path.join(EXTERNAL_CACHE_DIR, 'waermeatlas'),
  ];

  for (const dir of candidates) {
    const found = await findWaermeatlasDownload(dir);
    if (found) return found;
  }

  const cacheJson = path.join(
    EXTERNAL_CACHE_DIR,
    'waermeatlas',
    'stuttgart-buildings.json'
  );
  try {
    await fs.access(cacheJson);
    return cacheJson;
  } catch {
    return null;
  }
}

/**
 * @param {Record<string, unknown>} props
 * @param {string} agsPrefix
 */
function matchesAgs(props, agsPrefix) {
  if (!agsPrefix) return true;
  const raw = props.ags ?? props.AGS ?? props.gemeindeschluessel;
  if (raw == null) return true;
  const s = String(raw).replace(/\D/g, '');
  const prefix = agsPrefix.replace(/\D/g, '');
  return s.startsWith(prefix);
}

/**
 * @param {unknown} item
 */
function recordFromItem(item) {
  if (!item || typeof item !== 'object') return null;
  if ('properties' in item && item.properties) {
    return /** @type {Record<string, unknown>} */ (item.properties);
  }
  return /** @type {Record<string, unknown>} */ (item);
}

/**
 * @param {string} filePath
 * @param {LoadOptions} [options]
 */
async function* loadJsonRecords(filePath, options = {}) {
  const text = await fs.readFile(filePath, 'utf8');
  const trimmed = text.trim();

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const parsed = JSON.parse(text);
    const items = Array.isArray(parsed)
      ? parsed
      : parsed.features ?? parsed.properties ?? [];
    let loaded = 0;
    for (const item of items) {
      const record = recordFromItem(item);
      if (!record || !matchesAgs(record, options.agsPrefix ?? STUTTGART_AGS)) continue;
      loaded += 1;
      yield record;
      if (loaded % 50000 === 0) options.onProgress?.({ loaded });
    }
    return;
  }

  let loaded = 0;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const record = recordFromItem(JSON.parse(line));
    if (!record || !matchesAgs(record, options.agsPrefix ?? STUTTGART_AGS)) continue;
    loaded += 1;
    yield record;
    if (loaded % 50000 === 0) options.onProgress?.({ loaded });
  }
}

/**
 * @param {string} filePath
 * @param {LoadOptions} [options]
 */
async function* loadShpRecords(filePath, options = {}) {
  const shapefile = await import('shapefile');
  const agsPrefix = options.agsPrefix ?? STUTTGART_AGS;
  let loaded = 0;

  const source = await shapefile.open(filePath);
  while (true) {
    const result = await source.read();
    if (result.done) break;
    const props = result.value?.properties ?? {};
    if (!matchesAgs(props, agsPrefix)) continue;
    loaded += 1;
    yield props;
    if (loaded % 50000 === 0) options.onProgress?.({ loaded });
  }
}

/**
 * @param {string} filePath
 * @param {LoadOptions} [options]
 */
async function* loadGpkgRecords(filePath, options = {}) {
  const initSqlJs = (await import('sql.js')).default;
  const SQL = await initSqlJs({
    locateFile: (file) =>
      path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
  });

  const buffer = await fs.readFile(filePath);
  const db = new SQL.Database(buffer);

  const tables = db.exec(
    "SELECT table_name FROM gpkg_contents WHERE data_type = 'features' ORDER BY table_name"
  );
  const tableNames =
    tables[0]?.values?.map((row) => String(row[0])) ??
    db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'gpkg_%' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'rtree_%'")[0]?.values?.map((row) => String(row[0])) ??
    [];

  if (!tableNames.length) {
    db.close();
    throw new Error(`No feature table found in GeoPackage: ${filePath}`);
  }

  const table = tableNames.find((t) => /geb|build|waerm|heat/i.test(t)) ?? tableNames[0];
  const cols = db.exec(`PRAGMA table_info("${table.replace(/"/g, '""')}")`)[0]?.values ?? [];
  const colNames = cols.map((row) => String(row[1]));
  const agsCol = colNames.find((c) => /^ags$/i.test(c));

  const agsPrefix = (options.agsPrefix ?? STUTTGART_AGS).replace(/\D/g, '');
  const where = agsCol ? ` WHERE CAST("${agsCol}" AS TEXT) LIKE '${agsPrefix}%'` : '';
  const quotedCols = colNames.map((c) => `"${c.replace(/"/g, '""')}"`).join(', ');

  const stmt = db.prepare(`SELECT ${quotedCols} FROM "${table.replace(/"/g, '""')}"${where}`);
  let loaded = 0;

  while (stmt.step()) {
    const row = stmt.getAsObject();
    if (agsCol && !matchesAgs(row, agsPrefix)) continue;
    loaded += 1;
    yield row;
    if (loaded % 50000 === 0) options.onProgress?.({ loaded });
  }

  stmt.free();
  db.close();
}

/**
 * @param {string} filePath
 * @param {LoadOptions} [options]
 * @returns {AsyncGenerator<Record<string, unknown>>}
 */
export async function* loadWaermeatlasRecords(filePath, options = {}) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.shp') {
    yield* loadShpRecords(filePath, options);
    return;
  }
  if (ext === '.gpkg') {
    yield* loadGpkgRecords(filePath, options);
    return;
  }
  if (ext === '.json' || ext === '.geojson' || ext === '.ndjson') {
    yield* loadJsonRecords(filePath, options);
    return;
  }

  throw new Error(
    `Unsupported Wärmeatlas file "${filePath}". Use .gpkg, .shp, .geojson, or .json from KEA-BW download.`
  );
}

/**
 * @param {string} sourcePath
 * @param {string} cachePath
 * @param {LoadOptions} [options]
 */
export async function buildWaermeatlasStuttgartCache(sourcePath, cachePath, options = {}) {
  /** @type {Record<string, unknown>[]} */
  const rows = [];
  let loaded = 0;

  for await (const record of loadWaermeatlasRecords(sourcePath, options)) {
    rows.push(record);
    loaded += 1;
    if (loaded % 25000 === 0) {
      console.log(`  cached ${loaded} Stuttgart building(s)...`);
    }
  }

  await fs.mkdir(path.dirname(cachePath), { recursive: true });
  await fs.writeFile(
    cachePath,
    JSON.stringify(
      {
        source: sourcePath,
        ags_prefix: options.agsPrefix ?? STUTTGART_AGS,
        generated_at: new Date().toISOString(),
        count: rows.length,
        properties: rows,
      },
      null,
      2
    ),
    'utf8'
  );

  console.log(`Wärmeatlas cache: ${rows.length} building(s) → ${cachePath}`);
  return { count: rows.length, path: cachePath };
}

/**
 * @param {string} [filePath]
 * @param {LoadOptions & { cachePath?: string, rebuildCache?: boolean }} [options]
 */
export async function loadWaermeatlasBuildingMap(filePath, options = {}) {
  const resolved = await resolveWaermeatlasPath(filePath);
  if (!resolved) {
    throw new Error(
      'No Wärmeatlas file found. Download from KEA-BW and place in data/waermeatlas/ (see npm run import:waermeatlas --help)'
    );
  }

  const cachePath =
    options.cachePath ??
    path.join(EXTERNAL_CACHE_DIR, 'waermeatlas', 'stuttgart-buildings.json');

  const sourceExt = path.extname(resolved).toLowerCase();
  const useCache =
    !options.rebuildCache &&
    sourceExt !== '.json' &&
    !resolved.endsWith('stuttgart-buildings.json');

  if (useCache) {
    try {
      const cached = JSON.parse(await fs.readFile(cachePath, 'utf8'));
      if (cached.properties?.length) {
        console.log(
          `Using Wärmeatlas cache (${cached.properties.length} buildings): ${cachePath}`
        );
        console.log(`  (delete cache or pass --rebuild-cache to refresh from ${resolved})`);
        return { source: cachePath, records: cached.properties };
      }
    } catch {
      // build cache below
    }
  }

  if (
    sourceExt === '.gpkg' ||
    sourceExt === '.shp' ||
    (options.rebuildCache && sourceExt !== '.json')
  ) {
    console.log(`Building Stuttgart Wärmeatlas cache from ${resolved}...`);
    await buildWaermeatlasStuttgartCache(resolved, cachePath, options);
    const cached = JSON.parse(await fs.readFile(cachePath, 'utf8'));
    return { source: cachePath, records: cached.properties };
  }

  /** @type {Record<string, unknown>[]} */
  const records = [];
  for await (const record of loadWaermeatlasRecords(resolved, options)) {
    records.push(record);
  }
  return { source: resolved, records };
}
