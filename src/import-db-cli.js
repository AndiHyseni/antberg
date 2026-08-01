import fs from 'fs/promises';
import path from 'path';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';
import { loadDatabaseEnv } from './db/loadEnv.js';
import { seedOperationalData } from './db/seedOperational.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  /** @type {Record<string, string|boolean|undefined>} */
  const args = {
    catalog: 'data/catalog.json',
    evaluations: true,
    reset: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--catalog') args.catalog = argv[++i];
    else if (arg === '--no-evaluations') args.evaluations = false;
    else if (arg === '--reset') args.reset = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
  }

  return args;
}

function printHelp() {
  console.log(`Import Antberg JSON data into MySQL

Usage:
  npm run import:db -- [options]

Setup:
  1. Copy database/.env.example → database/.env
  2. Set MYSQL_PASSWORD (and user if not root)
  3. Run schema.sql in MySQL Workbench first

Options:
  --catalog <path>   catalog.json path (default data/catalog.json)
  --no-evaluations   Skip data/evaluations/*.json
  --reset            Clear imported rows before load (keeps schema)
  --help             Show help
`);
}

/**
 * @param {import('mysql2/promise').Connection} conn
 */
async function seedBasics(conn) {
  await conn.query(`
    INSERT INTO clients (id, name, slug) VALUES
      (1, 'Freeman Capital Partners', 'freeman-capital')
    ON DUPLICATE KEY UPDATE name = VALUES(name)
  `);

  await conn.query(`
    INSERT INTO users (id, client_id, email, display_name, role) VALUES
      (1, 1, 'alex@freemancapital.example', 'Alex Freeman', 'client')
    ON DUPLICATE KEY UPDATE display_name = VALUES(display_name)
  `);

  const capexRows = [
    ['roof', 'Roof', 'm2', 85, 140],
    ['facade', 'Facade', 'm2', 120, 220],
    ['windows', 'Windows', 'm2', 450, 750],
    ['heating', 'Heating system', 'unit', 12000, 22000],
    ['electricity', 'Electrical installation', 'unit', 3500, 8000],
    ['pipes', 'Pipes / sanitation', 'unit', 4500, 9000],
    ['bathrooms', 'Bathrooms', 'unit', 8000, 15000],
    ['floors', 'Floors / interior', 'm2', 45, 95],
    ['basement', 'Basement / cellar', 'm2', 35, 75],
    ['moisture', 'Moisture remediation', 'flat', 8000, 25000],
    ['fire_protection', 'Fire protection', 'flat', 5000, 18000],
    ['energy_upgrade', 'Energy upgrade package', 'm2', 180, 320],
    ['common_areas', 'Common areas', 'm2', 250, 450],
  ];

  for (const row of capexRows) {
    await conn.query(
      `INSERT INTO capex_cost_components (component, label, unit, cost_low_eur, cost_high_eur, updated_by)
       VALUES (?, ?, ?, ?, ?, 'system')
       ON DUPLICATE KEY UPDATE
         cost_low_eur = VALUES(cost_low_eur),
         cost_high_eur = VALUES(cost_high_eur)`,
      row
    );
  }
}

/**
 * @param {import('mysql2/promise').Connection} conn
 */
async function resetImportedData(conn) {
  await conn.query('SET FOREIGN_KEY_CHECKS = 0');
  const tables = [
    'activity_log',
    'offers',
    'evaluation_scenarios',
    'evaluation_valuations',
    'evaluation_capex_items',
    'evaluation_facts',
    'evaluation_documents',
    'evaluations',
    'pipeline_items',
    'mandate_contracts',
    'mandate_items',
    'mandates',
    'selections',
    'property_views',
    'dossier_risks',
    'dossier_insights',
    'dossiers',
    'catalog_items',
    'scan_runs',
    'property_scores',
    'property_geo_overlay',
    'properties',
    'scouting_order_signals',
    'scouting_order_assets',
    'scouting_orders',
  ];
  for (const table of tables) {
    await conn.query(`TRUNCATE TABLE ${table}`);
  }
  await conn.query('SET FOREIGN_KEY_CHECKS = 1');
}

/**
 * @param {import('mysql2/promise').PoolConnection} conn
 * @param {Record<string, unknown>} dossier
 * @param {number} clientId
 * @param {number} scanRunId
 * @param {number} rank
 */
