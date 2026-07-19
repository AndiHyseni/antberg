import { CAPEX_COMPONENTS } from './types.js';
import { CONDITION_MULTIPLIER, URGENCY_BUFFER } from './costTable.js';
import { getConfirmedFact } from './facts.js';

/**
 * @param {import('./types.js').EvaluationRecord} record
 * @param {Record<string, { unit: string, cost_low: number, cost_high: number, label: string }>} costTable
 */
export function runCapexEngine(record, costTable) {
  const living = Number(getConfirmedFact(record, 'living_area_m2') ?? 0);
  const units = Number(getConfirmedFact(record, 'unit_count') ?? 1);
  const conditions = record.intake?.component_conditions ?? {};

  /** @type {import('./types.js').CapexItem[]} */
  const items = [];

  for (const component of CAPEX_COMPONENTS) {
    const table = costTable[component];
    if (!table) continue;

    const condition = conditions[component] ?? 'fair';
    const urgency = conditions[`${component}_urgency`] ?? (condition === 'critical' ? 'urgent' : 'medium');
    const mult = CONDITION_MULTIPLIER[component]?.[condition] ?? 0.5;
    const buffer = URGENCY_BUFFER[urgency] ?? 1.1;

    let quantity = 1;
    if (table.unit === 'm2') quantity = living;
    else if (table.unit === 'unit') quantity = units;

    const baseLow = table.cost_low * quantity * mult;
    const baseHigh = table.cost_high * quantity * mult;

    items.push({
      component,
      condition,
      urgency,
      cost_low: Math.round(baseLow * buffer),
      cost_high: Math.round(baseHigh * buffer),
      note: `${table.label} · ${condition} · qty ${quantity} ${table.unit}`,
    });
  }

  record.capex_items = items;
  return record;
}

/**
 * @param {import('./types.js').CapexItem[]} items
 */
export function capexTotals(items) {
  const cost_low = items.reduce((s, i) => s + i.cost_low, 0);
  const cost_high = items.reduce((s, i) => s + i.cost_high, 0);
  return { cost_low, cost_high };
}

/**
 * @param {import('./types.js').EvaluationRecord} record
 * @param {string} component
 * @param {Partial<import('./types.js').CapexItem>} patch
 * @param {Record<string, { unit: string, cost_low: number, cost_high: number, label: string }>} costTable
 */
export function updateCapexComponent(record, component, patch, costTable) {
  const idx = record.capex_items.findIndex((i) => i.component === component);
  if (idx >= 0) {
    record.capex_items[idx] = { ...record.capex_items[idx], ...patch };
  } else {
    record.capex_items.push({
      component,
      condition: patch.condition ?? 'fair',
      urgency: patch.urgency ?? 'medium',
      cost_low: patch.cost_low ?? 0,
      cost_high: patch.cost_high ?? 0,
      note: patch.note ?? null,
    });
  }

  if (patch.condition && costTable[component]) {
    runCapexEngine(record, costTable);
  }

  return record;
}
