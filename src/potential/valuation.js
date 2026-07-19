/**
 * Rough redevelopment ticket estimates (not bank valuations).
 * @param {import('../filter/types.js').ScoredProperty} property
 */
export function estimateValues(property) {
  const builtGfa = property.built_gfa ?? Math.round(property.parcel_m2 * 0.35);
  const allowedGfa =
    property.allowed_gfa ?? Math.round(property.parcel_m2 * 1.2);
  const age = property.construction_year
    ? new Date().getFullYear() - property.construction_year
    : 50;

  const basePerM2 = age >= 55 ? 2200 : age >= 35 ? 2800 : 3200;
  const stabilizedPerM2 = 4200;
  const developmentPerM2 = 4800;

  const valueToday = Math.round(builtGfa * basePerM2);
  const valueAfterImprovement = Math.round(
    Math.min(allowedGfa, builtGfa * 1.8) * stabilizedPerM2
  );
  const valueAfterDevelopment = Math.round(allowedGfa * developmentPerM2);

  const upsideLow = Math.max(
    0,
    Math.round(valueAfterImprovement * 0.75 - valueToday)
  );
  const upsideHigh = Math.max(
    upsideLow,
    Math.round(valueAfterDevelopment - valueToday)
  );

  const ticketLow = Math.round(valueToday * 0.85);
  const ticketHigh = Math.round(valueToday * 1.15);

  return {
    value_today: valueToday,
    value_after: valueAfterImprovement,
    upside_low: upsideLow,
    upside_high: upsideHigh,
    ticket_low: ticketLow,
    ticket_high: ticketHigh,
  };
}

/**
 * @param {number} low
 * @param {number} high
 */
export function formatEuroRange(low, high) {
  const fmt = (n) =>
    new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(n);
  return `${fmt(low)} – ${fmt(high)}`;
}

/**
 * @param {number} n
 */
export function formatEuro(n) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}
