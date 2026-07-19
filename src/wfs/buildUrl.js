import { WFS_BASE_URL, WFS_PARAMS } from '../config.js';

/**
 * @param {string} layer
 * @param {[number, number, number, number]} bbox
 */
export function buildWfsUrl(layer, bbox) {
  const params = new URLSearchParams({
    SERVICE: WFS_PARAMS.SERVICE,
    VERSION: WFS_PARAMS.VERSION,
    REQUEST: 'GetFeature',
    TYPENAMES: `nora:${layer}`,
    BBOX: `${bbox.join(',')},${WFS_PARAMS.srsName}`,
    COUNT: WFS_PARAMS.COUNT,
    outputFormat: WFS_PARAMS.outputFormat,
  });
  return `${WFS_BASE_URL}?${params.toString()}`;
}
