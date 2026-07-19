import { getConfirmedFact } from './facts.js';

/**
 * @param {import('./types.js').EvaluationRecord} record
 */
export function runIncomeEngine(record) {
  const annualNetRent = Number(getConfirmedFact(record, 'annual_net_rent_eur'));
  const annualMarketRent = Number(getConfirmedFact(record, 'annual_market_rent_eur'));
  const vacancyPct = Number(getConfirmedFact(record, 'vacancy_pct') ?? 0);
  const nonRec = Number(getConfirmedFact(record, 'non_recoverables_eur') ?? 0);
  const maintenance = Number(getConfirmedFact(record, 'maintenance_eur') ?? 0);

  if (!Number.isFinite(annualNetRent)) {
    record.income = {
      error: 'Missing confirmed annual_net_rent_eur',
      current_noi: null,
      potential_noi: null,
    };
    return record;
  }

  const effectiveRent = annualNetRent * (1 - vacancyPct / 100);
  const currentNoi = effectiveRent - nonRec - maintenance;

  let potentialNoi = currentNoi;
  if (Number.isFinite(annualMarketRent) && annualMarketRent > annualNetRent) {
    const marketEffective = annualMarketRent * (1 - Math.max(0, vacancyPct - 2) / 100);
    potentialNoi = marketEffective - nonRec - maintenance * 0.85;
  }

  const rentUpside = Math.max(0, potentialNoi - currentNoi);

  record.income = {
    annual_net_rent_eur: annualNetRent,
    annual_market_rent_eur: Number.isFinite(annualMarketRent) ? annualMarketRent : null,
    vacancy_pct: vacancyPct,
    non_recoverables_eur: nonRec,
    maintenance_eur: maintenance,
    current_noi: Math.round(currentNoi),
    potential_noi: Math.round(potentialNoi),
    rent_upside_eur: Math.round(rentUpside),
    computed_at: new Date().toISOString(),
  };

  return record;
}

export function getNoi(record, usePotential = false) {
  if (!record.income) return null;
  const key = usePotential ? 'potential_noi' : 'current_noi';
  const val = record.income[key];
  return typeof val === 'number' ? val : null;
}
