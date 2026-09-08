import type { Worksheet } from "exceljs";

export const CURRENCY_FORMAT = '"Rs. "#,##0.00';
export const QTY_FORMAT = "#,##0.###";
export const DATE_FORMAT = "yyyy-mm-dd";

export function styleHeaderRow(sheet: Worksheet, rowNumber = 1) {
  const row = sheet.getRow(rowNumber);
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F2937" },
  };
  row.alignment = { vertical: "middle" };
  row.height = 20;
  row.commit();
}

export function styleTitleRow(sheet: Worksheet, rowNumber = 1) {
  const row = sheet.getRow(rowNumber);
  row.font = { bold: true, size: 13 };
  row.height = 22;
}

export function addTotalsRow(
  sheet: Worksheet,
  label: string,
  values: (number | string | null)[],
  labelColSpan = 1
) {
  const row = sheet.addRow([label, ...Array(labelColSpan - 1).fill(""), ...values]);
  row.font = { bold: true };
  row.eachCell((cell) => {
    cell.border = { top: { style: "thin", color: { argb: "FF9CA3AF" } } };
  });
  return row;
}
