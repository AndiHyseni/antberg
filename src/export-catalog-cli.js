import fs from 'fs/promises';
import path from 'path';
import { buildCatalog, scoredPropertyFromRow } from './potential/catalog.js';
import { readExcelRows } from './filter/readExcel.js';
import { STRATEGIES } from './potential/strategies.js';

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  /** @type {Record<string, string|number|boolean|undefined>} */
  const args = {
    input: 'output/stuttgart-alkis-2026-07-03/redevelopment-candidates.xlsx',
    manifest: 'output/stuttgart-alkis-2026-07-03/_filter-manifest.json',
    out: 'data/catalog.json',
    strategy: 'value_add',
    ticketMin: undefined,
    ticketMax: undefined,
    limit: 100,
    city: 'Stuttgart',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--input') args.input = argv[++i];
    else if (arg === '--manifest') args.manifest = argv[++i];
    else if (arg === '--out') args.out = argv[++i];
    else if (arg === '--strategy') args.strategy = argv[++i];
    else if (arg === '--ticket-min') args.ticketMin = Number(argv[++i]);
    else if (arg === '--ticket-max') args.ticketMax = Number(argv[++i]);
    else if (arg === '--limit') args.limit = Number(argv[++i]);
    else if (arg === '--city') args.city = argv[++i];
    else if (arg === '--help' || arg === '-h') args.help = true;
  }

  return args;
}

function printHelp() {
  console.log(`Export opportunity catalogue for client UI (C2/C3)

Usage:
  npm run export:catalog -- [options]

Options:
  --input <xlsx>      redevelopment-candidates.xlsx (default)
  --manifest <json>   filter manifest for scan stats
  --out <json>        output path (default data/catalog.json)
  --strategy <id>     value_add | buy_hold | fix_flip | development | …
  --ticket-min <€>    minimum ticket filter
  --ticket-max <€>    maximum ticket filter
  --limit <n>         catalogue size (default 100)
  --city <name>       municipality filter (default Stuttgart)
  --help              Show help

Strategies: ${STRATEGIES.map((s) => s.id).join(', ')}
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const inputPath = String(args.input);
  try {
    await fs.access(inputPath);
  } catch {
    console.error(`Input not found: ${inputPath}`);
    console.error('Run npm run filter:stuttgart first.');
    process.exit(1);
  }

  /** @type {{ parcels_indexed?: number, hard_filter_eliminated?: number, candidates_total?: number }} */
  let manifest = {};
  try {
    manifest = JSON.parse(await fs.readFile(String(args.manifest), 'utf8'));
  } catch {
    // optional
  }

  console.log(`Reading ${inputPath}...`);
  const { rows } = await readExcelRows(inputPath, 'redevelopment_candidates');
  const candidates = rows.map(scoredPropertyFromRow);

  const catalog = buildCatalog(
    candidates,
    {
      strategy: /** @type {import('./potential/strategies.js').StrategyId} */ (
        String(args.strategy)
      ),
      ticketMin: args.ticketMin != null ? Number(args.ticketMin) : undefined,
      ticketMax: args.ticketMax != null ? Number(args.ticketMax) : undefined,
      limit: Number(args.limit),
      city: String(args.city),
    },
    {
      scanned: manifest.parcels_indexed ?? candidates.length,
      eliminated: manifest.hard_filter_eliminated ?? 0,
    }
  );

  const outPath = path.resolve(String(args.out));
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(catalog, null, 2), 'utf8');

  console.log(catalog.context.context_line);
  console.log(`Catalog: ${catalog.cards.length} cards → ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
