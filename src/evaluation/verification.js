import { getConfirmedFact } from './facts.js';

/**
 * @param {import('./types.js').EvaluationRecord} record
 */
export function runVerification(record) {
  /** @type {{ check: string, status: 'pass'|'warn'|'fail', detail: string }[]} */
  const checks = [];

  const living = getConfirmedFact(record, 'living_area_m2');
  const built = getConfirmedFact(record, 'built_gfa_m2');
  const rent = getConfirmedFact(record, 'annual_net_rent_eur');
  const marketRent = getConfirmedFact(record, 'annual_market_rent_eur');
  const land = getConfirmedFact(record, 'land_area_m2');
  const brw = getConfirmedFact(record, 'bodenrichtwert_eur_m2');

  if (living != null && built != null) {
    const diff = Math.abs(Number(living) - Number(built)) / Number(built);
    checks.push({
      check: 'Plan area vs built GFA',
      status: diff <= 0.08 ? 'pass' : diff <= 0.15 ? 'warn' : 'fail',
      detail: `Living ${living} m² vs built GFA ${built} m² (${Math.round(diff * 100)}% delta)`,
    });
  } else {
    checks.push({
      check: 'Plan area vs built GFA',
      status: 'fail',
      detail: 'Missing confirmed living_area_m2 or built_gfa_m2',
    });
  }

  if (rent != null && marketRent != null) {
    const gap = Number(marketRent) - Number(rent);
    checks.push({
      check: 'Contract rent vs market rent',
      status: gap >= 0 ? 'pass' : 'warn',
      detail: `Net rent €${rent} vs market €${marketRent}`,
    });
  } else {
    checks.push({
      check: 'Contract rent vs market rent',
      status: 'fail',
      detail: 'Missing confirmed rent figures',
    });
  }

  if (land != null && brw != null) {
    checks.push({
      check: 'Bodenrichtwert plausibility',
      status: Number(brw) >= 200 && Number(brw) <= 2500 ? 'pass' : 'warn',
      detail: `BRW €${brw}/m² on ${land} m² land`,
    });
  } else {
    checks.push({
      check: 'Bodenrichtwert plausibility',
      status: 'fail',
      detail: 'Missing confirmed land area or Bodenrichtwert',
    });
  }

  const photoDoc = record.documents.find((d) => d.type === 'photos');
  checks.push({
    check: 'Photo coverage',
    status: photoDoc?.status === 'received' ? 'pass' : 'warn',
    detail: photoDoc?.status === 'received' ? 'Photos received' : 'Photos missing',
  });

  const passCount = checks.filter((c) => c.status === 'pass').length;
  const warnCount = checks.filter((c) => c.status === 'warn').length;
  const failCount = checks.filter((c) => c.status === 'fail').length;

  let confidence = 100;
  confidence -= failCount * 15;
  confidence -= warnCount * 5;
  confidence -= record.missing_docs.length * 8;
  confidence -= record.facts.filter((f) => !f.confirmed_by).length * 3;
  confidence = Math.max(0, Math.min(100, confidence));

  record.verification = {
    checks,
    pass_count: passCount,
    warn_count: warnCount,
    fail_count: failCount,
    verified_at: new Date().toISOString(),
  };
  record.confidence_pct = confidence;

  return record;
}

/**
 * @param {import('./types.js').EvaluationRecord} record
 */
export function confirmedFactsOnly(record) {
  return record.facts.filter((f) => f.confirmed_by);
}

export function unconfirmedFactKeys(record) {
  return record.facts.filter((f) => !f.confirmed_by).map((f) => f.key);
}
