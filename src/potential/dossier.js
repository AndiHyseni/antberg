import {
  buildStrategyFitText,
  getStrategy,
} from './strategies.js';
import { estimateValues, formatEuro, formatEuroRange } from './valuation.js';

/**
 * @param {string} flurstueck
 */
export function objectIdFromFlurstueck(flurstueck) {
  const digits = String(flurstueck).replace(/\D/g, '');
  const tail = digits.slice(-6).padStart(6, '0');
  return `STG-${tail}`;
}

/**
 * @param {import('../filter/types.js').ScoredProperty} property
 */
export function inferAssetType(property) {
  const use = String(property.land_use ?? '').toLowerCase();
  if (use.includes('industrie') || use.includes('gewerbe')) return 'Industrial';
  if (use.includes('handel') || use.includes('dienstleistung')) return 'Commercial';
  if (use.includes('gemisch')) return 'Mixed-use';
  if (property.residential_building_count > 0) return 'Residential';
  return 'Mixed-use';
}

/**
 * @param {import('../filter/types.js').ScoredProperty} property
 */
export function districtLabel(property) {
  const parts = [property.municipality ?? 'Stuttgart'].filter(Boolean);
  if (property.nearest_street) {
    const street = String(property.nearest_street);
    parts.push(street.replace(/\d+.*/, '').trim() || 'district');
  }
  return parts.join(' · ');
}

/**
 * @param {import('../filter/types.js').ScoredProperty} property
 * @param {StrategyId} strategyId
 */
export function buildWeaknessUpsidePairs(property, strategyId) {
  /** @type {{ weakness: string, upside: string }[]} */
  const pairs = [];

  const util = property.utilization_pct;
  if (util != null && util <= 65) {
    pairs.push({
      weakness: `Only ${util}% of allowed building volume is used today.`,
      upside:
        strategyId === 'development'
          ? 'Unused GFZ supports a densification or extension project with defined exit on stabilized rent.'
          : 'Low utilization leaves room to add floors or GFA within existing zoning — direct NAV uplift.',
    });
  }

  const floorGap =
    (property.allowed_floors ?? 0) - (property.built_floors ?? 0);
  if (floorGap >= 1) {
    pairs.push({
      weakness: `Built ${property.built_floors} floor(s) where zoning allows ${property.allowed_floors}.`,
      upside:
        strategyId === 'fix_flip'
          ? 'Vertical extension or attic conversion can be packaged into a short hold renovation exit.'
          : 'Additional storeys convert zoning headroom into leasable area without land purchase.',
    });
  }

  if (property.heating_signal) {
    pairs.push({
      weakness: `${property.heating_signal} — capex and regulatory pressure ahead.`,
      upside:
        strategyId === 'buy_hold'
          ? 'Modern heating and insulation support rent increases and lower void risk over a long hold.'
          : 'Energy retrofit is financeable capex that closes the value gap to modern comparables.',
    });
  }

  if (property.renovation_status) {
    pairs.push({
      weakness: property.renovation_status,
      upside:
        strategyId === 'distressed'
          ? 'Seller discount for visible neglect — margin comes from disciplined capex and repricing.'
          : 'Renovation backlog is priced in; stabilized product commands institutional ticket sizes.',
    });
  }

  if (property.construction_year && property.construction_year < 1970) {
    pairs.push({
      weakness: `Building era ~${property.construction_year} — layout and building services likely dated.`,
      upside: 'Core-and-shell refresh unlocks contemporary layouts and higher €/m² on exit or rent roll.',
    });
  }

  if (pairs.length < 3 && property.parcel_m2 >= 1200) {
    pairs.push({
      weakness: `Plot ${property.parcel_m2.toLocaleString('de-DE')} m² — footprint may under-use the land.`,
      upside: 'Larger plot enables yard infill, secondary volume, or phased development within one title.',
    });
  }

  return pairs.slice(0, 5);
}

/**
 * @param {import('../filter/types.js').ScoredProperty} property
 */
export function buildRisks(property) {
  /** @type {{ label: string, severity: 'low'|'medium'|'high' }[]} */
  const risks = [];

  if (property.legal_restrictions) {
    risks.push({
      label: `Legal entries on title: ${property.legal_restrictions.slice(0, 120)}`,
      severity: 'medium',
    });
  }

  if (property.data_gaps.includes('renovation history')) {
    risks.push({
      label: 'Renovation history unverified — capex budget may shift after site visit.',
      severity: 'medium',
    });
  }

  if (property.data_gaps.includes('GFZ/GFA data')) {
    risks.push({
      label: 'Zoning capacity based on FNP proxy — Bebauungsplan may differ.',
      severity: 'high',
    });
  }

  if (property.infrastructure_count > 3) {
    risks.push({
      label: 'Multiple easements / infrastructure on parcel — check buildability.',
      severity: 'medium',
    });
  }

  if (!risks.length) {
    risks.push({
      label: 'Standard transaction and entitlement diligence still required.',
      severity: 'low',
    });
  }

  return risks.slice(0, 4);
}

/**
 * @param {import('../filter/types.js').ScoredProperty} property
 */
export function leadingSignal(property) {
  const scores = [
    ['Floor upside', property.floor_upside_score],
    ['Volume gap', property.utilization_gap_score],
    ['Renovation gap', property.renovation_neglect_score],
    ['Heating', property.heating_distress_score],
    ['Age profile', property.age_bonus_score],
  ];
  scores.sort((a, b) => b[1] - a[1]);
  const [label, value] = scores[0];
  if (!value) return 'Redevelopment potential';
  return `${label} signal (${value} pts)`;
}

/**
 * @param {import('../filter/types.js').ScoredProperty} property
 * @param {StrategyId} strategyId
 */
export function buildDossier(property, strategyId = 'value_add') {
  const values = estimateValues(property);
  const strategy = getStrategy(strategyId);
  const id = objectIdFromFlurstueck(property.flurstueckskennzeichen);

  return {
    object_id: id,
    flurstueckskennzeichen: property.flurstueckskennzeichen,
    strategy_id: strategyId,
    strategy_label: strategy.label,
    asset_type: inferAssetType(property),
    district: districtLabel(property),
    municipality: property.municipality,
    score: property.total_score,
    ticket_range: formatEuroRange(values.ticket_low, values.ticket_high),
    ticket_low: values.ticket_low,
    ticket_high: values.ticket_high,
    leading_signal: leadingSignal(property),
    parcel_m2: property.parcel_m2,
    land_use: property.land_use,
    built_gfa: property.built_gfa,
    allowed_gfa: property.allowed_gfa,
    centroid_x: property.centroid_x,
    centroid_y: property.centroid_y,
    address_hidden: true,
    address_full: property.address,
    strategy_fit: buildStrategyFitText(property, strategyId),
    weakness_upside: buildWeaknessUpsidePairs(property, strategyId),
    values: {
      today: values.value_today,
      today_label: formatEuro(values.value_today),
      after: values.value_after,
      after_label: formatEuro(values.value_after),
      upside_range: formatEuroRange(values.upside_low, values.upside_high),
      upside_low: values.upside_low,
      upside_high: values.upside_high,
    },
    risks: buildRisks(property),
    score_breakdown: {
      floor_upside: property.floor_upside_score,
      utilization_gap: property.utilization_gap_score,
      renovation_neglect: property.renovation_neglect_score,
      heating_distress: property.heating_distress_score,
      age_bonus: property.age_bonus_score,
      parcel_bonus: property.parcel_bonus_score,
    },
    data_gaps: property.data_gaps,
  };
}