async function importDossier(conn, dossier, clientId, scanRunId, rank) {
  const objectId = String(dossier.object_id);
  const flurstueck = String(dossier.flurstueckskennzeichen ?? objectId);

  const [propResult] = await conn.query(
    `INSERT INTO properties (
      object_id, flurstueckskennzeichen, municipality, district_label, address_full,
      parcel_m2, land_use, asset_type, centroid_x, centroid_y, alkis_export_batch
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      district_label = VALUES(district_label),
      parcel_m2 = VALUES(parcel_m2),
      land_use = VALUES(land_use),
      asset_type = VALUES(asset_type),
      centroid_x = VALUES(centroid_x),
      centroid_y = VALUES(centroid_y)`,
    [
      objectId,
      flurstueck,
      dossier.municipality ?? null,
      dossier.district ?? null,
      dossier.address_full ?? null,
      dossier.parcel_m2 ?? null,
      dossier.land_use ?? null,
      dossier.asset_type ?? null,
      dossier.centroid_x ?? null,
      dossier.centroid_y ?? null,
      'stuttgart-alkis-2026-07-03',
    ]
  );

  const propertyId =
    propResult.insertId ||
    (
      await conn.query('SELECT id FROM properties WHERE flurstueckskennzeichen = ? LIMIT 1', [
        flurstueck,
      ])
    )[0][0]?.id;

  const builtGfa = dossier.built_gfa ?? null;
  const allowedGfa = dossier.allowed_gfa ?? null;
  let utilization = null;
  if (builtGfa != null && allowedGfa) {
    utilization = Math.round((Number(builtGfa) / Number(allowedGfa)) * 10000) / 100;
  }

  await conn.query(
    `INSERT INTO property_geo_overlay (
      property_id, allowed_gfa_m2, built_gfa_m2, utilization_pct, heating_signal
    ) VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      allowed_gfa_m2 = VALUES(allowed_gfa_m2),
      built_gfa_m2 = VALUES(built_gfa_m2),
      utilization_pct = VALUES(utilization_pct),
      heating_signal = VALUES(heating_signal)`,
    [propertyId, allowedGfa, builtGfa, utilization, dossier.heating_signal ?? null]
  );

  const breakdown = /** @type {Record<string, number>} */ (dossier.score_breakdown ?? {});
  await conn.query(
    `INSERT INTO property_scores (
      property_id, floor_upside_score, utilization_gap_score, renovation_neglect_score,
      heating_distress_score, age_bonus_score, parcel_bonus_score, total_score,
      leading_signal, data_gaps_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      total_score = VALUES(total_score),
      leading_signal = VALUES(leading_signal),
      data_gaps_json = VALUES(data_gaps_json)`,
    [
      propertyId,
      breakdown.floor_upside ?? 0,
      breakdown.utilization_gap ?? 0,
      breakdown.renovation_neglect ?? 0,
      breakdown.heating_distress ?? 0,
      breakdown.age_bonus ?? 0,
      breakdown.parcel_bonus ?? 0,
      dossier.score ?? 0,
      dossier.leading_signal ?? null,
      JSON.stringify(dossier.data_gaps ?? []),
    ]
  );

  const [catalogResult] = await conn.query(
    `INSERT INTO catalog_items (
      scan_run_id, property_id, rank_position, match_score, ticket_low_eur, ticket_high_eur, is_high_priority
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      scanRunId,
      propertyId,
      rank,
      dossier.score ?? 0,
      dossier.ticket_low ?? null,
      dossier.ticket_high ?? null,
      (dossier.score ?? 0) >= 17 ? 1 : 0,
    ]
  );

  const catalogItemId = catalogResult.insertId;
  const values = /** @type {Record<string, number>} */ (dossier.values ?? {});

  const [dossierResult] = await conn.query(
    `INSERT INTO dossiers (
      catalog_item_id, strategy_id, strategy_label, strategy_fit_text,
      value_today_eur, value_after_eur, upside_low_eur, upside_high_eur
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      catalogItemId,
      dossier.strategy_id ?? 'value_add',
      dossier.strategy_label ?? 'Value Add',
      dossier.strategy_fit ?? '',
      values.today ?? null,
      values.after ?? null,
      values.upside_low ?? null,
      values.upside_high ?? null,
    ]
  );

  const dossierId = dossierResult.insertId;
  const pairs = /** @type {{ weakness: string, upside: string }[]} */ (
    dossier.weakness_upside ?? []
  );
  for (let i = 0; i < pairs.length; i += 1) {
    await conn.query(
      `INSERT INTO dossier_insights (dossier_id, sort_order, weakness, upside) VALUES (?, ?, ?, ?)`,
      [dossierId, i, pairs[i].weakness, pairs[i].upside]
    );
  }

  const risks = /** @type {{ label: string, severity: string }[]} */ (dossier.risks ?? []);
  for (const risk of risks) {
    await conn.query(`INSERT INTO dossier_risks (dossier_id, label, severity) VALUES (?, ?, ?)`, [
      dossierId,
      risk.label,
      risk.severity ?? 'medium',
    ]);
  }

  return { propertyId, clientId };
}

