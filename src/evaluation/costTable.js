/** Default Stuttgart office cost table — editable in data/evaluation/cost-table.json */

/** @type {Record<string, { unit: string, cost_low: number, cost_high: number, label: string }>} */
export const DEFAULT_COST_TABLE = {
  roof: { unit: 'm2', cost_low: 85, cost_high: 140, label: 'Roof' },
  facade: { unit: 'm2', cost_low: 120, cost_high: 220, label: 'Facade' },
  windows: { unit: 'm2', cost_low: 450, cost_high: 750, label: 'Windows' },
  heating: { unit: 'unit', cost_low: 12000, cost_high: 22000, label: 'Heating system' },
  electricity: { unit: 'unit', cost_low: 3500, cost_high: 8000, label: 'Electrical installation' },
  pipes: { unit: 'unit', cost_low: 4500, cost_high: 9000, label: 'Pipes / sanitation' },
  bathrooms: { unit: 'unit', cost_low: 8000, cost_high: 15000, label: 'Bathrooms' },
  floors: { unit: 'm2', cost_low: 45, cost_high: 95, label: 'Floors / interior finishes' },
  basement: { unit: 'm2', cost_low: 35, cost_high: 75, label: 'Basement / cellar' },
  moisture: { unit: 'flat', cost_low: 8000, cost_high: 25000, label: 'Moisture remediation' },
  fire_protection: { unit: 'flat', cost_low: 5000, cost_high: 18000, label: 'Fire protection' },
  energy_upgrade: { unit: 'm2', cost_low: 180, cost_high: 320, label: 'Energy upgrade package' },
  common_areas: { unit: 'm2', cost_low: 250, cost_high: 450, label: 'Common areas / stairwells' },
};

/** @type {Record<string, { good: number, fair: number, poor: number, critical: number }>} */
export const CONDITION_MULTIPLIER = {
  roof: { good: 0.1, fair: 0.4, poor: 0.75, critical: 1 },
  facade: { good: 0.1, fair: 0.45, poor: 0.8, critical: 1 },
  windows: { good: 0.15, fair: 0.5, poor: 0.85, critical: 1 },
  heating: { good: 0.05, fair: 0.35, poor: 0.9, critical: 1 },
  electricity: { good: 0.1, fair: 0.4, poor: 0.7, critical: 1 },
  pipes: { good: 0.1, fair: 0.45, poor: 0.8, critical: 1 },
  bathrooms: { good: 0.15, fair: 0.5, poor: 0.85, critical: 1 },
  floors: { good: 0.1, fair: 0.35, poor: 0.65, critical: 1 },
  basement: { good: 0.05, fair: 0.3, poor: 0.6, critical: 1 },
  moisture: { good: 0, fair: 0.2, poor: 0.7, critical: 1 },
  fire_protection: { good: 0.05, fair: 0.25, poor: 0.6, critical: 1 },
  energy_upgrade: { good: 0.2, fair: 0.55, poor: 0.9, critical: 1 },
  common_areas: { good: 0.1, fair: 0.4, poor: 0.75, critical: 1 },
};

export const URGENCY_BUFFER = {
  low: 1.05,
  medium: 1.1,
  high: 1.18,
  urgent: 1.25,
};
