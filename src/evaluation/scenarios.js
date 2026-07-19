import { capexTotals } from './capex.js';
import { recommendedValueRange, getBankValue } from './valuation.js';

/**
 * @param {import('./types.js').EvaluationRecord} record
 */
export function runScenarioEngine(record) {
  const capex = capexTotals(record.capex_items ?? []);
  const valueRange = recommendedValueRange(record.valuations ?? []);
  const bank = getBankValue(record.valuations ?? []);
  const potentialNoi = record.income?.potential_noi ?? record.income?.current_noi ?? 0;
  const stabilizedValue = Math.round(potentialNoi / 0.055);

  /** @type {import('./types.js').ScenarioResult[]} */
  const scenarios = [];

  scenarios.push({
    scenario: 'as_is',
    label: 'Buy as-is',
    total_cost_low: 0,
    total_cost_high: Math.round(capex.cost_low * 0.15),
    exit_value_low: valueRange.low,
    exit_value_high: valueRange.high,
    profit_low: valueRange.low - valueRange.high * 0.05,
    profit_high: valueRange.high - valueRange.low * 0.05,
    max_offer_low: Math.round(valueRange.low * 0.92),
    max_offer_high: Math.round(valueRange.high * 0.88),
  });

  scenarios.push({
    scenario: 'renovate_hold',
    label: 'Renovate & hold',
    total_cost_low: capex.cost_low,
    total_cost_high: capex.cost_high,
    exit_value_low: Math.round(stabilizedValue * 0.95),
    exit_value_high: Math.round(stabilizedValue * 1.05),
    profit_low: Math.round(stabilizedValue * 0.95 - capex.cost_high - valueRange.low * 0.95),
    profit_high: Math.round(stabilizedValue * 1.05 - capex.cost_low - valueRange.high * 0.9),
    max_offer_low: Math.round((stabilizedValue * 0.95 - capex.cost_high) * 0.85),
    max_offer_high: Math.round((stabilizedValue * 1.05 - capex.cost_low) * 0.88),
  });

  scenarios.push({
    scenario: 'renovate_sell',
    label: 'Renovate & sell',
    total_cost_low: capex.cost_low,
    total_cost_high: capex.cost_high,
    exit_value_low: Math.round(stabilizedValue * 0.98),
    exit_value_high: Math.round(stabilizedValue * 1.08),
    profit_low: Math.round(stabilizedValue * 0.98 - capex.cost_high - valueRange.low),
    profit_high: Math.round(stabilizedValue * 1.08 - capex.cost_low - valueRange.high * 0.92),
    max_offer_low: Math.round(stabilizedValue * 0.98 - capex.cost_high - 150000),
    max_offer_high: Math.round(stabilizedValue * 1.05 - capex.cost_low - 80000),
  });

  for (const s of scenarios) {
    if (bank) {
      s.max_offer_high = Math.min(s.max_offer_high, bank.value_high);
    }
    const floor = Math.round(valueRange.low * 0.72);
    s.max_offer_low = Math.max(floor, s.max_offer_low);
    s.max_offer_high = Math.max(s.max_offer_low, s.max_offer_high);
  }

  record.scenarios = scenarios;
  return record;
}

/**
 * @param {import('./types.js').EvaluationRecord} record
 * @returns {import('./types.js').Recommendation}
 */
export function deriveRecommendation(record) {
  if (record.missing_docs.length >= 3) return 'need_documents';
  if (record.confidence_pct < 45) return 'need_inspection';
  if (record.verification?.fail_count >= 2) return 'need_documents';

  const renovateHold = record.scenarios?.find((s) => s.scenario === 'renovate_hold');
  if (!renovateHold) return 'need_documents';

  if (renovateHold.profit_low < 0 && renovateHold.profit_high < 0) return 'reject';
  if (renovateHold.profit_low > 200000) return 'buy';
  return 'negotiate';
}
