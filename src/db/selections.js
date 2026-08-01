import { DEFAULT_CLIENT_ID, query } from './pool.js';

/**
 * @param {number} [clientId]
 */
export async function listSelections(clientId = DEFAULT_CLIENT_ID) {
  const [rows] = await query(
    `SELECT p.object_id, s.status, s.selected_at
     FROM selections s
     JOIN properties p ON p.id = s.property_id
     WHERE s.client_id = ? AND s.status = 'selected'
     ORDER BY s.selected_at DESC`,
    [clientId]
  );
  return rows;
}

/**
 * @param {string} objectId
 * @param {number} [clientId]
 */
export async function toggleSelection(objectId, clientId = DEFAULT_CLIENT_ID) {
  const [[prop]] = await query('SELECT id FROM properties WHERE object_id = ? LIMIT 1', [
    objectId,
  ]);
  if (!prop) throw new Error(`Property not found: ${objectId}`);

  const [[existing]] = await query(
    `SELECT id, status FROM selections
     WHERE client_id = ? AND property_id = ? LIMIT 1`,
    [clientId, prop.id]
  );

  if (existing?.status === 'selected') {
    await query('DELETE FROM selections WHERE id = ?', [existing.id]);
    await query(
      `INSERT INTO activity_log (client_id, entity_type, entity_id, action, detail_json)
       VALUES (?, 'property', ?, 'selection_removed', ?)`,
      [clientId, prop.id, JSON.stringify({ object_id: objectId })]
    );
    return { selected: false, object_id: objectId };
  }

  if (existing) {
    await query(`UPDATE selections SET status = 'selected', selected_at = NOW() WHERE id = ?`, [
      existing.id,
    ]);
  } else {
    await query(
      `INSERT INTO selections (client_id, property_id, status) VALUES (?, ?, 'selected')`,
      [clientId, prop.id]
    );
  }

  await query(
    `INSERT INTO activity_log (client_id, entity_type, entity_id, action, detail_json)
     VALUES (?, 'property', ?, 'selection_added', ?)`,
    [clientId, prop.id, JSON.stringify({ object_id: objectId })]
  );

  return { selected: true, object_id: objectId };
}

/**
 * @param {number} [clientId]
 */
export async function clearSelections(clientId = DEFAULT_CLIENT_ID) {
  await query(`DELETE FROM selections WHERE client_id = ? AND status = 'selected'`, [clientId]);
  return { ok: true };
}

/**
 * @param {string} objectId
 * @param {'selected'|'saved'|'rejected'} status
 * @param {number} [clientId]
 */
export async function setSelectionStatus(objectId, status, clientId = DEFAULT_CLIENT_ID) {
  const [[prop]] = await query('SELECT id FROM properties WHERE object_id = ? LIMIT 1', [
    objectId,
  ]);
  if (!prop) throw new Error(`Property not found: ${objectId}`);

  await query(
    `INSERT INTO selections (client_id, property_id, status)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE status = VALUES(status), selected_at = NOW()`,
    [clientId, prop.id, status]
  );
  return { ok: true, object_id: objectId, status };
}

/**
 * @param {number} [clientId]
 */
export async function listSaved(clientId = DEFAULT_CLIENT_ID) {
  const [rows] = await query(
    `SELECT p.object_id, p.district_label AS district, p.asset_type,
            ps.total_score AS score, ci.ticket_low_eur, ci.ticket_high_eur,
            d.strategy_label, s.selected_at
     FROM selections s
     JOIN properties p ON p.id = s.property_id
     LEFT JOIN property_scores ps ON ps.property_id = p.id
     LEFT JOIN catalog_items ci ON ci.property_id = p.id
     LEFT JOIN dossiers d ON d.catalog_item_id = ci.id
     WHERE s.client_id = ? AND s.status = 'saved'
     ORDER BY s.selected_at DESC`,
    [clientId]
  );
  return rows;
}
