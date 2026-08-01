import { query } from './pool.js';

/**
 * Seed scouting orders, selections, pipeline, and activity after catalog import.
 * @param {import('mysql2/promise').PoolConnection | import('mysql2/promise').Pool} conn
 * @param {number} clientId
 */
export async function seedOperationalData(conn, clientId = 1) {
  const [[{ orderCount }]] = await conn.query(
    'SELECT COUNT(*) AS orderCount FROM scouting_orders WHERE client_id = ?',
    [clientId]
  );
  if (Number(orderCount) > 0) return { skipped: true };

  const [[scan]] = await conn.query(
    'SELECT id FROM scan_runs WHERE client_id = ? ORDER BY generated_at DESC LIMIT 1',
    [clientId]
  );
  const scanRunId = scan?.id;

  const [topProps] = await conn.query(
    `SELECT p.id, p.object_id, ci.id AS catalog_item_id
     FROM catalog_items ci
     JOIN properties p ON p.id = ci.property_id
     WHERE ci.scan_run_id = ?
     ORDER BY ci.rank_position ASC
     LIMIT 8`,
    [scanRunId]
  );

  // Active orders
  const [active1] = await conn.query(
    `INSERT INTO scouting_orders (
      client_id, status, strategy_id, strategy_label, country, state, city, radius_km,
      ticket_min_eur, ticket_max_eur, estimated_scan_scope, submitted_at
    ) VALUES (?, 'active', 'value_add', 'Value Add', 'Germany', 'Baden-Württemberg', 'Stuttgart', 40, 2000000, 10000000, 24200, DATE_SUB(NOW(), INTERVAL 12 DAY))`,
    [clientId]
  );
  const activeOrder1Id = active1.insertId;
  await conn.query(
    `INSERT INTO scouting_order_assets (scouting_order_id, asset_type) VALUES (?, 'Mixed-Use'), (?, 'Residential')`,
    [activeOrder1Id, activeOrder1Id]
  );
  await conn.query(
    `INSERT INTO scouting_order_signals (scouting_order_id, signal_name) VALUES
     (?, 'Energy pressure'), (?, 'Zoning upside'), (?, 'Low rent vs market')`,
    [activeOrder1Id, activeOrder1Id, activeOrder1Id]
  );
  if (scanRunId) {
    await conn.query('UPDATE scan_runs SET scouting_order_id = ? WHERE id = ?', [
      activeOrder1Id,
      scanRunId,
    ]);
  }

  const [active2] = await conn.query(
    `INSERT INTO scouting_orders (
      client_id, status, strategy_id, strategy_label, country, state, city, radius_km,
      ticket_min_eur, ticket_max_eur, estimated_scan_scope, submitted_at
    ) VALUES (?, 'scanning', 'distressed', 'Distressed', 'Germany', 'Baden-Württemberg', 'BW', 60, 1000000, 5000000, 18400, DATE_SUB(NOW(), INTERVAL 3 DAY))`,
    [clientId]
  );
  const activeOrder2Id = active2.insertId;
  await conn.query(`INSERT INTO scouting_order_assets (scouting_order_id, asset_type) VALUES (?, 'Residential')`, [
    activeOrder2Id,
  ]);

  // Draft
  await conn.query(
    `INSERT INTO scouting_orders (
      client_id, status, strategy_id, strategy_label, country, state, city, radius_km,
      ticket_min_eur, ticket_max_eur, estimated_scan_scope
    ) VALUES (?, 'draft', 'core', 'Core', 'Germany', 'Baden-Württemberg', 'Heilbronn', 25, 3000000, 8000000, 12100)`,
    [clientId]
  );

  // Completed — with linked scan runs for match counts
  for (const [name, thesis, city, matches, daysAgo] of [
    ['Stuttgart Q1 Value-Add', 'value_add', 'Stuttgart', 24, 18],
    ['Karlsruhe Mixed-Use Scan', 'repositioning', 'Karlsruhe', 11, 25],
    ['Esslingen Residential', 'core', 'Esslingen', 7, 38],
  ]) {
    const [completedResult] = await conn.query(
      `INSERT INTO scouting_orders (
        client_id, status, strategy_id, strategy_label, country, city, radius_km,
        submitted_at, completed_at
      ) VALUES (?, 'completed', ?, ?, 'Germany', ?, 30, DATE_SUB(NOW(), INTERVAL ? DAY), DATE_SUB(NOW(), INTERVAL ? DAY))`,
      [clientId, thesis, thesis.replace('_', ' '), city, daysAgo + 5, daysAgo]
    );
    await conn.query(
      `INSERT INTO scan_runs (
        client_id, scouting_order_id, strategy_id, parcels_scanned, parcels_eliminated,
        opportunities_found, generated_at
      ) VALUES (?, ?, ?, 12000, 11500, ?, DATE_SUB(NOW(), INTERVAL ? DAY))`,
      [clientId, completedResult.insertId, thesis, matches, daysAgo]
    );
  }

  // Selections — top 4 selected, 5th saved
  for (let i = 0; i < topProps.length; i += 1) {
    const prop = topProps[i];
    const status = i < 4 ? 'selected' : i === 4 ? 'saved' : null;
    if (!status) break;
    await conn.query(
      `INSERT INTO selections (client_id, property_id, catalog_item_id, status)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status)`,
      [clientId, prop.id, prop.catalog_item_id, status]
    );
  }

  // Mandate draft
  const [mandateResult] = await conn.query(
    `INSERT INTO mandates (client_id, reference_code, status, total_ticket_low_eur, total_ticket_high_eur)
     VALUES (?, 'MND-2026-001', 'draft', 14000000, 18600000)
     ON DUPLICATE KEY UPDATE status = VALUES(status)`,
    [clientId]
  );
  let mandateId = mandateResult.insertId;
  if (!mandateId) {
    const [[m]] = await conn.query(
      "SELECT id FROM mandates WHERE reference_code = 'MND-2026-001' LIMIT 1"
    );
    mandateId = m?.id;
  }

  for (let i = 0; i < Math.min(4, topProps.length); i += 1) {
    await conn.query(
      `INSERT IGNORE INTO mandate_items (mandate_id, property_id, sort_order) VALUES (?, ?, ?)`,
      [mandateId, topProps[i].id, i]
    );
  }

  await conn.query(
    `INSERT INTO mandate_contracts (mandate_id, version_no, body_html, change_notes)
     VALUES (?, 1, '<p>Buy-side mandate draft</p>', 'Initial draft')`,
    [mandateId]
  );

  // Pipeline items for first 3 selected
  const pipelineConfig = [
    { stage: 'owner_contact', pct: 55, next: 'Awaiting owner reply', blocker: 'Grundbuch extract', agent: 'M. K.' },
    { stage: 'evaluation', pct: 45, next: 'Bank valuation package in preparation', blocker: 'Energy certificate', agent: 'L. R.' },
    { stage: 'offer', pct: 70, next: 'Client approval required', blocker: 'None', agent: 'M. K.' },
  ];
  for (let i = 0; i < Math.min(3, topProps.length); i += 1) {
    const cfg = pipelineConfig[i];
    await conn.query(
      `INSERT INTO pipeline_items (mandate_id, property_id, stage, progress_pct, next_line, blocker_label, assigned_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE stage = VALUES(stage), progress_pct = VALUES(progress_pct)`,
      [mandateId, topProps[i].id, cfg.stage, cfg.pct, cfg.next, cfg.blocker, cfg.agent]
    );
  }

  // Activity / notifications
  const activities = [
    {
      action: 'mandate_countersigned',
      detail: { object_id: topProps[2]?.object_id ?? 'STG-000058' },
      hoursAgo: 2,
    },
    {
      action: 'evaluation_received',
      detail: { object_id: topProps[1]?.object_id ?? 'STG-000017' },
      hoursAgo: 4,
    },
    { action: 'scouting_delivered', detail: { count: 4, order_id: activeOrder1Id }, hoursAgo: 28 },
    { action: 'document_missing', detail: { object_id: topProps[0]?.object_id ?? 'STG-000041' }, hoursAgo: 36 },
    { action: 'owner_replied', detail: { object_id: topProps[0]?.object_id ?? 'STG-000041' }, hoursAgo: 120 },
  ];

  for (const act of activities) {
    await conn.query(
      `INSERT INTO activity_log (client_id, entity_type, action, detail_json, created_at)
       VALUES (?, 'platform', ?, ?, DATE_SUB(NOW(), INTERVAL ? HOUR))`,
      [clientId, act.action, JSON.stringify(act.detail), act.hoursAgo]
    );
  }

  // Seed evaluation documents for existing evaluations
  const [evaluations] = await conn.query(
    `SELECT e.id, p.object_id FROM evaluations e JOIN properties p ON p.id = e.property_id LIMIT 5`
  );
  for (const ev of evaluations) {
    await conn.query(
      `INSERT INTO evaluation_documents (evaluation_id, doc_type, label, filename, status, uploaded_at)
       VALUES (?, 'grundbuch', 'Grundbuch extract', ?, 'pending', NULL)
       ON DUPLICATE KEY UPDATE status = VALUES(status)`,
      [ev.id, `${ev.object_id}-grundbuch.pdf`]
    );
  }

  return { seeded: true, mandateId, activeOrder1Id };
}
