import fs from 'fs/promises';
import path from 'path';
import { createEvaluation, loadEvaluation, DATA_DIR } from './evaluation/store.js';
import { runEvaluationPipeline, renderReportHtml } from './evaluation/engine.js';
import { buildSample28UnitIntake, SAMPLE_OBJECT_ID } from './evaluation/sampleObject.js';

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  /** @type {Record<string, string|boolean|undefined>} */
  const args = {
    objectId: SAMPLE_OBJECT_ID,
    sample: false,
    evalId: undefined,
    report: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--object-id') args.objectId = argv[++i];
    else if (arg === '--sample') args.sample = true;
    else if (arg === '--eval-id') args.evalId = argv[++i];
    else if (arg === '--report') args.report = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
  }

  return args;
}

function printHelp() {
  console.log(`D6 Object Evaluation Engine

Usage:
  npm run evaluate:object -- --sample              Run 28-unit test case end-to-end
  npm run evaluate:object -- --eval-id <id> --report Re-render report for existing eval

Options:
  --sample           Create and run sample 28-apartment mixed-use object
  --object-id <id>   Object ID (default STG-TEST28)
  --eval-id <id>     Existing evaluation ID
  --report           Write HTML report to data/evaluations/reports/
  --help             Show help

Pipeline layers: intake → facts → verification → capex → income → location → valuation → scenarios → report
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  let record;
  if (args.evalId) {
    record = await loadEvaluation(String(args.evalId));
  } else if (args.sample) {
    const intake = buildSample28UnitIntake(String(args.objectId));
    record = await createEvaluation({
      object_id: intake.object_id,
      mandate_id: intake.mandate_id,
      intake,
      status: 'draft',
    });
    console.log(`Created evaluation ${record.eval_id} for ${record.object_id}`);
  } else {
    console.error('Use --sample or --eval-id');
    printHelp();
    process.exit(1);
  }

  record = await runEvaluationPipeline(record);
  const report = record.report;

  console.log('');
  console.log(`Evaluation ${record.eval_id} · ${record.object_id}`);
  console.log(`  Confidence: ${record.confidence_pct}%`);
  console.log(`  Missing docs: ${record.missing_docs.length ? record.missing_docs.join(', ') : 'none'}`);
  console.log(`  Capex: €${report?.capex_range?.cost_low?.toLocaleString('de-DE')} – €${report?.capex_range?.cost_high?.toLocaleString('de-DE')}`);
  console.log(`  Bank value: €${report?.bank_value?.low?.toLocaleString('de-DE')} – €${report?.bank_value?.high?.toLocaleString('de-DE')}`);
  console.log(`  Recommendation: ${report?.recommendation}`);
  console.log(`  Safe offer: €${report?.safe_offer_range?.low?.toLocaleString('de-DE')} – €${report?.safe_offer_range?.high?.toLocaleString('de-DE')}`);
  console.log(`  Do not exceed: €${report?.do_not_exceed?.toLocaleString('de-DE')}`);
  console.log(`  Stored: ${path.join(DATA_DIR, `${record.eval_id}.json`)}`);

  if (args.report || args.sample) {
    const html = renderReportHtml(record);
    const reportDir = path.join(DATA_DIR, 'reports');
    await fs.mkdir(reportDir, { recursive: true });
    const reportPath = path.join(reportDir, `${record.eval_id}-${record.object_id}.html`);
    await fs.writeFile(reportPath, html, 'utf8');
    console.log(`  Report: ${reportPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
