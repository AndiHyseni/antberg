import ExcelJS from 'exceljs';
import fs from 'fs';
import {
  EXCEL_MAX_ROWS,
  LICENSE_ATTRIBUTION,
  WFS_BASE_URL,
} from '../config.js';

const METADATA_SHEET = '_metadata';
const DATA_ROW_LIMIT = EXCEL_MAX_ROWS - 1;

/**
 * @param {string} name
 */
export function sanitizeSheetName(name) {
  const cleaned = name.replace(/[\\/*?:[\]]/g, '_').slice(0, 31);
  return cleaned || 'sheet';
}

/**
 * @param {string} layer
 */
export function layerOutputFilename(layer, partIndex = 0) {
  const suffix = partIndex > 0 ? `_p${partIndex + 1}` : '';
  return `${layer}${suffix}.xlsx`;
}

/**
 * @param {Record<string, unknown>[]} rows
 */
function collectColumns(rows) {
  const cols = new Set(['feature_id', 'centroid_x', 'centroid_y', 'geometry_wkt']);
  for (const row of rows) {
    for (const key of Object.keys(row)) cols.add(key);
  }
  return Array.from(cols);
}

/**
 * Write one layer to a standalone .xlsx file (finalized immediately).
 * @param {{
 *   outputPath: string,
 *   layer: string,
 *   rows: Record<string, unknown>[],
 *   exportInfo?: Record<string, unknown>,
 * }} options
 * @returns {Promise<{ outputPath: string, rowCount: number, parts: number }>}
 */
export async function writeLayerExcel(options) {
  const { outputPath, layer, rows, exportInfo = {} } = options;

  /** @type {import('fs').WriteStream} */
  const stream = fs.createWriteStream(outputPath);
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    stream,
    useSharedStrings: true,
    useStyles: false,
  });

  const metaSheet = workbook.addWorksheet(METADATA_SHEET);
  metaSheet.addRow(['key', 'value']).commit();
  metaSheet.addRow(['attribution', LICENSE_ATTRIBUTION]).commit();
  metaSheet.addRow(['wfs_base_url', WFS_BASE_URL]).commit();
  metaSheet.addRow(['layer', layer]).commit();
  metaSheet.addRow(['exported_at', new Date().toISOString()]).commit();
  for (const [key, value] of Object.entries(exportInfo)) {
    metaSheet
      .addRow([key, typeof value === 'object' ? JSON.stringify(value) : value])
      .commit();
  }
  metaSheet.commit();

  let rowCount = 0;
  let parts = 0;

  if (!rows.length) {
    const sheet = workbook.addWorksheet(sanitizeSheetName(layer));
    sheet.addRow(['message']).commit();
    sheet.addRow(['No features for Stuttgart in this layer']).commit();
    sheet.commit();
  } else {
    const columns = collectColumns(rows);
    const chunks = [];
    for (let i = 0; i < rows.length; i += DATA_ROW_LIMIT) {
      chunks.push(rows.slice(i, i + DATA_ROW_LIMIT));
    }

    parts = chunks.length;
    chunks.forEach((chunk, idx) => {
      const suffix = chunks.length > 1 ? `_p${idx + 1}` : '';
      const sheetName = sanitizeSheetName(`${layer}${suffix}`);
      const sheet = workbook.addWorksheet(sheetName);
      sheet.addRow(columns).commit();
      for (const row of chunk) {
        sheet.addRow(columns.map((c) => row[c] ?? null)).commit();
      }
      sheet.commit();
      rowCount += chunk.length;
    });
  }

  const streamDone = new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  await workbook.commit();
  await streamDone;

  return { outputPath, rowCount, parts };
}
