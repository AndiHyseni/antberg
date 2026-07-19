import { REQUIRED_DOCUMENTS, FACT_KEYS } from './types.js';

/**
 * @param {import('./types.js').EvaluationRecord} record
 */
export function proposeFactsFromIntake(record) {
  /** @type {import('./types.js').FactRecord[]} */
  const proposed = [];
  const intake = record.intake ?? {};

  /** @type {[string, unknown, string|null, string|null][]} */
  const mappings = [
    ['living_area_m2', intake.living_area_m2, 'm2', 'plans'],
    ['commercial_area_m2', intake.commercial_area_m2, 'm2', 'plans'],
    ['unit_count', intake.unit_count, null, 'plans'],
    ['annual_net_rent_eur', intake.annual_net_rent_eur, 'eur', 'mietvertraege'],
    ['annual_market_rent_eur', intake.annual_market_rent_eur, 'eur', 'mietvertraege'],
    ['vacancy_pct', intake.vacancy_pct, 'pct', 'mietvertraege'],
    ['non_recoverables_eur', intake.non_recoverables_eur, 'eur', 'expose'],
    ['maintenance_eur', intake.maintenance_eur, 'eur', 'expose'],
    ['land_area_m2', intake.land_area_m2, 'm2', 'grundbuch'],
    ['bodenrichtwert_eur_m2', intake.bodenrichtwert_eur_m2, 'eur/m2', 'expose'],
    ['construction_year', intake.construction_year, 'year', 'energy'],
    ['replacement_cost_eur_m2', intake.replacement_cost_eur_m2, 'eur/m2', 'plans'],
    ['comparable_price_eur', intake.comparable_price_eur, 'eur', 'expose'],
    ['comparable_adjustment_pct', intake.comparable_adjustment_pct ?? 0, 'pct', 'expose'],
    ['owner_name', intake.owner_name, null, 'grundbuch'],
    ['grundschuld_eur', intake.grundschuld_eur, 'eur', 'grundbuch'],
    ['allowed_gfa_m2', intake.allowed_gfa_m2, 'm2', 'plans'],
    ['built_gfa_m2', intake.built_gfa_m2, 'm2', 'plans'],
  ];

  for (const [key, value, unit, docType] of mappings) {
    if (value == null || value === '') continue;
    const doc = record.documents.find((d) => d.type === docType);
    proposed.push({
      key,
      value,
      unit,
      source_doc_id: doc?.doc_id ?? null,
      extracted_by: 'system',
      confirmed_by: intake.auto_confirm ? 'office' : null,
      confirmed_at: intake.auto_confirm ? new Date().toISOString() : null,
      note: `Proposed from intake / ${docType ?? 'manual'}`,
    });
  }

  return proposed;
}

/**
 * @param {import('./types.js').EvaluationRecord} record
 * @param {import('./types.js').FactRecord[]} proposed
 */
export function mergeFacts(record, proposed) {
  const byKey = new Map(record.facts.map((f) => [f.key, f]));
  for (const fact of proposed) {
    if (!FACT_KEYS.includes(fact.key)) continue;
    const existing = byKey.get(fact.key);
    if (existing?.confirmed_by) continue;
    byKey.set(fact.key, fact);
  }
  record.facts = Array.from(byKey.values());
  return record;
}

/**
 * @param {import('./types.js').EvaluationRecord} record
 * @param {string} key
 * @param {unknown} value
 * @param {string} confirmedBy
 */
export function confirmFact(record, key, value, confirmedBy = 'office') {
  const fact = record.facts.find((f) => f.key === key);
  if (fact) {
    fact.value = value;
    fact.confirmed_by = confirmedBy;
    fact.confirmed_at = new Date().toISOString();
    fact.extracted_by = fact.extracted_by ?? 'human';
    return record;
  }
  record.facts.push({
    key,
    value,
    unit: null,
    source_doc_id: null,
    extracted_by: 'human',
    confirmed_by: confirmedBy,
    confirmed_at: new Date().toISOString(),
    note: 'Manually confirmed',
  });
  return record;
}

/**
 * @param {import('./types.js').EvaluationRecord} record
 * @param {string} key
 */
export function getConfirmedFact(record, key) {
  const fact = record.facts.find((f) => f.key === key && f.confirmed_by);
  if (!fact) return null;
  const n = Number(fact.value);
  if (Number.isFinite(n)) return n;
  return fact.value;
}

/**
 * @param {import('./types.js').EvaluationRecord} record
 */
export function syncDocumentsFromIntake(record) {
  const received = new Set(
    (record.intake?.documents_received ?? []).map(String)
  );

  record.documents = REQUIRED_DOCUMENTS.map((doc, i) => ({
    doc_id: `${record.eval_id}-doc-${i + 1}`,
    type: doc.type.replace(/\s/g, '_'),
    label: doc.label,
    filename: received.has(doc.type) ? `${doc.type}.pdf` : undefined,
    uploaded_at: received.has(doc.type) ? record.updated_at : record.created_at,
    status: received.has(doc.type) ? 'received' : 'pending',
  }));

  record.missing_docs = record.documents
    .filter((d) => d.status !== 'received')
    .map((d) => d.label);

  return record;
}

export { REQUIRED_DOCUMENTS };
