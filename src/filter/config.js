/** Hard filter thresholds from developmentAntberg.pdf */
export const MIN_PARCEL_M2 = 800;
/** Exclude implausibly large urban parcels (bad joins / forest/agriculture). */
export const MAX_PARCEL_M2 = 25_000;
export const MAX_UTILIZATION_RATIO = 0.75;
export const RECENT_RENOVATION_YEARS = 15;

/** Land uses that support residential / mixed redevelopment */
export const DEVELOPABLE_LAND_USES = new Set([
  'Wohnbaufläche',
  'Handel und Dienstleistung',
  'Gemischte Nutzung',
  'Gebäude- und Freifläche Industrie und Gewerbe',
  'Gebäude- und Freifläche Handel und Dienstleistung',
  'Gebäude- und Freifläche gemischter Nutzung',
  'Gartenbauland',
  'Fläche gemischter Nutzung',
  'Industrie- und Gewerbefläche',
  'Sonstige Fläche gemischter Nutzung',
  'Öffentliche Zwecke',
]);

/** Uses that alone indicate non-redevelopment land */
export const NON_DEVELOPABLE_LAND_USES = new Set([
  'Wald',
  'Laub- und Nadelholz',
  'Nadelholz',
  'Laubholz',
  'Ackerland',
  'Grünland',
  'Grünanlage',
  'Straßenverkehr',
  'Weg',
  'Fließgewässer',
  'Stillstandgewässer',
  'Heide',
  'Moor',
  'Felsfläche',
  'Gebäude- und Freifläche Verkehr',
  'Bahnverkehr',
  'Flugverkehr',
  'Schiffsverkehr',
]);

/** Keywords in legal layer that trigger heritage hard filter */
export const HERITAGE_LEGAL_PATTERN =
  /denkmal|erhaltungssatzung|ensemble|schutzbereich|schutzgebiet|denkmalschutz/i;

/** Residential / mixed-use building functions worth scoring */
export const RESIDENTIAL_BUILDING_FUNCTIONS = new Set([
  'Wohnhaus',
  'Wohn- und Geschäftsgebäude',
  'Mehrfamilienhaus',
  'Einfamilienhaus',
  'Zweifamilienhaus',
  'Reihenhaus',
  'Doppelhaus',
  'Wohnheim',
  'Gebäude für Wohnzwecke',
]);

export const SCORE_WEIGHTS = {
  floorUpside: { gte3: 6, eq2: 4, eq1: 1 },
  utilizationGap: { lte40: 6, lte55: 4, lte65: 2 },
  renovationNeglect: { gte30: 5, gte20: 3 },
  heatingDistress: { oil: 4, oldGas: 2 },
  ageBonus: { gte60: 3, gte50: 2, gte40: 1 },
  parcelBonus: { gte1500: 3, gte1000: 2, gte800: 1 },
};
