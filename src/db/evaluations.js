import { DEFAULT_CLIENT_ID, query } from './pool.js';

/**
 * @param {number} [clientId]
 */
export async function listEvaluationsFromDb(clientId = DEFAULT_CLIENT_ID) {
  const [rows] = await query(
    `SELECT e.eval_code AS eval_id, p.object_id, e.status, e.recommendation,
            e.report_json, e.safe_offer_low_eur, e.safe_offer_high_eur
     FROM evaluations e
     JOIN properties p ON p.id = e.property_id
     LEFT JOIN mandates m ON m.id = e.mandate_id
     WHERE m.client_id = ? OR e.mandate_id IS NULL
     ORDER BY e.updated_at DESC`,
    [clientId]
  );

  return rows.map((row) => {
    let report = null;
    try {
      report = row.report_json ? JSON.parse(String(row.report_json)) : null;
    } catch {
      report = null;
    }

    const bankLow =
      report?.bank_value?.low ??
      (row.safe_offer_low_eur != null ? Number(row.safe_offer_low_eur) : null);

    return {
      eval_id: row.eval_id,
      object_id: row.object_id,
      status: row.status,
      report: report
        ? {
            bank_value: { low: bankLow },
            recommendation: report.recommendation ?? row.recommendation,
          }
        : bankLow
          ? { bank_value: { low: bankLow }, recommendation: row.recommendation }
          : undefined,
    };
  });
}

/**
 * @param {string} objectId
 * @param {number} [clientId]
 */
export async function getEvaluationForObject(objectId, clientId = DEFAULT_CLIENT_ID) {
  const [[row]] = await query(
    `SELECT e.*, p.object_id
     FROM evaluations e
     JOIN properties p ON p.id = e.property_id
     LEFT JOIN mandates m ON m.id = e.mandate_id
     WHERE p.object_id = ? AND (m.client_id = ? OR e.mandate_id IS NULL)
     ORDER BY e.updated_at DESC
     LIMIT 1`,
    [objectId, clientId]
  );
  if (!row) return null;

  const parse = (field) => {
    try {
      return row[field] ? JSON.parse(String(row[field])) : null;
    } catch {
      return null;
    }
  };

  return {
    eval_id: row.eval_code,
    object_id: row.object_id,
    status: row.status,
    recommendation: row.recommendation,
    report: parse('report_json'),
    intake: parse('intake_json'),
    income: parse('income_json'),
    verification: parse('verification_json'),
  };
}

/**
 * @param {number} [clientId]
 */
export async function listMandateSummary(clientId = DEFAULT_CLIENT_ID) {
  const [rows] = await query(
    `SELECT p.object_id, p.district_label AS district, ps.total_score AS score,
            d.strategy_label AS thesis, ci.ticket_low_eur, ci.ticket_high_eur,
            s.status AS selection_status
     FROM selections s
     JOIN properties p ON p.id = s.property_id
     LEFT JOIN property_scores ps ON ps.property_id = p.id
     LEFT JOIN catalog_items ci ON ci.property_id = p.id
     LEFT JOIN dossiers d ON d.catalog_item_id = ci.id
     WHERE s.client_id = ? AND s.status = 'selected'
     ORDER BY s.selected_at DESC`,
    [clientId]
  );
  return rows;
}
