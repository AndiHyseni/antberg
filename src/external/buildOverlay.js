import fs from 'fs/promises';
import path from 'path';
import { GFZ_BBOX } from './config.js';
import { buildGfzOverlayForParcels } from './fetchGfz.js';
import { buildHeatingOverlayForParcels } from './fetchHeating.js';

/**
 * @param {Map<string, Record<string, unknown>>} target
 * @param {Map<string, Record<string, unknown>>} source
 */
function mergeOverlayMaps(target, source) {
  for (const [key, row] of source) {
    target.set(key, { ...(target.get(key) ?? {}), ...row });
  }
}

/**
 * @param {import('./types.js').ParcelWithBuildings[]} parcels
 * @param {{
 *   gfz?: boolean,
 *   heating?: boolean,
 *   heatingFile?: string,
 *   rebuildCache?: boolean,
 *   maxFnpTiles?: number,
 *   outputPath?: string,
 * }} options
 */
export async function buildExternalOverlay(parcels, options) {
  /** @type {Map<string, Record<string, unknown>>} */
  const merged = new Map();

  const outputPath =
    options.outputPath ?? path.join('output', '_external-overlay.json');

  if (options.mergeExisting !== false) {
    try {
      const existing = JSON.parse(await fs.readFile(outputPath, 'utf8'));
      for (const row of existing.properties ?? []) {
        const key = String(row.flurstueckskennzeichen ?? '').trim();
        if (key) merged.set(key, row);
      }
    } catch {
      // no prior overlay
    }
  }

  if (options.gfz !== false) {
    const gfz = await buildGfzOverlayForParcels(parcels, {
      maxTiles: options.maxFnpTiles,
    });
    mergeOverlayMaps(merged, gfz);
  }

  if (options.heating !== false) {
    const heating = await buildHeatingOverlayForParcels(parcels, GFZ_BBOX, {
      heatingFile: options.heatingFile,
      rebuildCache: options.rebuildCache,
    });
    mergeOverlayMaps(merged, heating);
  }

  const rows = Array.from(merged.values());

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(
    outputPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        sources: {
          gfz: 'geoportal-raumordnung-bw WFS xplan:FP_BebauungsFlaeche + BauNVO §17',
          heating: options.heatingFile
            ? options.heatingFile
            : 'waermeatlas-bw.need.energy (pygeoapi)',
        },
        note:
          'GFZ values are FNP BauNVO orientierungswerte, not Bebauungsplan festsetzungen. Bebauungsplan GFZ may differ where a BPL applies.',
        properties: rows,
      },
      null,
      2
    ),
    'utf8'
  );

  console.log(`External overlay: ${rows.length} parcel(s) → ${outputPath}`);
  return { path: outputPath, map: merged, rows };
}

/**
 * @param {Record<string, unknown>[]} parcelRows
 * @param {Record<string, unknown>[]} buildingRows
 * @param {Map<string, import('../filter/types.js').ParcelCandidate>|Map<string, Record<string, unknown>>} indexed
 */
export function parcelsForExternalFetch(parcelRows, buildingRows, indexed) {
  const first = indexed.values().next().value;
  if (first && typeof first === 'object' && 'buildings' in first && 'parcel_m2' in first) {
    return /** @type {import('./types.js').ParcelWithBuildings[]} */ (
      Array.from(indexed.values()).map((parcel) => ({
        flurstueckskennzeichen: parcel.flurstueckskennzeichen,
        parcel_m2: parcel.parcel_m2,
        centroid_x: parcel.centroid_x,
        centroid_y: parcel.centroid_y,
        buildings: parcel.buildings.map((b) => ({ gml_id: b.gml_id })),
      }))
    );
  }

  /** @type {Map<string, import('./types.js').ParcelWithBuildings>} */
  const byKey = new Map();

  for (const row of parcelRows) {
    const key = String(row.flurstueckskennzeichen ?? '').trim();
    if (!key) continue;
    byKey.set(key, {
      flurstueckskennzeichen: key,
      parcel_m2: Number(row.amtliche_flaeche ?? row.parcel_m2) || 0,
      centroid_x: Number(row.centroid_x),
      centroid_y: Number(row.centroid_y),
      buildings: [],
    });
  }

  for (const building of buildingRows) {
    const cx = Number(building.centroid_x);
    const cy = Number(building.centroid_y);
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) continue;

    let best = null;
    let bestDist = Infinity;
    for (const parcel of byKey.values()) {
      const dx = cx - parcel.centroid_x;
      const dy = cy - parcel.centroid_y;
      const dist = Math.hypot(dx, dy);
      if (dist < bestDist) {
        bestDist = dist;
        best = parcel;
      }
    }

    if (best && bestDist <= Math.sqrt(best.parcel_m2 / Math.PI) * 1.5) {
      best.buildings.push({ gml_id: building.gml_id });
    }
  }

  return Array.from(byKey.values()).filter((p) => p.parcel_m2 > 0);
}
