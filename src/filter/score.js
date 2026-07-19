import { SCORE_WEIGHTS } from './config.js';

/**
 * @param {number|null|undefined} allowed
 * @param {number|null|undefined} built
 */
export function scoreFloorUpside(allowed, built) {
  if (allowed == null || built == null) return 0;
  const gap = allowed - built;
  if (gap >= 3) return SCORE_WEIGHTS.floorUpside.gte3;
  if (gap === 2) return SCORE_WEIGHTS.floorUpside.eq2;
  if (gap === 1) return SCORE_WEIGHTS.floorUpside.eq1;
  return 0;
}

/**
 * @param {number|null|undefined} allowedGfa
 * @param {number|null|undefined} builtGfa
 */
export function scoreUtilizationGap(allowedGfa, builtGfa) {
  if (allowedGfa == null || builtGfa == null || allowedGfa <= 0) return 0;
  const ratio = builtGfa / allowedGfa;
  if (ratio <= 0.4) return SCORE_WEIGHTS.utilizationGap.lte40;
  if (ratio <= 0.55) return SCORE_WEIGHTS.utilizationGap.lte55;
  if (ratio <= 0.65) return SCORE_WEIGHTS.utilizationGap.lte65;
  return 0;
}

/**
 * @param {number|null|undefined} lastRenovationYear
 * @param {number} currentYear
 */
export function scoreRenovationNeglect(lastRenovationYear, currentYear) {
  if (lastRenovationYear == null) return 0;
  const years = currentYear - lastRenovationYear;
  if (years >= 30) return SCORE_WEIGHTS.renovationNeglect.gte30;
  if (years >= 20) return SCORE_WEIGHTS.renovationNeglect.gte20;
  return 0;
}

/**
 * @param {string|null|undefined} heatingSignal
 */
export function scoreHeatingDistress(heatingSignal) {
  if (!heatingSignal) return 0;
  const value = String(heatingSignal).toLowerCase();
  if (value.includes('oil')) return SCORE_WEIGHTS.heatingDistress.oil;
  if (value.includes('gas')) return SCORE_WEIGHTS.heatingDistress.oldGas;
  if (value.includes('modern') || value.includes('heat pump') || value.includes('fern')) {
    return 0;
  }
  return 0;
}

/**
 * @param {number|null|undefined} constructionYear
 * @param {number} currentYear
 */
export function scoreAgeBonus(constructionYear, currentYear) {
  if (constructionYear == null) return 0;
  const age = currentYear - constructionYear;
  if (age >= 60 && age <= 70) return SCORE_WEIGHTS.ageBonus.gte60;
  if (age >= 50 && age < 60) return SCORE_WEIGHTS.ageBonus.gte50;
  if (age >= 40 && age < 50) return SCORE_WEIGHTS.ageBonus.gte40;
  return 0;
}

/**
 * @param {number} parcelM2
 */
export function scoreParcelBonus(parcelM2) {
  if (parcelM2 >= 1500) return SCORE_WEIGHTS.parcelBonus.gte1500;
  if (parcelM2 >= 1000) return SCORE_WEIGHTS.parcelBonus.gte1000;
  if (parcelM2 >= 800) return SCORE_WEIGHTS.parcelBonus.gte800;
  return 0;
}

/**
 * @param {{
 *   parcel_m2: number,
 *   allowed_floors?: number|null,
 *   built_floors?: number|null,
 *   allowed_gfa?: number|null,
 *   built_gfa?: number|null,
 *   construction_year?: number|null,
 *   last_renovation_year?: number|null,
 *   heating_signal?: string|null,
 * }} input
 * @param {number} currentYear
 */
export function scoreProperty(input, currentYear) {
  const floorUpside = scoreFloorUpside(input.allowed_floors, input.built_floors);
  const utilizationGap = scoreUtilizationGap(input.allowed_gfa, input.built_gfa);
  const renovationNeglect = scoreRenovationNeglect(
    input.last_renovation_year,
    currentYear
  );
  const heatingDistress = scoreHeatingDistress(input.heating_signal);
  const ageBonus = scoreAgeBonus(input.construction_year, currentYear);
  const parcelBonus = scoreParcelBonus(input.parcel_m2);

  return {
    floor_upside_score: floorUpside,
    utilization_gap_score: utilizationGap,
    renovation_neglect_score: renovationNeglect,
    heating_distress_score: heatingDistress,
    age_bonus_score: ageBonus,
    parcel_bonus_score: parcelBonus,
    total_score:
      floorUpside +
      utilizationGap +
      renovationNeglect +
      heatingDistress +
      ageBonus +
      parcelBonus,
  };
}

/**
 * @param {import('./types.js').ScoredProperty} property
 */
export function buildScoreReason(property) {
  const parts = [];

  parts.push(`Parcel ${Math.round(property.parcel_m2)} m²`);

  if (property.land_use) {
    parts.push(`land use: ${property.land_use}`);
  }

  if (property.built_floors != null && property.allowed_floors != null) {
    parts.push(
      `built ${property.built_floors} floors but zoning allows ${property.allowed_floors}`
    );
  }

  if (property.utilization_pct != null) {
    parts.push(`only ${property.utilization_pct}% of allowed volume used`);
  }

  if (property.renovation_status) {
    parts.push(property.renovation_status);
  }

  if (property.heating_signal) {
    parts.push(property.heating_signal);
  }

  if (property.data_gaps.length) {
    parts.push(`missing: ${property.data_gaps.join(', ')}`);
  }

  return parts.join('; ') + '.';
}

/**
 * @param {number|null|undefined} allowedGfa
 * @param {number|null|undefined} builtGfa
 */
export function utilizationPct(allowedGfa, builtGfa) {
  if (allowedGfa == null || builtGfa == null || allowedGfa <= 0) return null;
  return Math.round((builtGfa / allowedGfa) * 100);
}

/**
 * @param {number|null|undefined} lastRenovationYear
 * @param {number} currentYear
 */
export function renovationStatus(lastRenovationYear, currentYear) {
  if (lastRenovationYear == null) return null;
  const years = currentYear - lastRenovationYear;
  if (years >= 30) return `no renovation since ${lastRenovationYear}`;
  if (years >= 20) return `last renovation around ${lastRenovationYear}`;
  return `renovated within last ${years} years`;
}

/**
 * @param {string|null|undefined} heatingSignal
 */
export function heatingLabel(heatingSignal) {
  if (!heatingSignal) return null;
  const value = String(heatingSignal).toLowerCase();
  if (value.includes('oil')) return 'likely oil heating';
  if (value.includes('gas')) return 'old gas heating likely';
  if (value.includes('modern')) return 'modern heating';
  return String(heatingSignal);
}
