import {
  proposeFactsFromIntake,
  mergeFacts,
  syncDocumentsFromIntake,
} from './facts.js';
import { runVerification } from './verification.js';
import { runCapexEngine } from './capex.js';
import { runIncomeEngine } from './income.js';
import { runLocationLayer, runValuationEngine } from './valuation.js';
import { runScenarioEngine } from './scenarios.js';
import { buildReport, renderReportHtml } from './report.js';
import { loadCostTable, saveEvaluation } from './store.js';

/**
 * Run all D6 layers in order (deterministic).
 * @param {import('./types.js').EvaluationRecord} record
 * @param {{ skipReport?: boolean }} [options]
 */
export async function runEvaluationPipeline(record, options = {}) {
  syncDocumentsFromIntake(record);

  const proposed = proposeFactsFromIntake(record);
  mergeFacts(record, proposed);

  runVerification(record);

  const costTable = await loadCostTable();
  runCapexEngine(record, costTable);
  runIncomeEngine(record);
  runLocationLayer(record);
  runValuationEngine(record);
  runScenarioEngine(record);

  if (!options.skipReport) {
    buildReport(record);
  }

  record.status = record.report ? 'reported' : 'computed';
  await saveEvaluation(record);
  return record;
}

/**
 * Recompute from layer 5 onward after capex/cost table change.
 * @param {import('./types.js').EvaluationRecord} record
 */
export async function recomputeFromCapex(record) {
  const costTable = await loadCostTable();
  runCapexEngine(record, costTable);
  runIncomeEngine(record);
  runValuationEngine(record);
  runScenarioEngine(record);
  buildReport(record);
  await saveEvaluation(record);
  return record;
}

export { renderReportHtml, buildReport };
