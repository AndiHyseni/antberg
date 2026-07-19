import fs from 'fs/promises';
import {
  MAX_PARCEL_M2,
  MAX_UTILIZATION_RATIO,
  MIN_PARCEL_M2,
  RECENT_RENOVATION_YEARS,
} from './config.js';
import { isOnlyNonDevelopableLandUse } from './join.js';

/**
 * @param {string} filePath
 * @returns {Promise<Map<string, import('./types.js').PropertyOverlay>>}
 */
export async function loadOverlay(filePath) {
  const text = await fs.readFile(filePath, 'utf8');
  /** @type {Map<string, import('./types.js').PropertyOverlay>} */
  const map = new Map();

  if (filePath.endsWith('.json')) {
    const parsed = JSON.parse(text);
    const entries = Array.isArray(parsed) ? parsed : parsed.properties ?? [];
    for (const entry of entries) {
      const key = String(
        entry.flurstueckskennzeichen ?? entry.flurstueck ?? entry.id ?? ''
      ).trim();
      if (key) map.set(key, entry);
    }
    return map;
  }

  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(',').map((part) => part.trim());
  const keyIndex = header.indexOf('flurstueckskennzeichen');

  for (let i = 1; i < lines.length; i += 1) {
    const parts = lines[i].split(',');
    const key = String(parts[keyIndex >= 0 ? keyIndex : 0] ?? '').trim();
    if (!key) continue;

    /** @type {import('./types.js').PropertyOverlay} */
    const overlay = {};
    header.forEach((column, index) => {
      if (index === keyIndex) return;
      const raw = parts[index]?.trim();
      if (!raw) return;
      if (raw === 'true' || raw === 'false') {
        overlay[column] = raw === 'true';
        return;
      }
      const num = Number(raw);
      overlay[column] = Number.isFinite(num) ? num : raw;
    });
    map.set(key, overlay);
  }

  return map;
}

/**
 * @param {import('./types.js').ParcelCandidate} parcel
 * @param {import('./types.js').PropertyOverlay|undefined} overlay
 * @param {number} currentYear
 */
export function passesHardFilters(parcel, overlay, currentYear) {
  if (parcel.parcel_m2 < MIN_PARCEL_M2) {
    return { pass: false, reason: `parcel < ${MIN_PARCEL_M2} m²` };
  }

  if (parcel.parcel_m2 > MAX_PARCEL_M2) {
    return { pass: false, reason: `parcel > ${MAX_PARCEL_M2} m²` };
  }

  const residentialCount = parcel.buildings.filter((b) => b.is_residential).length;
  if (residentialCount === 0) {
    return { pass: false, reason: 'no residential building on parcel' };
  }

  if (overlay?.heritage_protected === true || parcel.heritage_detected) {
    return { pass: false, reason: 'heritage protected' };
  }

  if (isOnlyNonDevelopableLandUse(parcel)) {
    return { pass: false, reason: 'land use is non-developable (forest/road/agriculture only)' };
  }

  if (overlay?.allows_densification === false) {
    return { pass: false, reason: 'zoning does not allow densification' };
  }

  const allowedGfa = overlay?.allowed_gfa;
  const builtGfa = overlay?.built_gfa;
  if (
    allowedGfa != null &&
    builtGfa != null &&
    allowedGfa > 0 &&
    builtGfa / allowedGfa >= MAX_UTILIZATION_RATIO
  ) {
    return { pass: false, reason: 'uses >=75% of allowed volume' };
  }

  const lastRenovation = overlay?.last_renovation_year;
  if (
    lastRenovation != null &&
    currentYear - lastRenovation < RECENT_RENOVATION_YEARS
  ) {
    return { pass: false, reason: `major renovation within ${RECENT_RENOVATION_YEARS} years` };
  }

  return { pass: true, reason: null };
}
