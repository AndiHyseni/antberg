/** @typedef {'draft'|'facts_pending'|'verified'|'computed'|'reported'} EvalStatus */

/** @typedef {'roof'|'facade'|'windows'|'heating'|'electricity'|'pipes'|'bathrooms'|'floors'|'basement'|'moisture'|'fire_protection'|'energy_upgrade'|'common_areas'} CapexComponent */

/** @typedef {'good'|'fair'|'poor'|'critical'} ConditionLevel */

/** @typedef {'low'|'medium'|'high'|'urgent'} UrgencyLevel */

/** @typedef {'ertragswert'|'sachwert'|'vergleichswert'|'bank'} ValuationMethod */

/** @typedef {'as_is'|'renovate_hold'|'renovate_sell'} ScenarioId */

/** @typedef {'buy'|'negotiate'|'reject'|'need_documents'|'need_inspection'} Recommendation */

/**
 * @typedef {Object} DocumentRecord
 * @property {string} doc_id
 * @property {string} type
 * @property {string} label
 * @property {string} [filename]
 * @property {string} uploaded_at
 * @property {'pending'|'received'} status
 */

/**
 * @typedef {Object} FactRecord
 * @property {string} key
 * @property {unknown} value
 * @property {string|null} unit
 * @property {string|null} source_doc_id
 * @property {'system'|'human'} extracted_by
 * @property {string|null} confirmed_by
 * @property {string|null} confirmed_at
 * @property {string|null} note
 */

/**
 * @typedef {Object} CapexItem
 * @property {CapexComponent} component
 * @property {ConditionLevel} condition
 * @property {UrgencyLevel} urgency
 * @property {number} cost_low
 * @property {number} cost_high
 * @property {string|null} note
 */

/**
 * @typedef {Object} ValuationResult
 * @property {ValuationMethod} method
 * @property {number} value_low
 * @property {number} value_high
 * @property {Record<string, unknown>} inputs_json
 * @property {string} explanation
 */

/**
 * @typedef {Object} ScenarioResult
 * @property {ScenarioId} scenario
 * @property {string} label
 * @property {number} total_cost_low
 * @property {number} total_cost_high
 * @property {number} exit_value_low
 * @property {number} exit_value_high
 * @property {number} profit_low
 * @property {number} profit_high
 * @property {number} max_offer_low
 * @property {number} max_offer_high
 */

/**
 * @typedef {Object} EvaluationRecord
 * @property {string} eval_id
 * @property {string} object_id
 * @property {string|null} mandate_id
 * @property {EvalStatus} status
 * @property {number} confidence_pct
 * @property {string[]} missing_docs
 * @property {string} created_at
 * @property {string} updated_at
 * @property {Record<string, unknown>} intake
 * @property {DocumentRecord[]} documents
 * @property {FactRecord[]} facts
 * @property {CapexItem[]} capex_items
 * @property {ValuationResult[]} valuations
 * @property {ScenarioResult[]} scenarios
 * @property {Record<string, unknown>|null} income
 * @property {Record<string, unknown>|null} location
 * @property {Record<string, unknown>|null} verification
 * @property {Record<string, unknown>|null} report
 */

export const REQUIRED_DOCUMENTS = [
  { type: 'grundbuch', label: 'Grundbuchauszug' },
  { type: 'g vz', label: 'GVZ / Teilungserklärung' },
  { type: 'plans', label: 'Grundrisse / Flächenaufstellung' },
  { type: 'mietvertraege', label: 'Mietverträge' },
  { type: 'energy', label: 'Energieausweis' },
  { type: 'photos', label: 'Objektfotos' },
  { type: 'expose', label: 'Exposé / Verkäuferangaben' },
];

export const FACT_KEYS = [
  'living_area_m2',
  'commercial_area_m2',
  'unit_count',
  'annual_net_rent_eur',
  'annual_market_rent_eur',
  'vacancy_pct',
  'non_recoverables_eur',
  'maintenance_eur',
  'land_area_m2',
  'bodenrichtwert_eur_m2',
  'construction_year',
  'replacement_cost_eur_m2',
  'comparable_price_eur',
  'comparable_adjustment_pct',
  'owner_name',
  'grundschuld_eur',
  'allowed_gfa_m2',
  'built_gfa_m2',
];

export const CAPEX_COMPONENTS = [
  'roof',
  'facade',
  'windows',
  'heating',
  'electricity',
  'pipes',
  'bathrooms',
  'floors',
  'basement',
  'moisture',
  'fire_protection',
  'energy_upgrade',
  'common_areas',
];

export {};
