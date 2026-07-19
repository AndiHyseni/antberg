import fs from 'fs';
import ExcelJS from 'exceljs';
import path from 'path';

/**
 * @param {string} filePath
 * @param {string} [preferredSheet]
 */
export async function readExcelRows(filePath, preferredSheet) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet =
    (preferredSheet && workbook.getWorksheet(preferredSheet)) ||
    workbook.worksheets.find((ws) => ws.name !== '_metadata') ||
    workbook.worksheets[0];

  if (!sheet) {
    throw new Error(`No data sheet in ${filePath}`);
  }

  const headerRow = sheet.getRow(1);
  const columns = headerRow.values
    .slice(1)
    .map((value) => (value == null ? null : String(value)))
    .filter(Boolean);

  /** @type {Record<string, unknown>[]} */
  const rows = [];

  for (let rowIndex = 2; rowIndex <= sheet.rowCount; rowIndex += 1) {
    const row = sheet.getRow(rowIndex);
    /** @type {Record<string, unknown>} */
    const record = {};
    let hasValue = false;

    columns.forEach((column, columnIndex) => {
      const value = row.getCell(columnIndex + 1).value;
      if (value != null && value !== '') {
        hasValue = true;
      }
      record[column] = value;
    });

    if (hasValue) rows.push(record);
  }

  return { sheetName: sheet.name, columns, rows };
}

/**
 * Stream rows from large workbooks without loading the full sheet into memory.
 * @param {string} filePath
 * @param {string} [preferredSheet]
 * @param {string[]} [columnsToKeep]
 */
export async function* streamExcelRows(filePath, preferredSheet, columnsToKeep) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const keep = columnsToKeep ? new Set(columnsToKeep) : null;
  const workbook = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
    worksheets: 'emit',
    sharedStrings: 'cache',
    hyperlinks: 'ignore',
    styles: 'ignore',
  });

  /** @type {string[]|null} */
  let columns = null;

  for await (const worksheet of workbook) {
    const sheetName = worksheet.name ?? worksheet.id;
    if (
      preferredSheet &&
      sheetName !== preferredSheet &&
      sheetName !== preferredSheet.slice(0, 31)
    ) {
      continue;
    }

    for await (const row of worksheet) {
      if (row.number === 1) {
        columns = row.values
          .slice(1)
          .map((value) => (value == null ? null : String(value)))
          .filter(Boolean);
        continue;
      }

      if (!columns?.length) continue;

      /** @type {Record<string, unknown>} */
      const record = {};
      let hasValue = false;

      columns.forEach((column, columnIndex) => {
        if (keep && !keep.has(column)) return;
        const value = row.values[columnIndex + 1];
        if (value != null && value !== '') hasValue = true;
        record[column] = value;
      });

      if (hasValue) yield record;
    }

    break;
  }
}

/**
 * @param {string} inputDir
 * @param {string} layer
 */
export function layerExcelPath(inputDir, layer) {
  return path.join(inputDir, `${layer}.xlsx`);
}

/**
 * @param {string} filePath
 */
export function layerFileExists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * @param {string} filePath
 * @param {string} layer
 * @param {(row: Record<string, unknown>) => void} onRow
 */
export async function streamLayerRows(filePath, layer, onRow) {
  if (!layerFileExists(filePath)) return 0;

  let count = 0;
  for await (const row of streamExcelRows(filePath, layer)) {
    onRow(row);
    count += 1;
  }
  return count;
}
