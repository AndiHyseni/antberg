import { DEFAULT_CLIENT_ID, query } from './pool.js';

/**
 * @param {number | null | undefined} low
 * @param {number | null | undefined} high
 */
function formatTicketRange(low, high) {
  const fmt = (n) =>
    new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(Math.round(Number(n)));
  if (low == null && high == null) return '—';
  const a = low ?? high ?? 0;
  const b = high ?? low ?? 0;
  return `${fmt(a)} € – ${fmt(b)} €`;
}

/**
 * @param {number | null | undefined} value
 * @param {string} [suffix]
 */
function formatValueLabel(value, suffix = '€') {
  if (value == null) return '—';
  const n = Number(value);
  if (n >= 1_000_000) return `${suffix}${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${suffix}${Math.round(n / 1000)}K`;
  return `${suffix}${Math.round(n)}`;
}

/**
 * @param {Record<string, unknown>} row
 * @param {{ weakness: string, upside: string }[]} insights
 * @param {{ label: string, severity: string }[]} risks
 */
function rowToDossier(row, insights, risks) {
  const today = row.value_today_eur != null ? Number(row.value_today_eur) : 0;
  const after = row.value_after_eur != null ? Number(row.value_after_eur) : 0;
  const upsideLow = row.upside_low_eur != null ? Number(row.upside_low_eur) : 0;
  const upsideHigh = row.upside_high_eur != null ? Number(row.upside_high_eur) : 0;
  let dataGaps = [];
  try {
    dataGaps = row.data_gaps_json ? JSON.parse(String(row.data_gaps_json)) : [];
  } catch {
    dataGaps = [];
  }

  const pctLow = today ? Math.round((upsideLow / today) * 100) : 0;
  const pctHigh = today ? Math.round((upsideHigh / today) * 100) : 0;

  return {
    object_id: row.object_id,
    flurstueckskennzeichen: row.flurstueckskennzeichen,
    strategy_id: row.strategy_id,
    strategy_label: row.strategy_label,
    asset_type: row.asset_type,
    district: row.district_label ?? row.municipality ?? '—',
    municipality: row.municipality,
    score: Number(row.match_score),
    ticket_range: formatTicketRange(row.ticket_low_eur, row.ticket_high_eur),
    ticket_low: Number(row.ticket_low_eur ?? 0),
    ticket_high: Number(row.ticket_high_eur ?? 0),
    leading_signal: row.leading_signal ?? '',
    parcel_m2: Number(row.parcel_m2 ?? 0),
    land_use: row.land_use,
    strategy_fit: row.strategy_fit_text ?? '',
    weakness_upside: insights,
    values: {
      today,
      today_label: formatValueLabel(today),
      after,
      after_label: formatValueLabel(after),
      upside_range: today ? `+${pctLow}–${pctHigh}%` : '—',
      upside_low: upsideLow,
      upside_high: upsideHigh,
    },
    risks,
    data_gaps: dataGaps,
    built_gfa: row.built_gfa_m2 != null ? Number(row.built_gfa_m2) : null,
    allowed_gfa: row.allowed_gfa_m2 != null ? Number(row.allowed_gfa_m2) : null,
  };
}

/**
 * @param {number} [clientId]
 */
export async function fetchCatalogFromDb(clientId = DEFAULT_CLIENT_ID) {
  const [[scan]] = await query(
    `SELECT id, strategy_id, parcels_scanned, parcels_eliminated, opportunities_found,
            avg_match_score, filter_json, generated_at
     FROM scan_runs
     WHERE client_id = ?
     ORDER BY generated_at DESC
     LIMIT 1`,
    [clientId]
  );

  if (!scan) return null;

  const [rows] = await query(
    `SELECT
       p.object_id, p.flurstueckskennzeichen, p.municipality, p.district_label,
       p.parcel_m2, p.land_use, p.asset_type, p.centroid_x, p.centroid_y,
       ps.total_score AS match_score, ps.leading_signal, ps.data_gaps_json,
       pgo.built_gfa_m2, pgo.allowed_gfa_m2,
       ci.ticket_low_eur, ci.ticket_high_eur, ci.rank_position, ci.is_high_priority,
       d.id AS dossier_id, d.strategy_id, d.strategy_label, d.strategy_fit_text,
       d.value_today_eur, d.value_after_eur, d.upside_low_eur, d.upside_high_eur
     FROM catalog_items ci
     JOIN properties p ON p.id = ci.property_id
     JOIN property_scores ps ON ps.property_id = p.id
     LEFT JOIN property_geo_overlay pgo ON pgo.property_id = p.id
     JOIN dossiers d ON d.catalog_item_id = ci.id
     WHERE ci.scan_run_id = ?
     ORDER BY ci.rank_position ASC`,
    [scan.id]
  );

  if (!rows.length) return null;

  const dossierIds = rows.map((r) => r.dossier_id);
  const placeholders = dossierIds.map(() => '?').join(',');

  const [insightRows] = await query(
    `SELECT dossier_id, weakness, upside, sort_order
     FROM dossier_insights
     WHERE dossier_id IN (${placeholders})
     ORDER BY sort_order`,
    dossierIds
  );

  const [riskRows] = await query(
    `SELECT dossier_id, label, severity
     FROM dossier_risks
     WHERE dossier_id IN (${placeholders})`,
    dossierIds
  );

  /** @type {Record<number, { weakness: string, upside: string }[]>} */
  const insightsByDossier = {};
  for (const row of insightRows) {
    if (!insightsByDossier[row.dossier_id]) insightsByDossier[row.dossier_id] = [];
    insightsByDossier[row.dossier_id].push({ weakness: row.weakness, upside: row.upside });
  }

  /** @type {Record<number, { label: string, severity: string }[]>} */
  const risksByDossier = {};
  for (const row of riskRows) {
    if (!risksByDossier[row.dossier_id]) risksByDossier[row.dossier_id] = [];
    risksByDossier[row.dossier_id].push({ label: row.label, severity: row.severity });
  }

  let filter = {};
  try {
    filter = scan.filter_json ? JSON.parse(String(scan.filter_json)) : {};
  } catch {
    filter = {};
  }

  const cards = rows.map((row) => ({
    object_id: row.object_id,
    district: row.district_label ?? row.municipality ?? '—',
    asset_type: row.asset_type ?? '—',
    score: Number(row.match_score),
    ticket_range: formatTicketRange(row.ticket_low_eur, row.ticket_high_eur),
    leading_signal: row.leading_signal ?? '',
    centroid_x: row.centroid_x != null ? Number(row.centroid_x) : undefined,
    centroid_y: row.centroid_y != null ? Number(row.centroid_y) : undefined,
  }));

  /** @type {Record<string, ReturnType<typeof rowToDossier>>} */
  const dossiers = {};
  for (const row of rows) {
    dossiers[row.object_id] = rowToDossier(
      row,
      insightsByDossier[row.dossier_id] ?? [],
      risksByDossier[row.dossier_id] ?? []
    );
  }

  const scanned = Number(scan.parcels_scanned ?? rows.length);
  const eliminated = Number(scan.parcels_eliminated ?? 0);
  const found = Number(scan.opportunities_found ?? rows.length);

  return {
    generated_at: scan.generated_at?.toISOString?.() ?? new Date().toISOString(),
    strategy_id: scan.strategy_id,
    context: {
      opportunities_found: found,
      scanned,
      eliminated,
      context_line: `${found} opportunities found in ${scanned.toLocaleString('de-DE')} scanned objects · ranked by score.`,
    },
    filter,
    cards,
    dossiers,
  };
}
