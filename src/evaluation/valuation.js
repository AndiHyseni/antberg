import { getConfirmedFact } from './facts.js';
import { getNoi } from './income.js';
import { capexTotals } from './capex.js';

const CAP_RATES = { low: 0.045, mid: 0.055, high: 0.065 };
const BANK_LTV = 0.65;
const BANK_HAIRCUT = 0.88;

/**
 * @param {import('./types.js').EvaluationRecord} record
 */
export function runLocationLayer(record) {
  const land = Number(getConfirmedFact(record, 'land_area_m2') ?? 0);
  const brw = Number(getConfirmedFact(record, 'bodenrichtwert_eur_m2') ?? 0);
  const intake = record.intake ?? {};

  const landValueLow = Math.round(land * brw * 0.95);
  const landValueHigh = Math.round(land * brw * 1.05);

  record.location = {
    municipality: intake.municipality ?? intake.city ?? 'Stuttgart',
    micro_location: intake.micro_location ?? intake.district ?? null,
    bodenrichtwert_eur_m2: brw,
    land_area_m2: land,
    land_value_low: landValueLow,
    land_value_high: landValueHigh,
    location_score: intake.location_score ?? 72,
    transport_note: intake.transport_note ?? 'S-Bahn / tram within 800 m (manual)',
    rent_level: intake.rent_level ?? 'mid',
    bebauungsplan_note: intake.bebauungsplan_note ?? 'From ALKIS / FNP proxy',
  };

  return record;
}

/**
 * @param {import('./types.js').EvaluationRecord} record
 */
export function runValuationEngine(record) {
  const landLow = record.location?.land_value_low ?? 0;
  const landHigh = record.location?.land_value_high ?? 0;
  const living = Number(getConfirmedFact(record, 'living_area_m2') ?? 0);
  const year = Number(getConfirmedFact(record, 'construction_year') ?? 1970);
  const replacement = Number(getConfirmedFact(record, 'replacement_cost_eur_m2') ?? 2400);
  const compPrice = Number(getConfirmedFact(record, 'comparable_price_eur') ?? 0);
  const compAdj = Number(getConfirmedFact(record, 'comparable_adjustment_pct') ?? 0);

  const currentNoi = getNoi(record, false);
  const potentialNoi = getNoi(record, true);

  /** @type {import('./types.js').ValuationResult[]} */
  const valuations = [];

  if (currentNoi != null) {
    const erLow = Math.round(currentNoi / CAP_RATES.high);
    const erHigh = Math.round(currentNoi / CAP_RATES.low);
    valuations.push({
      method: 'ertragswert',
      value_low: erLow,
      value_high: erHigh,
      inputs_json: {
        noi_eur: currentNoi,
        cap_rate_low: CAP_RATES.low,
        cap_rate_high: CAP_RATES.high,
        formula: 'NOI / cap_rate',
      },
      explanation: `Income capitalization on current NOI €${currentNoi.toLocaleString('de-DE')}`,
    });

    if (potentialNoi != null && potentialNoi > currentNoi) {
      valuations.push({
        method: 'ertragswert',
        value_low: Math.round(potentialNoi / CAP_RATES.high),
        value_high: Math.round(potentialNoi / CAP_RATES.low),
        inputs_json: {
          noi_eur: potentialNoi,
          variant: 'potential',
          cap_rate_mid: CAP_RATES.mid,
        },
        explanation: `Stabilized Ertragswert on potential NOI €${potentialNoi.toLocaleString('de-DE')}`,
      });
    }
  }

  const age = new Date().getFullYear() - year;
  const depr = Math.min(0.65, age * 0.012);
  const buildingReplacement = living * replacement;
  const buildingNetLow = Math.round(buildingReplacement * (1 - depr - 0.05));
  const buildingNetHigh = Math.round(buildingReplacement * (1 - depr + 0.05));

  valuations.push({
    method: 'sachwert',
    value_low: landLow + buildingNetLow,
    value_high: landHigh + buildingNetHigh,
    inputs_json: {
      land_value_low: landLow,
      land_value_high: landHigh,
      replacement_cost_eur_m2: replacement,
      living_area_m2: living,
      depreciation_pct: Math.round(depr * 100),
      formula: 'Bodenwert + (Herstellungskosten − Alterswertminderung)',
    },
    explanation: `Sachwert: land €${landLow.toLocaleString('de-DE')}–${landHigh.toLocaleString('de-DE')} + building net`,
  });

  if (compPrice > 0) {
    const adj = 1 + compAdj / 100;
    valuations.push({
      method: 'vergleichswert',
      value_low: Math.round(compPrice * adj * 0.95),
      value_high: Math.round(compPrice * adj * 1.05),
      inputs_json: {
        comparable_price_eur: compPrice,
        adjustment_pct: compAdj,
        formula: 'Comparable × (1 + adjustment)',
      },
      explanation: `Vergleichswert from office comparable €${compPrice.toLocaleString('de-DE')}`,
    });
  }

  const er = valuations.find((v) => v.method === 'ertragswert' && !v.inputs_json.variant);
  const sw = valuations.find((v) => v.method === 'sachwert');
  const conservativeBase = Math.min(
    er?.value_low ?? Infinity,
    sw?.value_low ?? Infinity
  );
  const conservativeHigh = Math.min(
    er?.value_high ?? Infinity,
    sw?.value_high ?? Infinity
  );

  if (Number.isFinite(conservativeBase)) {
    valuations.push({
      method: 'bank',
      value_low: Math.round(conservativeBase * BANK_HAIRCUT),
      value_high: Math.round(conservativeHigh * BANK_HAIRCUT),
      inputs_json: {
        base_method: 'min(ertragswert, sachwert)',
        haircut_pct: Math.round((1 - BANK_HAIRCUT) * 100),
        ltv_assumption: BANK_LTV,
        loan_basis_low: Math.round(conservativeBase * BANK_HAIRCUT * BANK_LTV),
        loan_basis_high: Math.round(conservativeHigh * BANK_HAIRCUT * BANK_LTV),
        disclaimer: 'Not an official bank valuation — conservative ruleset for offer prep',
      },
      explanation: 'Bank-style conservative value (haircut on lower of income + cost approaches)',
    });
  }

  record.valuations = valuations;
  return record;
}

/**
 * @param {import('./types.js').ValuationResult[]} valuations
 */
export function recommendedValueRange(valuations) {
  const methods = valuations.filter((v) => v.method !== 'bank' && !v.inputs_json?.variant);
  if (!methods.length) return { low: 0, high: 0 };
  const low = Math.round(methods.reduce((s, v) => s + v.value_low, 0) / methods.length);
  const high = Math.round(methods.reduce((s, v) => s + v.value_high, 0) / methods.length);
  return { low, high };
}

export function getBankValue(valuations) {
  return valuations.find((v) => v.method === 'bank') ?? null;
}
