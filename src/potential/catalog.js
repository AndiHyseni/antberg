import { strategyFitScore } from './strategies.js';
import { buildDossier } from './dossier.js';

/**
 * @typedef {import('./strategies.js').StrategyId} StrategyId
 * @typedef {{
 *   strategy: StrategyId,
 *   ticketMin?: number,
 *   ticketMax?: number,
 *   assetTypes?: string[],
 *   excludeAssetTypes?: string[],
 *   excludeMonuments?: boolean,
 *   excludeSingleFamily?: boolean,
 *   city?: string,
 *   limit?: number,
 * }} CatalogFilter
 */

/**
 * @param {import('../filter/types.js').ScoredProperty} property
 * @param {CatalogFilter} filter
 */
function passesCatalogFilter(property, filter) {
  const values = property.built_gfa ?? property.parcel_m2 * 0.35;
  const ticketLow = Math.round(values * 2200 * 0.85);
  const ticketHigh = Math.round(values * 3200 * 1.15);

  if (filter.ticketMin != null && ticketHigh < filter.ticketMin) return false;
  if (filter.ticketMax != null && ticketLow > filter.ticketMax) return false;

  const assetType = inferAssetTypeSimple(property);
  if (filter.assetTypes?.length && !filter.assetTypes.includes(assetType)) {
    return false;
  }
  if (filter.excludeAssetTypes?.includes(assetType)) return false;

  if (filter.excludeMonuments && property.legal_restrictions) {
    if (/denkmal|schutz/i.test(property.legal_restrictions)) return false;
  }

  if (filter.excludeSingleFamily) {
    if (property.residential_building_count === 1 && property.building_count === 1) {
      return false;
    }
  }

  if (filter.city) {
    const city = filter.city.toLowerCase();
    const muni = String(property.municipality ?? '').toLowerCase();
    if (!muni.includes(city)) return false;
  }

  return true;
}

/**
 * @param {import('../filter/types.js').ScoredProperty} property
 */
function inferAssetTypeSimple(property) {
  const use = String(property.land_use ?? '').toLowerCase();
  if (use.includes('industrie') || use.includes('gewerbe')) return 'Industrial';
  if (use.includes('handel')) return 'Commercial';
  if (use.includes('gemisch')) return 'Mixed-use';
  if (property.residential_building_count > 0) return 'Residential';
  return 'Mixed-use';
}

/**
 * @param {import('../filter/types.js').ScoredProperty[]} candidates
 * @param {CatalogFilter} filter
 * @param {{ scanned?: number, eliminated?: number }} meta
 */
export function buildCatalog(candidates, filter, meta = {}) {
  const strategy = filter.strategy ?? 'value_add';
  const limit = filter.limit ?? 100;

  const filtered = candidates
    .filter((p) => passesCatalogFilter(p, filter))
    .map((p) => ({
      property: p,
      fitScore: strategyFitScore(p, strategy),
    }))
    .sort((a, b) => b.fitScore - a.fitScore || b.property.total_score - a.property.total_score);

  const top = filtered.slice(0, limit);
  const dossiers = top.map(({ property }) => buildDossier(property, strategy));

  const cards = dossiers.map((d) => ({
    object_id: d.object_id,
    district: d.district,
    asset_type: d.asset_type,
    score: d.score,
    ticket_range: d.ticket_range,
    leading_signal: d.leading_signal,
    centroid_x: d.centroid_x,
    centroid_y: d.centroid_y,
  }));

  return {
    generated_at: new Date().toISOString(),
    strategy_id: strategy,
    context: {
      opportunities_found: top.length,
      scanned: meta.scanned ?? candidates.length,
      eliminated: meta.eliminated ?? 0,
      context_line: `${top.length} opportunities found in ${(meta.scanned ?? candidates.length).toLocaleString('de-DE')} scanned objects · ranked by score.`,
    },
    filter,
    cards,
    dossiers: Object.fromEntries(dossiers.map((d) => [d.object_id, d])),
  };
}

/**
 * @param {Record<string, unknown>} row
 * @returns {import('../filter/types.js').ScoredProperty}
 */
export function scoredPropertyFromRow(row) {
  return {
    flurstueckskennzeichen: String(row.flurstueckskennzeichen ?? ''),
    address: row.address == null ? null : String(row.address),
    nearest_street: row.nearest_street == null ? null : String(row.nearest_street),
    municipality: row.municipality == null ? null : String(row.municipality),
    parcel_m2: Number(row.parcel_m2) || 0,
    land_use: row.land_use == null ? null : String(row.land_use),
    legal_restrictions:
      row.legal_restrictions == null ? null : String(row.legal_restrictions),
    land_valuation_class:
      row.land_valuation_class == null ? null : String(row.land_valuation_class),
    soil_bodenzahl: row.soil_bodenzahl == null ? null : Number(row.soil_bodenzahl),
    soil_ackerzahl: row.soil_ackerzahl == null ? null : Number(row.soil_ackerzahl),
    soil_nutzungsart:
      row.soil_nutzungsart == null ? null : String(row.soil_nutzungsart),
    built_floors: row.built_floors == null ? null : Number(row.built_floors),
    allowed_floors: row.allowed_floors == null ? null : Number(row.allowed_floors),
    built_gfa: row.built_gfa == null ? null : Number(row.built_gfa),
    allowed_gfa: row.allowed_gfa == null ? null : Number(row.allowed_gfa),
    utilization_pct: row.utilization_pct == null ? null : Number(row.utilization_pct),
    construction_year:
      row.construction_year == null ? null : Number(row.construction_year),
    renovation_status:
      row.renovation_status == null ? null : String(row.renovation_status),
    heating_signal: row.heating_signal == null ? null : String(row.heating_signal),
    floor_upside_score: Number(row.floor_upside_score) || 0,
    utilization_gap_score: Number(row.utilization_gap_score) || 0,
    renovation_neglect_score: Number(row.renovation_neglect_score) || 0,
    heating_distress_score: Number(row.heating_distress_score) || 0,
    age_bonus_score: Number(row.age_bonus_score) || 0,
    parcel_bonus_score: Number(row.parcel_bonus_score) || 0,
    total_score: Number(row.total_score) || 0,
    score_reason: String(row.score_reason ?? ''),
    data_gaps: String(row.data_gaps ?? '')
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean),
    building_count: Number(row.building_count) || 0,
    residential_building_count: Number(row.residential_building_count) || 0,
    infrastructure_count: Number(row.infrastructure_count) || 0,
    centroid_x: Number(row.centroid_x) || 0,
    centroid_y: Number(row.centroid_y) || 0,
  };
}