/**
 * @param {import('mysql2/promise').PoolConnection} conn
 * @param {Record<string, unknown>} record
 */
async function importEvaluation(conn, record) {
  const objectId = String(record.object_id ?? 'STG-000000');

  const [existing] = await conn.query(
    'SELECT id FROM properties WHERE object_id = ? LIMIT 1',
    [objectId]
  );

  let propertyId = existing[0]?.id;
  if (!propertyId) {
    const flurstueck = `EVAL-${objectId}`;
    const [propResult] = await conn.query(
      `INSERT INTO properties (object_id, flurstueckskennzeichen, municipality, asset_type)
       VALUES (?, ?, ?, ?)`,
      [objectId, flurstueck, record.intake?.municipality ?? 'Stuttgart', 'Mixed-use']
    );
    propertyId = propResult.insertId;
  }

  let mandateDbId = null;
  if (record.mandate_id) {
    const ref = String(record.mandate_id);
    await conn.query(
      `INSERT INTO mandates (client_id, reference_code, status)
       VALUES (1, ?, 'active')
       ON DUPLICATE KEY UPDATE status = VALUES(status)`,
      [ref]
    );
    const [[mandateRow]] = await conn.query(
      'SELECT id FROM mandates WHERE reference_code = ? LIMIT 1',
      [ref]
    );
    mandateDbId = mandateRow?.id ?? null;
  }

  const offer = record.offer ?? {};
  await conn.query(
    `INSERT INTO evaluations (
      eval_code, property_id, mandate_id, status, confidence_pct,
      missing_docs_json, intake_json, income_json, location_json,
      verification_json, report_json, recommendation,
      safe_offer_low_eur, safe_offer_high_eur, do_not_exceed_eur,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      status = VALUES(status),
      confidence_pct = VALUES(confidence_pct),
      report_json = VALUES(report_json),
      updated_at = VALUES(updated_at)`,
    [
      record.eval_id,
      propertyId,
      mandateDbId,
      record.status ?? 'draft',
      record.confidence_pct ?? 0,
      JSON.stringify(record.missing_docs ?? []),
      JSON.stringify(record.intake ?? {}),
      JSON.stringify(record.income ?? {}),
      JSON.stringify(record.location ?? {}),
      JSON.stringify(record.verification ?? {}),
      JSON.stringify(record.report ?? {}),
      record.recommendation ?? null,
      offer.safe_low ?? offer.safe_offer_low_eur ?? null,
      offer.safe_high ?? offer.safe_offer_high_eur ?? null,
      offer.do_not_exceed ?? offer.do_not_exceed_eur ?? null,
      record.created_at ? new Date(String(record.created_at)) : new Date(),
      record.updated_at ? new Date(String(record.updated_at)) : new Date(),
    ]
  );

  const [[evalRow]] = await conn.query('SELECT id FROM evaluations WHERE eval_code = ? LIMIT 1', [
    record.eval_id,
  ]);
  const evaluationId = evalRow.id;

  for (const doc of record.documents ?? []) {
    await conn.query(
      `INSERT INTO evaluation_documents (evaluation_id, doc_type, label, filename, status, uploaded_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        evaluationId,
        doc.type,
        doc.label,
        doc.filename ?? null,
        doc.status ?? 'pending',
        doc.uploaded_at ? new Date(String(doc.uploaded_at)) : null,
      ]
    );
  }

  for (const item of record.capex?.items ?? []) {
    await conn.query(
      `INSERT INTO evaluation_capex_items (
        evaluation_id, component, condition_level, urgency, cost_low_eur, cost_high_eur, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        cost_low_eur = VALUES(cost_low_eur),
        cost_high_eur = VALUES(cost_high_eur)`,
      [
        evaluationId,
        item.component,
        item.condition ?? item.condition_level ?? 'fair',
        item.urgency ?? 'medium',
        item.cost_low_eur ?? item.low ?? 0,
        item.cost_high_eur ?? item.high ?? 0,
        item.note ?? null,
      ]
    );
  }

  for (const val of record.valuations ?? []) {
    await conn.query(
      `INSERT INTO evaluation_valuations (
        evaluation_id, method, value_low_eur, value_high_eur, inputs_json, explanation
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        evaluationId,
        val.method,
        val.value_low_eur ?? val.low ?? 0,
        val.value_high_eur ?? val.high ?? 0,
        JSON.stringify(val.inputs ?? {}),
        val.explanation ?? null,
      ]
    );
  }

  for (const scenario of record.scenarios ?? []) {
    await conn.query(
      `INSERT INTO evaluation_scenarios (
        evaluation_id, scenario, label,
        total_cost_low_eur, total_cost_high_eur,
        exit_value_low_eur, exit_value_high_eur,
        profit_low_eur, profit_high_eur,
        max_offer_low_eur, max_offer_high_eur
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE label = VALUES(label)`,
      [
        evaluationId,
        scenario.scenario,
        scenario.label,
        scenario.total_cost_low_eur ?? scenario.total_cost?.low ?? 0,
        scenario.total_cost_high_eur ?? scenario.total_cost?.high ?? 0,
        scenario.exit_value_low_eur ?? scenario.exit_value?.low ?? 0,
        scenario.exit_value_high_eur ?? scenario.exit_value?.high ?? 0,
        scenario.profit_low_eur ?? scenario.profit?.low ?? 0,
        scenario.profit_high_eur ?? scenario.profit?.high ?? 0,
        scenario.max_offer_low_eur ?? scenario.max_offer?.low ?? 0,
        scenario.max_offer_high_eur ?? scenario.max_offer?.high ?? 0,
      ]
    );
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const config = await loadDatabaseEnv();
  const catalogPath = path.resolve(ROOT, String(args.catalog));

  let conn;
  try {
    conn = await mysql.createConnection({
      ...config,
      multipleStatements: false,
    });
  } catch (err) {
    console.error('Could not connect to MySQL. Check database/.env settings.');
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }

  try {
    if (args.reset) {
      console.log('Resetting imported tables…');
      await resetImportedData(conn);
    }

    await seedBasics(conn);

    const catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8'));
    const dossiers = Object.values(catalog.dossiers ?? {}).sort(
      (a, b) => Number(b.score ?? 0) - Number(a.score ?? 0)
    );

    const [scanResult] = await conn.query(
      `INSERT INTO scan_runs (
        client_id, strategy_id, parcels_scanned, parcels_eliminated,
        opportunities_found, avg_match_score, filter_json, generated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        1,
        catalog.strategy_id ?? catalog.filter?.strategy ?? 'value_add',
        catalog.context?.scanned ?? dossiers.length,
        catalog.context?.eliminated ?? 0,
        dossiers.length,
        dossiers.length
          ? dossiers.reduce((sum, d) => sum + Number(d.score ?? 0), 0) / dossiers.length
          : null,
        JSON.stringify(catalog.filter ?? {}),
        catalog.generated_at ? new Date(String(catalog.generated_at)) : new Date(),
      ]
    );

    const scanRunId = scanResult.insertId;
    console.log(`Importing ${dossiers.length} dossiers from ${catalogPath}…`);

    let rank = 1;
    for (const dossier of dossiers) {
      await importDossier(conn, dossier, 1, scanRunId, rank);
      rank += 1;
    }

    if (args.evaluations) {
      const evalDir = path.join(ROOT, 'data', 'evaluations');
      const files = (await fs.readdir(evalDir)).filter((f) => f.endsWith('.json'));
      console.log(`Importing ${files.length} evaluations…`);
      for (const file of files) {
        const record = JSON.parse(await fs.readFile(path.join(evalDir, file), 'utf8'));
        await importEvaluation(conn, record);
      }
    }

    console.log('Seeding operational data (orders, selections, pipeline)…');
    const seedResult = await seedOperationalData(conn, 1);
    if (seedResult.skipped) console.log('  Operational data already present — skipped.');
    else console.log('  Operational demo data seeded.');

    const [[counts]] = await conn.query(`
      SELECT
        (SELECT COUNT(*) FROM properties) AS properties,
        (SELECT COUNT(*) FROM catalog_items) AS catalog_items,
        (SELECT COUNT(*) FROM dossiers) AS dossiers,
        (SELECT COUNT(*) FROM evaluations) AS evaluations,
        (SELECT COUNT(*) FROM scouting_orders) AS scouting_orders,
        (SELECT COUNT(*) FROM selections) AS selections,
        (SELECT COUNT(*) FROM pipeline_items) AS pipeline_items
    `);

    console.log('Import complete.');
    console.log(
      `  properties: ${counts.properties}, catalog_items: ${counts.catalog_items}, dossiers: ${counts.dossiers}, evaluations: ${counts.evaluations}`
    );
    console.log(
      `  scouting_orders: ${counts.scouting_orders}, selections: ${counts.selections}, pipeline_items: ${counts.pipeline_items}`
    );
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
