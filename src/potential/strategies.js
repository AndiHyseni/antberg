/** @typedef {'value_add'|'buy_hold'|'fix_flip'|'core'|'core_plus'|'repositioning'|'conversion'|'development'|'portfolio'|'distressed'|'opportunistic'|'income_yield'|'land_banking'} StrategyId */

/** @typedef {{ id: StrategyId, label: string, featured: boolean, keywords: string[] }} StrategyDef */

/** @type {StrategyDef[]} */
export const STRATEGIES = [
  {
    id: 'value_add',
    label: 'Value Add',
    featured: true,
    keywords: ['renovation', 'upside', 'modernization', 'densification'],
  },
  {
    id: 'buy_hold',
    label: 'Buy & Hold',
    featured: true,
    keywords: ['yield', 'rent growth', 'stable cash flow', 'long-term'],
  },
  {
    id: 'fix_flip',
    label: 'Fix & Flip',
    featured: true,
    keywords: ['quick exit', 'renovation', 'resale', 'short hold'],
  },
  {
    id: 'core',
    label: 'Core',
    featured: true,
    keywords: ['stabilized', 'low risk', 'institutional quality'],
  },
  {
    id: 'core_plus',
    label: 'Core Plus',
    featured: true,
    keywords: ['light value add', 'operational upside', 'moderate risk'],
  },
  {
    id: 'repositioning',
    label: 'Repositioning',
    featured: false,
    keywords: ['use change', 'reposition', 'tenant mix'],
  },
  {
    id: 'conversion',
    label: 'Conversion',
    featured: false,
    keywords: ['conversion', 'change of use', 'adaptive reuse'],
  },
  {
    id: 'development',
    label: 'Development',
    featured: false,
    keywords: ['densification', 'new build', 'GFZ', 'volume'],
  },
  {
    id: 'portfolio',
    label: 'Portfolio Aggregation',
    featured: false,
    keywords: ['scale', 'portfolio', 'cluster'],
  },
  {
    id: 'distressed',
    label: 'Distressed',
    featured: false,
    keywords: ['neglect', 'distress', 'deep discount'],
  },
  {
    id: 'opportunistic',
    label: 'Opportunistic',
    featured: false,
    keywords: ['asymmetric upside', 'complexity premium'],
  },
  {
    id: 'income_yield',
    label: 'Income / Yield',
    featured: false,
    keywords: ['income', 'yield', 'rent roll'],
  },
  {
    id: 'land_banking',
    label: 'Land Banking',
    featured: false,
    keywords: ['land', 'plot', 'hold for zoning'],
  },
];

/**
 * @param {StrategyId} id
 */
export function getStrategy(id) {
  return STRATEGIES.find((s) => s.id === id) ?? STRATEGIES[0];
}

/**
 * @param {import('../filter/types.js').ScoredProperty} property
 * @param {StrategyId} strategyId
 */
export function strategyFitScore(property, strategyId) {
  let score = property.total_score ?? 0;

  const util = property.utilization_pct ?? 100;
  const floorGap =
    (property.allowed_floors ?? 0) - (property.built_floors ?? 0);
  const heating = String(property.heating_signal ?? '').toLowerCase();
  const landUse = String(property.land_use ?? '').toLowerCase();

  switch (strategyId) {
    case 'fix_flip':
      if (property.renovation_neglect_score >= 3) score += 4;
      if (heating.includes('oil') || heating.includes('gas')) score += 3;
      if (util <= 55) score += 2;
      break;
    case 'buy_hold':
      if (property.parcel_m2 >= 1000) score += 2;
      if (landUse.includes('wohn')) score += 3;
      if (property.residential_building_count > 0) score += 2;
      break;
    case 'value_add':
      if (property.utilization_gap_score >= 4) score += 4;
      if (property.floor_upside_score >= 4) score += 3;
      if (heating.includes('oil') || heating.includes('gas')) score += 2;
      break;
    case 'development':
      if (floorGap >= 2) score += 5;
      if (util <= 45) score += 4;
      break;
    case 'distressed':
      if (property.age_bonus_score >= 2) score += 3;
      if (property.renovation_neglect_score >= 5) score += 4;
      break;
    case 'land_banking':
      if (property.built_gfa != null && property.built_gfa < 200) score += 4;
      if (property.parcel_m2 >= 1500) score += 3;
      break;
    default:
      break;
  }

  return score;
}

/**
 * @param {import('../filter/types.js').ScoredProperty} property
 * @param {StrategyId} strategyId
 */
export function buildStrategyFitText(property, strategyId) {
  const util = property.utilization_pct;
  const floorGap =
    (property.allowed_floors ?? 0) - (property.built_floors ?? 0);

  /** @type {Record<StrategyId, () => string>} */
  const templates = {
    value_add: () => {
      const parts = [
        `Under-built volume (${util ?? '?'}% of zoning capacity) creates a clear value-add path through densification and modernization.`,
      ];
      if (property.heating_signal) {
        parts.push(
          `Energy retrofit unlocks rent and exit multiples without changing the use case.`
        );
      }
      return parts.join(' ');
    },
    buy_hold: () =>
      `Residential land use with ${property.parcel_m2.toLocaleString('de-DE')} m² plot supports stable income; upside comes from gradual rent catch-up after capex rather than a quick flip.`,
    fix_flip: () =>
      `Visible neglect (${property.renovation_status ?? 'renovation gap'}) and ${property.heating_signal ?? 'legacy building systems'} point to a buy-renovate-sell cycle with defined exit after stabilization.`,
    core: () =>
      `Location in ${property.municipality ?? 'the target market'} with established built mass fits a low-volatility hold once basic capex is priced in.`,
    core_plus: () =>
      `Moderate operational upside (${floorGap > 0 ? `${floorGap} floor(s) headroom` : 'efficiency gains'}) on a stabilizable asset class without full redevelopment risk.`,
    repositioning: () =>
      `Mixed or flexible land use (${property.land_use ?? 'mixed'}) allows a repositioning thesis if tenant mix or use can be upgraded.`,
    conversion: () =>
      `Building stock and zoning leave room to convert toward higher-value residential or mixed use after entitlement review.`,
    development: () =>
      `Zoning allows ${property.allowed_floors ?? '?'} floors vs ${property.built_floors ?? '?'} built — a development-style play on unused GFZ rather than cosmetic renovation alone.`,
    portfolio: () =>
      `Ticket size and score profile suit batching into a larger Stuttgart cluster for portfolio aggregation.`,
    distressed: () =>
      `Age and renovation signals suggest a distressed seller narrative — price for capex, exit on stabilized value.`,
    opportunistic: () =>
      `Data gaps (${property.data_gaps.slice(0, 2).join(', ') || 'title detail'}) may deter retail buyers — complexity premium for a prepared investor.`,
    income_yield: () =>
      `Residential footprint supports yield focus; post-renovation rent roll is the main return driver.`,
    land_banking: () =>
      `${property.parcel_m2.toLocaleString('de-DE')} m² plot with limited built GFA — land-banking optionality if zoning tightens further.`,
  };

  return templates[strategyId]?.() ?? templates.value_add();
}
