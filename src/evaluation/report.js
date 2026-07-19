import { capexTotals } from './capex.js';
import { deriveRecommendation, runScenarioEngine } from './scenarios.js';
import { recommendedValueRange, getBankValue } from './valuation.js';
import { confirmedFactsOnly } from './verification.js';

/**
 * @param {number} n
 */
function eur(n) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n ?? 0);
}

/**
 * @param {import('./types.js').EvaluationRecord} record
 */
export function buildReport(record) {
  runScenarioEngine(record);
  const recommendation = deriveRecommendation(record);
  const valueRange = recommendedValueRange(record.valuations ?? []);
  const bank = getBankValue(record.valuations ?? []);
  const capex = capexTotals(record.capex_items ?? []);
  const primaryScenario =
    record.scenarios?.find((s) => s.scenario === 'renovate_hold') ?? record.scenarios?.[0];

  const safeOfferLow = primaryScenario?.max_offer_low ?? Math.round(valueRange.low * 0.9);
  const safeOfferHigh = primaryScenario?.max_offer_high ?? Math.round(valueRange.high * 0.85);
  const doNotExceed = primaryScenario?.max_offer_high ?? safeOfferHigh;

  record.report = {
    generated_at: new Date().toISOString(),
    object_id: record.object_id,
    eval_id: record.eval_id,
    confidence_pct: record.confidence_pct,
    missing_docs: record.missing_docs,
    recommendation,
    recommendation_labels: {
      buy: 'Buy',
      negotiate: 'Negotiate',
      reject: 'Reject',
      need_documents: 'Need documents',
      need_inspection: 'Need inspection',
    },
    value_range: valueRange,
    bank_value: bank ? { low: bank.value_low, high: bank.value_high } : null,
    capex_range: capex,
    income: record.income,
    safe_offer_range: { low: safeOfferLow, high: safeOfferHigh },
    do_not_exceed: doNotExceed,
    valuations: record.valuations,
    scenarios: record.scenarios,
    verification: record.verification,
    confirmed_facts_count: confirmedFactsOnly(record).length,
  };

  record.status = 'reported';
  return record;
}

/**
 * @param {import('./types.js').EvaluationRecord} record
 */
export function renderReportHtml(record) {
  if (!record.report) buildReport(record);
  const r = record.report;
  const recLabel = r.recommendation_labels?.[r.recommendation] ?? r.recommendation;

  const factsRows = confirmedFactsOnly(record)
    .map(
      (f) =>
        `<tr><td>${f.key}</td><td>${f.value}${f.unit ? ` ${f.unit}` : ''}</td><td>${f.source_doc_id ?? '—'}</td><td>${f.confirmed_by}</td></tr>`
    )
    .join('');

  const capexRows = (record.capex_items ?? [])
    .map(
      (c) =>
        `<tr><td>${c.component}</td><td>${c.condition}</td><td>${c.urgency}</td><td>${eur(c.cost_low)} – ${eur(c.cost_high)}</td></tr>`
    )
    .join('');

  const valRows = (record.valuations ?? [])
    .map(
      (v) =>
        `<tr><td>${v.method}</td><td>${eur(v.value_low)} – ${eur(v.value_high)}</td><td>${v.explanation}</td></tr>`
    )
    .join('');

  const scenarioRows = (record.scenarios ?? [])
    .map(
      (s) =>
        `<tr><td>${s.label}</td><td>${eur(s.total_cost_low)} – ${eur(s.total_cost_high)}</td><td>${eur(s.exit_value_low)} – ${eur(s.exit_value_high)}</td><td>${eur(s.max_offer_low)} – ${eur(s.max_offer_high)}</td></tr>`
    )
    .join('');

  const checkRows = (record.verification?.checks ?? [])
    .map(
      (c) =>
        `<tr><td>${c.check}</td><td class="${c.status}">${c.status}</td><td>${c.detail}</td></tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Evaluation Report · ${record.object_id}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 800px; margin: 2rem auto; padding: 0 1.5rem; color: #1a1814; line-height: 1.5; }
    h1 { font-size: 1.75rem; margin-bottom: 0.25rem; }
    .meta { color: #6b6560; font-size: 0.95rem; margin-bottom: 2rem; }
    .hero { background: #e8f0ec; padding: 1.5rem; border-radius: 4px; margin: 1.5rem 0; text-align: center; }
    .hero .num { font-size: 2rem; font-weight: 600; display: block; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0 2rem; font-size: 0.9rem; }
    th, td { border-bottom: 1px solid #e8e2d8; padding: 0.5rem; text-align: left; }
    th { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: #6b6560; }
    .rec { font-size: 1.25rem; font-weight: 600; color: #2c4a3e; }
    .pass { color: #2c4a3e; } .warn { color: #9a6b3c; } .fail { color: #8b3030; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>Object Evaluation Report</h1>
  <p class="meta">${record.object_id} · eval ${record.eval_id} · confidence ${r.confidence_pct}% · ${new Date(r.generated_at).toLocaleString('de-DE')}</p>

  <div class="hero">
    <span class="num">${eur(r.bank_value?.low ?? r.value_range.low)} – ${eur(r.bank_value?.high ?? r.value_range.high)}</span>
    Bank-style conservative value (indicative)
  </div>

  <p class="rec">Recommendation: ${recLabel}</p>
  <p>Safe offer range: <strong>${eur(r.safe_offer_range.low)} – ${eur(r.safe_offer_range.high)}</strong><br />
  Do not exceed: <strong>${eur(r.do_not_exceed)}</strong></p>

  ${r.missing_docs?.length ? `<p><strong>Missing documents:</strong> ${r.missing_docs.join(', ')}</p>` : ''}

  <h2>Valuations (three methods + bank)</h2>
  <table><thead><tr><th>Method</th><th>Range</th><th>Notes</th></tr></thead><tbody>${valRows}</tbody></table>

  <h2>Capex range</h2>
  <p><strong>${eur(r.capex_range.cost_low)} – ${eur(r.capex_range.cost_high)}</strong></p>
  <table><thead><tr><th>Component</th><th>Condition</th><th>Urgency</th><th>Cost</th></tr></thead><tbody>${capexRows}</tbody></table>

  <h2>Income</h2>
  <p>Current NOI: ${eur(r.income?.current_noi)} · Potential NOI: ${eur(r.income?.potential_noi)} · Rent upside: ${eur(r.income?.rent_upside_eur)}</p>

  <h2>Investor scenarios</h2>
  <table><thead><tr><th>Scenario</th><th>Total cost</th><th>Exit value</th><th>Max offer</th></tr></thead><tbody>${scenarioRows}</tbody></table>

  <h2>Data verification</h2>
  <table><thead><tr><th>Check</th><th>Status</th><th>Detail</th></tr></thead><tbody>${checkRows}</tbody></table>

  <h2>Confirmed facts</h2>
  <table><thead><tr><th>Key</th><th>Value</th><th>Source</th><th>Confirmed by</th></tr></thead><tbody>${factsRows}</tbody></table>

  <p style="margin-top:3rem;font-size:0.85rem;color:#6b6560">Not an official bank or court valuation. All figures are ranges based on human-confirmed facts. inputs_json stored per valuation for audit.</p>
</body>
</html>`;
}
