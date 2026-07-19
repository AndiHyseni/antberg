/**
 * BauNVO §17 orientierungswerte mapped from XPlan FP_BebauungsFlaeche
 * `allgArtDerBaulNutzung` codes (Planzeichen / BN codelist).
 * @see https://dejure.org/gesetze/BauNVO/17.html
 */

/** @type {Record<string, { zone: string, gfz: number, grz: number, maxFloors: number, allowsDensification: boolean }>} */
export const BAUNVO_BY_LAND_USE = {
  '1000': { zone: 'WS', gfz: 0.4, grz: 0.2, maxFloors: 2, allowsDensification: true },
  '2000': { zone: 'WR', gfz: 1.2, grz: 0.4, maxFloors: 3, allowsDensification: true },
  '3000': { zone: 'WA', gfz: 1.2, grz: 0.4, maxFloors: 4, allowsDensification: true },
  '4000': { zone: 'WB', gfz: 1.6, grz: 0.6, maxFloors: 4, allowsDensification: true },
  '5000': { zone: 'MD', gfz: 1.2, grz: 0.6, maxFloors: 3, allowsDensification: true },
  '6000': { zone: 'MI', gfz: 1.2, grz: 0.6, maxFloors: 4, allowsDensification: true },
  '7000': { zone: 'MDW', gfz: 1.2, grz: 0.6, maxFloors: 3, allowsDensification: true },
  '8000': { zone: 'MK', gfz: 3.0, grz: 1.0, maxFloors: 5, allowsDensification: true },
  '9000': { zone: 'MU', gfz: 3.0, grz: 0.8, maxFloors: 5, allowsDensification: true },
  '10000': { zone: 'GE', gfz: 2.4, grz: 0.8, maxFloors: 4, allowsDensification: true },
  '11000': { zone: 'GI', gfz: 2.4, grz: 0.8, maxFloors: 3, allowsDensification: false },
};

/** Default for mapped residential FNP zones without exact code match. */
export const DEFAULT_WA = BAUNVO_BY_LAND_USE['3000'];

/**
 * @param {string|number|null|undefined} code
 */
export function resolveBaunvo(code) {
  if (code == null || code === '') return null;
  const key = String(code).trim();
  if (BAUNVO_BY_LAND_USE[key]) return BAUNVO_BY_LAND_USE[key];

  const bucket = `${key[0]}000`;
  if (BAUNVO_BY_LAND_USE[bucket]) return BAUNVO_BY_LAND_USE[bucket];

  const num = Number(key);
  if (num >= 2000 && num < 5000) return DEFAULT_WA;
  if (num >= 8000 && num < 10000) return BAUNVO_BY_LAND_USE['8000'];
  if (num >= 10000) return BAUNVO_BY_LAND_USE['10000'];

  return null;
}

/**
 * GEMOD / Zensus-style Baualtersklasse midpoint years.
 * @type {Record<string, number>}
 */
export const BAUALTER_MIDYEAR = {
  '1': 1910,
  '2': 1935,
  '3': 1953,
  '4': 1963,
  '5': 1973,
  '6': 1981,
  '7': 1989,
  '8': 1998,
  '9': 2005,
  '10': 2012,
  '11': 2020,
  vor1919: 1910,
  '1919-1948': 1935,
  '1919_1948': 1935,
  '1949-1957': 1953,
  '1949_1957': 1953,
  '1958-1968': 1963,
  '1958_1968': 1963,
  '1969-1978': 1973,
  '1969_1978': 1973,
  '1979-1983': 1981,
  '1979_1983': 1981,
  '1984-1994': 1989,
  '1984_1994': 1989,
  '1995-2001': 1998,
  '1995_2001': 1998,
  '2002-2009': 2005,
  '2002_2009': 2005,
  '2010-2015': 2012,
  '2010_2015': 2012,
  ab2016: 2020,
  ab_2016: 2020,
};

/**
 * Infer heating distress from construction era (Wärmeatlas has no fuel type).
 * @param {number|null|undefined} constructionYear
 * @returns {'oil'|'old_gas'|'modern'|null}
 */
export function heatingSignalFromYear(constructionYear) {
  if (constructionYear == null) return null;
  if (constructionYear < 1960) return 'oil';
  if (constructionYear < 1990) return 'old_gas';
  if (constructionYear >= 2000) return 'modern';
  return 'old_gas';
}

/**
 * @param {number|null|undefined} qhKwh
 * @param {number|null|undefined} areaM2
 * @returns {'oil'|'old_gas'|'modern'|null}
 */
export function heatingSignalFromHeatDemand(qhKwh, areaM2) {
  if (qhKwh == null || areaM2 == null || areaM2 <= 0) return null;
  const specific = qhKwh / areaM2;
  if (specific >= 200) return 'oil';
  if (specific >= 130) return 'old_gas';
  if (specific <= 80) return 'modern';
  return 'old_gas';
}
