export const WFS_BASE_URL =
  'https://owsproxy.lgl-bw.de/owsproxy/wfs/WFS_LGL-BW_ALKIS';

export const WFS_PARAMS = {
  SERVICE: 'WFS',
  VERSION: '2.0.0',
  outputFormat: 'application/gml+xml; version=3.2',
  COUNT: '1000000',
  srsName: 'urn:ogc:def:crs:EPSG::25832',
};

export const STUTTGART_AGS = '08111';
export const STUTTGART_NAME = 'Stuttgart';

/** Tighter bbox for gemeinde polygon lookup (Stuttgart city center) */
export const STUTTGART_LOOKUP_BBOX = [510000, 5400000, 520000, 5408000];

/** Fallback bbox [minX, minY, maxX, maxY] EPSG:25832 if gemeinde lookup fails */
export const STUTTGART_FALLBACK_BBOX = [508500, 5385500, 526500, 5403500];

export const DEFAULT_TILE_SIZE = 2000;
export const DEFAULT_CONCURRENCY = 3;
export const DEFAULT_MAX_RETRIES = 4;
export const CACHE_DIR = 'cache/wfs';
export const OUTPUT_DIR = 'output';

export const LICENSE_ATTRIBUTION =
  'Datenquelle: LGL, www.lgl-bw.de';

export const EXCEL_MAX_ROWS = 1_048_576;
