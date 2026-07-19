import { STUTTGART_AGS, STUTTGART_FALLBACK_BBOX } from '../config.js';

/** BW statewide XPlanung FNP WFS (Flächennutzungsplan) */
export const FNP_WFS_URL =
  'https://www.geoportal-raumordnung-bw.de/ows/services/org.1.edbff91b-a412-472a-b119-56b51ca69805_wfs';

export const FNP_LAYER = 'xplan:FP_BebauungsFlaeche';

/** Stuttgart INSPIRE Bebauungsplan WFS (plan boundaries, no parcel GFZ) */
export const BPL_INSPIRE_WFS_URL =
  'https://geodienste.komm.one/ows/services/org.152.fd3bb117-3fd9-4293-a0ff-6491e047520b_wfs';

export const WAERMEATLAS_BASE_URL = 'https://waermeatlas-bw.need.energy';

export const EXTERNAL_CACHE_DIR = 'cache/external';

export const STUTTGART_BEREICH_ID = `FP_Bereich_${STUTTGART_AGS}000000`;

export const GFZ_TILE_SIZE = 2000;

export const GFZ_BBOX = STUTTGART_FALLBACK_BBOX;
