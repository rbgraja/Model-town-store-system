import "server-only";
import ExcelJS from "exceljs";
import { QTY_FORMAT, CURRENCY_FORMAT, styleHeaderRow } from "./styles";
import { groupProductsByCategory, type ReportData } from "./report-data";
import { departmentInScope, type ReportScope } from "./department-groups";
import {
  buildDepartmentsSummarySheet,
  buildPerDepartmentSheets,
  RS_FORMAT,
} from "./build-template-sheets";
import { buildDepartmentStockSheet, buildOutgoingSheet } from "./build-range-workbook";

/**
 * Same monthly data, narrowed to a set of departments. Purchases (incoming)
 * belong to the store, not to a department, so they are left out; everything
 * shown is what the chosen departments received, what it cost, and what they
 * still hold.
 */
export function scopeReportData(data: ReportData, scope: ReportScope): ReportData {
  return {
    ...data,
    incomingRows: [],
    outgoingRows: data.outgoingRows.filter((r) => departmentInScope(r.department_name, scope)),
    departmentSummary: data.departmentSummary.filter((r) =>
      departmentInScope(r.department_name, scope)
    ),
    departmentStock: data.departmentStock.filter((r) =>
      departmentInScope(r.department_name, scope)
    ),
  };
}

export function buildGroupWorkbook(
  data: ReportData,
  scope: ReportScope,
  label: string,
  periodLabel: string
): ExcelJS.Workbook {
  const scoped = scopeReportData(data, scope);
  const opts = { title: `${label} — ${periodLabel}`, periodLabel: `${label} — ${periodLabel}` };

  const wb = new ExcelJS.Workbook();
  wb.creator = "Store Management System";
  wb.created = new Date();

  buildProductSummarySheet(wb, scoped, opts.periodLabel);
  buildDepartmentsSummarySheet(wb, scoped, opts);
  buildPerDepartmentSheets(wb, scoped, opts);
  buildOutgoingSheet(wb, scoped);
  buildDepartmentStockSheet(wb, scoped);
  return wb;
}

// Per product: what these departments received, the average unit cost, and the
// money — category-banded like the main Store In & Out sheet.
function buildProductSummarySheet(wb: ExcelJS.Workbook, data: ReportData, title: string) {
  const sheet = wb.addWorksheet("Summary");
  const totalCols = 7;

  sheet.mergeCells(1, 1, 1, totalCols);
  const t = sheet.getCell(1, 1);
  t.value = `OUTGOING SUMMARY   (${title})`;
  t.font = { bold: true, size: 14 };
  t.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 28;

  sheet.addRow([
    "S.No",
    "CATEGORY",
    "PRODUCT NAME",
    "P.UNIT",
    "Outgoing Qty",
    "Outgoing Unit Cost (Avg)",
    "Outgoing Expense",
  ]);
  styleHeaderRow(sheet, 2);
  sheet.getRow(2).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  sheet.getRow(2).height = 32;

  const perProduct = new Map<string, { unit: string; qty: number; cost: number }>();
  for (const r of data.outgoingRows) {
    const e = perProduct.get(r.product_name);
    if (e) {
      e.qty += r.quantity;
      e.cost += r.total_cost;
    } else {
      perProduct.set(r.product_name, { unit: r.unit, qty: r.quantity, cost: r.total_cost });
    }
  }

  // Reuse the store's category grouping so colours/order match the main sheet.
  const groups = groupProductsByCategory(data.productSummary);
  let sno = 1;
  let totQty = 0;
  let totCost = 0;
  for (const g of groups) {
    const items = g.products.filter((p) => perProduct.has(p.product_name));
    if (items.length === 0) continue;
    const banner = sheet.addRow([
      "",
      `${g.categoryName.toUpperCase()}  —  ${items.length} product${items.length === 1 ? "" : "s"}`,
    ]);
    sheet.mergeCells(banner.number, 2, banner.number, totalCols);
    banner.font = { bold: true, size: 11 };
    banner.height = 22;
    banner.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    banner.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + g.categoryColor } };

    for (const p of items) {
      const agg = perProduct.get(p.product_name)!;
      const row = sheet.addRow([
        sno++,
        g.categoryName,
        p.product_name,
        agg.unit,
        agg.qty,
        agg.qty > 0 ? agg.cost / agg.qty : null,
        agg.cost,
      ]);
      row.getCell(5).numFmt = QTY_FORMAT;
      row.getCell(6).numFmt = CURRENCY_FORMAT;
      row.getCell(7).numFmt = RS_FORMAT;
      totQty += agg.qty;
      totCost += agg.cost;
    }
  }

  const total = sheet.addRow(["", "", "GRAND TOTAL", "", totQty, "", totCost]);
  total.font = { bold: true, size: 12 };
  total.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
  total.getCell(5).numFmt = QTY_FORMAT;
  total.getCell(7).numFmt = RS_FORMAT;

  sheet.getColumn(1).width = 6;
  sheet.getColumn(2).width = 22;
  sheet.getColumn(3).width = 34;
  sheet.getColumn(4).width = 9;
  sheet.getColumn(5).width = 14;
  sheet.getColumn(6).width = 18;
  sheet.getColumn(7).width = 18;
  sheet.views = [{ state: "frozen", xSplit: 3, ySplit: 2 }];
}
