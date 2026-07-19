import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const DATA_DIR = path.join('data', 'evaluations');
const COST_TABLE_PATH = path.join('data', 'evaluation', 'cost-table.json');

/**
 * @returns {Promise<import('./types.js').EvaluationRecord[]>}
 */
export async function listEvaluations() {
  try {
    const files = await fs.readdir(DATA_DIR);
    /** @type {import('./types.js').EvaluationRecord[]} */
    const rows = [];
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      rows.push(JSON.parse(await fs.readFile(path.join(DATA_DIR, file), 'utf8')));
    }
    return rows.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  } catch {
    return [];
  }
}

/**
 * @param {string} evalId
 */
export async function loadEvaluation(evalId) {
  const filePath = path.join(DATA_DIR, `${evalId}.json`);
  return /** @type {Promise<import('./types.js').EvaluationRecord>} */ (
    JSON.parse(await fs.readFile(filePath, 'utf8'))
  );
}

/**
 * @param {import('./types.js').EvaluationRecord} record
 */
export async function saveEvaluation(record) {
  record.updated_at = new Date().toISOString();
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(
    path.join(DATA_DIR, `${record.eval_id}.json`),
    JSON.stringify(record, null, 2),
    'utf8'
  );
  return record;
}

/**
 * @param {Partial<import('./types.js').EvaluationRecord>} seed
 */
export async function createEvaluation(seed = {}) {
  const now = new Date().toISOString();
  /** @type {import('./types.js').EvaluationRecord} */
  const record = {
    eval_id: seed.eval_id ?? randomUUID().slice(0, 8),
    object_id: seed.object_id ?? 'STG-000000',
    mandate_id: seed.mandate_id ?? null,
    status: seed.status ?? 'draft',
    confidence_pct: seed.confidence_pct ?? 0,
    missing_docs: seed.missing_docs ?? [],
    created_at: now,
    updated_at: now,
    intake: seed.intake ?? {},
    documents: seed.documents ?? [],
    facts: seed.facts ?? [],
    capex_items: seed.capex_items ?? [],
    valuations: seed.valuations ?? [],
    scenarios: seed.scenarios ?? [],
    income: seed.income ?? null,
    location: seed.location ?? null,
    verification: seed.verification ?? null,
    report: seed.report ?? null,
  };
  return saveEvaluation(record);
}

/**
 * @param {string} evalId
 * @param {string} objectId
 */
export async function findEvaluationByObject(objectId, evalId) {
  if (evalId) {
    try {
      return await loadEvaluation(evalId);
    } catch {
      return null;
    }
  }
  const all = await listEvaluations();
  return all.find((e) => e.object_id === objectId) ?? null;
}

/**
 * @returns {Promise<Record<string, { unit: string, cost_low: number, cost_high: number, label: string }>>}
 */
export async function loadCostTable() {
  try {
    const raw = JSON.parse(await fs.readFile(COST_TABLE_PATH, 'utf8'));
    return raw.components ?? raw;
  } catch {
    const { DEFAULT_COST_TABLE } = await import('./costTable.js');
    await fs.mkdir(path.dirname(COST_TABLE_PATH), { recursive: true });
    await fs.writeFile(
      COST_TABLE_PATH,
      JSON.stringify({ components: DEFAULT_COST_TABLE, updated_at: new Date().toISOString() }, null, 2),
      'utf8'
    );
    return DEFAULT_COST_TABLE;
  }
}

/**
 * @param {Record<string, unknown>} components
 */
export async function saveCostTable(components) {
  await fs.mkdir(path.dirname(COST_TABLE_PATH), { recursive: true });
  await fs.writeFile(
    COST_TABLE_PATH,
    JSON.stringify({ components, updated_at: new Date().toISOString() }, null, 2),
    'utf8'
  );
}

export { DATA_DIR, COST_TABLE_PATH };
