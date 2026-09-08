import "server-only";
import type { Workbook, Worksheet } from "exceljs";
import { CURRENCY_FORMAT, QTY_FORMAT, styleHeaderRow } from "./styles";
import { dateRange, groupProductsByCategory, type ReportData } from "./report-data";
import type { ProductReportSummaryRow } from "@/lib/types/database";

/**
 * Custom operator-facing sheets that mirror the hand-kept monthly ledger
 * (see AUG INVENTRY STOCK HOUSE KEEPING.xlsx and KITCHEN CONSUMPTION
 * REPORT.xlsx) and add every money column the paper register was missing.
 *
 * Every product-listing sheet is now GROUPED BY CATEGORY with a coloured
 * banner row for each category, so the eye can find bread / meat / dairy
 * at a glance the same way the paper register does with its "Vegetables",
 * "Dishwashing", "Bread" and "Meat" section titles. Rows for products
 * with no movement in the period are still emitted — cells stay blank, and
 * an "OUT OF STOCK" note appears on the status column when closing_qty is
 * zero — so the sheet is a canonical roster of every product every month,
 * not just the ones that happened to move.
 *
 * Sheets, in order:
 *
 *   1. Store In & Out — per-product summary with money: opening qty+value,
 *      incoming qty+expense, outgoing qty+expense (consumption), closing
 *      qty+value. Category-banded. Grand-total row at the bottom.
 *   2. Outward Matrix — products × days-of-month, cell = qty issued that
 *      day. Category-banded. Opening / Closing formulas on the sides.
 *   3. Inward Matrix — same shape for purchases.
 *   4. Departments Summary — one row per (date, department, product) with
 *      quantity + expense. Grouped subtotal per department at the bottom.
 *   5+. Dept: <name> — one sheet per department: header naming the
 *      department, then every issue to that department in date order with
 *      qty + expense, totalled at the bottom.
 */

interface Options {
  title: string;
  periodLabel: string;
}

// Rupee currency format — the operator's ledger is denominated in PKR.
// Re-exported from styles.ts so there's a single source of truth (both
// names kept so every existing call site in this file still resolves).
export const RS_FORMAT = CURRENCY_FORMAT;

// -----------------------------------------------------------------------------
// Sheet 1 — Store In & Out (monetary summary per product, grouped by category)
// -----------------------------------------------------------------------------
export function buildStoreOverviewSheet(wb: Workbook, data: ReportData, opts: Options) {
  const sheet = wb.addWorksheet("Store In & Out");
  const totalCols = 13; // added a Category column at position 2

  sheet.mergeCells(1, 1, 1, totalCols);
  const title = sheet.getCell(1, 1);
  title.value = `STORE INCOMING & OUTGOING SUMMARY   (${opts.periodLabel})`;
  title.font = { bold: true, size: 14 };
  title.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 28;

  sheet.addRow([
    "S.No",
    "CATEGORY",
    "PRODUCT NAME",
    "P.UNIT",
    "Opening Qty",
    "Opening Value",
    "Incoming Qty",
    "Incoming Expense",
    "Outgoing Qty",
    "Outgoing Expense (Consumption)",
    "Closing Qty",
    "Closing Value",
    "Status",
  ]);
  styleHeaderRow(sheet, 2);
  sheet.getRow(2).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  sheet.getRow(2).height = 32;

  const groups = groupProductsByCategory(data.productSummary);

  let sno = 1;
  const firstDataRow = sheet.rowCount + 1;
  let totOpenQty = 0,
    totOpenVal = 0,
    totInQty = 0,
    totInExp = 0,
    totOutQty = 0,
    totOutExp = 0,
    totCloseQty = 0,
    totCloseVal = 0;

  for (const group of groups) {
    // Coloured category banner spanning the whole row
    const banner = sheet.addRow([
      "",
      `${group.categoryName.toUpperCase()}  —  ${group.products.length} product${group.products.length === 1 ? "" : "s"}`,
    ]);
    sheet.mergeCells(banner.number, 2, banner.number, totalCols);
    banner.font = { bold: true, size: 11 };
    banner.height = 22;
    banner.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    banner.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF" + group.categoryColor },
    };

    for (const p of group.products) {
      const openingQty = Number(p.opening_qty);
      const openingVal = Number(p.opening_value);
      const inQty = Number(p.incoming_qty);
      const inExp = Number(p.incoming_expense);
      const outQty = Number(p.outgoing_qty);
      const outExp = Number(p.outgoing_expense);
      const closeQty = Number(p.closing_qty);
      const closeVal = Number(p.closing_value);
      const hasAnyMovement =
        openingQty > 0 || inQty > 0 || outQty > 0 || closeQty > 0;
      const status =
        closeQty > 0 ? "IN STOCK" : hasAnyMovement ? "DEPLETED" : "OUT OF STOCK";
      const row = sheet.addRow([
        sno++,
        group.categoryName,
        p.product_name,
        p.unit,
        openingQty || null,
        openingVal || null,
        inQty || null,
        inExp || null,
        outQty || null,
        outExp || null,
        closeQty || null,
        closeVal || null,
        status,
      ]);
      // faint tint on data rows to keep grouping visible while scrolling
      row.getCell(2).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: hexWithAlpha(group.categoryColor, 0.35) },
      };
      row.getCell(5).numFmt = QTY_FORMAT;
      row.getCell(6).numFmt = RS_FORMAT;
      row.getCell(7).numFmt = QTY_FORMAT;
      row.getCell(8).numFmt = RS_FORMAT;
      row.getCell(9).numFmt = QTY_FORMAT;
      row.getCell(10).numFmt = RS_FORMAT;
      row.getCell(11).numFmt = QTY_FORMAT;
      row.getCell(12).numFmt = RS_FORMAT;
      // status column tint
      if (status === "OUT OF STOCK") {
        row.getCell(13).font = { color: { argb: "FFB91C1C" }, bold: true };
        row.getCell(13).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFEE2E2" },
        };
      } else if (status === "DEPLETED") {
        row.getCell(13).font = { color: { argb: "FF92400E" } };
        row.getCell(13).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFEF3C7" },
        };
      } else {
        row.getCell(13).font = { color: { argb: "FF065F46" } };
        row.getCell(13).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFD1FAE5" },
        };
      }
      totOpenQty += openingQty;
      totOpenVal += openingVal;
      totInQty += inQty;
      totInExp += inExp;
      totOutQty += outQty;
      totOutExp += outExp;
      totCloseQty += closeQty;
      totCloseVal += closeVal;
    }
  }
  const lastDataRow = sheet.rowCount;

  // Grand-total row
  const totalRow = sheet.addRow([
    "",
    "",
    "GRAND TOTAL",
    "",
    totOpenQty,
    totOpenVal,
    totInQty,
    totInExp,
    totOutQty,
    totOutExp,
    totCloseQty,
    totCloseVal,
    "",
  ]);
  totalRow.font = { bold: true, size: 12 };
  totalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
  totalRow.getCell(5).numFmt = QTY_FORMAT;
  totalRow.getCell(6).numFmt = RS_FORMAT;
  totalRow.getCell(7).numFmt = QTY_FORMAT;
  totalRow.getCell(8).numFmt = RS_FORMAT;
  totalRow.getCell(9).numFmt = QTY_FORMAT;
  totalRow.getCell(10).numFmt = RS_FORMAT;
  totalRow.getCell(11).numFmt = QTY_FORMAT;
  totalRow.getCell(12).numFmt = RS_FORMAT;
  totalRow.eachCell((cell) => {
    cell.border = {
      top: { style: "double", color: { argb: "FF6B7280" } },
      bottom: { style: "double", color: { argb: "FF6B7280" } },
    };
  });

  // Money callouts summary block below
  sheet.addRow([]);
  const callouts: [string, number | string, string?][] = [
    ["Total Money Spent on Purchases (Incoming)", totInExp, RS_FORMAT],
    ["Total Consumption Expense (Outgoing)", totOutExp, RS_FORMAT],
    ["Opening Stock Value", totOpenVal, RS_FORMAT],
    ["Closing Stock Value", totCloseVal, RS_FORMAT],
    ["Net Cash Movement (Purchases − Consumption)", totInExp - totOutExp, RS_FORMAT],
    ["Products Listed", data.productSummary.length],
    ["Categories", groups.length],
    ["Incoming Entries", data.incomingRows.length],
    ["Outgoing Entries", data.outgoingRows.length],
  ];
  for (const [label, value, fmt] of callouts) {
    const r = sheet.addRow(["", "", label, "", value]);
    r.getCell(3).font = { bold: true };
    r.getCell(5).font = { bold: true };
    if (fmt) r.getCell(5).numFmt = fmt;
    sheet.mergeCells(r.number, 3, r.number, 4);
  }

  sheet.getColumn(1).width = 5;
  sheet.getColumn(2).width = 22;
  sheet.getColumn(3).width = 32;
  sheet.getColumn(4).width = 8;
  for (let c = 5; c <= 12; c++) sheet.getColumn(c).width = 15;
  sheet.getColumn(13).width = 14;

  sheet.views = [{ state: "frozen", xSplit: 4, ySplit: 2 }];
  addThinBorders(sheet, 2, lastDataRow, 1, totalCols);
  void firstDataRow; // reserved for future subtotal formulas
}

// -----------------------------------------------------------------------------
// Outward Matrix
// -----------------------------------------------------------------------------
export function buildOutwardMatrixSheet(wb: Workbook, data: ReportData, opts: Options) {
  const sheet = wb.addWorksheet("Outward (Day Matrix)");
  const dates = [...dateRange(data.from, data.to)];
  buildMatrixSheet(sheet, data, dates, opts, "OUT", "outgoing");
}

// -----------------------------------------------------------------------------
// Inward Matrix
// -----------------------------------------------------------------------------
export function buildInwardMatrixSheet(wb: Workbook, data: ReportData, opts: Options) {
  const sheet = wb.addWorksheet("Inward (Day Matrix)");
  const dates = [...dateRange(data.from, data.to)];
  buildMatrixSheet(sheet, data, dates, opts, "IN", "incoming");
}

function buildMatrixSheet(
  sheet: Worksheet,
  data: ReportData,
  dates: string[],
  opts: Options,
  label: "IN" | "OUT",
  mode: "incoming" | "outgoing"
) {
  if (sheet.workbook && sheet.workbook.calcProperties) {
    sheet.workbook.calcProperties.fullCalcOnLoad = true;
  }
  const dayCount = dates.length;
  // Columns: S.No | Category | Product | Unit | Opening | day1..dayN | Total | Expense | Closing
  const totalCols = 5 + dayCount + 3;
  const totalQtyCol = 5 + dayCount + 1;
  const expenseCol = 5 + dayCount + 2;
  const closingCol = 5 + dayCount + 3;

  sheet.mergeCells(1, 1, 1, totalCols);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = `MONTHLY STOCK INVENTRY ( ${label === "OUT" ? "OUTWARD" : "INWARD"} )   (${opts.periodLabel})`;
  titleCell.font = { bold: true, size: 13 };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 26;

  const headerRow: (string | number)[] = [
    "S.No",
    "CATEGORY",
    "PRODUCT NAME",
    "P.UNIT",
    "Opening stock",
  ];
  for (const d of dates) headerRow.push(dayOf(d));
  headerRow.push(label === "OUT" ? "TOTAL OUT" : "TOTAL IN");
  headerRow.push(label === "OUT" ? "OUT EXPENSE" : "IN EXPENSE");
  headerRow.push("CLOSING STOCK");
  sheet.addRow(headerRow);
  styleHeaderRow(sheet, 2);

  const perDay = new Map<string, number>();
  const rows = mode === "outgoing" ? data.outgoingRows : data.incomingRows;
  const nameToId = new Map<string, string>();
  for (const p of data.productSummary) nameToId.set(p.product_name, p.product_id);

  for (const r of rows) {
    const pid = nameToId.get(r.product_name);
    if (!pid) continue;
    const key = `${pid}|${r.entry_date}`;
    perDay.set(key, (perDay.get(key) ?? 0) + Number(r.quantity));
  }

  const groups = groupProductsByCategory(data.productSummary);

  let sno = 1;
  const firstDataRow = sheet.rowCount + 1;
  for (const group of groups) {
    // Category banner across every column
    const banner = sheet.addRow([
      "",
      `${group.categoryName.toUpperCase()}  —  ${group.products.length} product${group.products.length === 1 ? "" : "s"}`,
    ]);
    sheet.mergeCells(banner.number, 2, banner.number, totalCols);
    banner.font = { bold: true, size: 11 };
    banner.height = 22;
    banner.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    banner.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF" + group.categoryColor },
    };

    for (const p of group.products) {
      const opening = Number(p.opening_qty);
      const expense = mode === "outgoing" ? Number(p.outgoing_expense) : Number(p.incoming_expense);
      const rowValues: (string | number | null)[] = [
        sno++,
        group.categoryName,
        p.product_name,
        p.unit || "",
        opening || null,
      ];
      let sumDaily = 0;
      for (const d of dates) {
        const v = perDay.get(`${p.product_id}|${d}`) ?? 0;
        rowValues.push(v > 0 ? v : null);
        sumDaily += v;
      }
      rowValues.push(null, expense || null, null); // Total, Expense, Closing placeholders
      const row = sheet.addRow(rowValues);
      // category tint on the category column
      row.getCell(2).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: hexWithAlpha(group.categoryColor, 0.35) },
      };
      const openingAddr = row.getCell(5).address;
      const firstDayAddr = row.getCell(6).address;
      const lastDayAddr = row.getCell(5 + dayCount).address;
      row.getCell(totalQtyCol).value = {
        formula: `SUM(${firstDayAddr}:${lastDayAddr})`,
        result: sumDaily,
      };
      row.getCell(closingCol).value = {
        formula:
          mode === "outgoing"
            ? `${openingAddr}-${row.getCell(totalQtyCol).address}`
            : `${openingAddr}+${row.getCell(totalQtyCol).address}`,
        result: mode === "outgoing" ? opening - sumDaily : opening + sumDaily,
      };
      row.getCell(totalQtyCol).font = { bold: true };
      row.getCell(closingCol).font = { bold: true };
      row.getCell(expenseCol).numFmt = RS_FORMAT;
      row.getCell(expenseCol).font = { bold: true };
    }
  }
  const lastDataRow = sheet.rowCount;

  // Column-total row
  sheet.addRow([]);
  const totalsRow = sheet.addRow(["", "", `TOTAL ${label}`, "", ""]);
  totalsRow.font = { bold: true };
  totalsRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
  for (let c = 6; c <= closingCol; c++) {
    const colLetter = totalsRow.getCell(c).address.replace(/\d+/g, "");
    let colSum = 0;
    for (let r = firstDataRow; r <= lastDataRow; r++) {
      const v = sheet.getCell(r, c).value as unknown;
      if (typeof v === "number") colSum += v;
      else if (v && typeof v === "object" && "result" in (v as Record<string, unknown>)) {
        const res = (v as { result?: unknown }).result;
        if (typeof res === "number") colSum += res;
      }
    }
    totalsRow.getCell(c).value = {
      formula: `SUM(${colLetter}${firstDataRow}:${colLetter}${lastDataRow})`,
      result: colSum,
    };
  }
  totalsRow.getCell(expenseCol).numFmt = RS_FORMAT;

  sheet.getColumn(1).width = 5;
  sheet.getColumn(2).width = 22;
  sheet.getColumn(3).width = 28;
  sheet.getColumn(4).width = 8;
  sheet.getColumn(5).width = 12;
  for (let c = 6; c <= 5 + dayCount; c++) sheet.getColumn(c).width = 5;
  sheet.getColumn(totalQtyCol).width = 11;
  sheet.getColumn(expenseCol).width = 16;
  sheet.getColumn(closingCol).width = 14;
  for (let c = 5; c <= totalCols; c++) {
    if (c !== expenseCol) sheet.getColumn(c).numFmt = QTY_FORMAT;
  }

  sheet.views = [{ state: "frozen", xSplit: 5, ySplit: 2 }];
  addThinBorders(sheet, 2, lastDataRow, 1, totalCols);
}

// -----------------------------------------------------------------------------
// Sheet 4 — Departments Summary (which day, which dept, which product, expense)
// -----------------------------------------------------------------------------
export function buildDepartmentsSummarySheet(wb: Workbook, data: ReportData, opts: Options) {
  const sheet = wb.addWorksheet("Departments Summary");
  const totalCols = 8;

  sheet.mergeCells(1, 1, 1, totalCols);
  const title = sheet.getCell(1, 1);
  title.value = `DEPARTMENTS — OUTWARD SUMMARY   (${opts.periodLabel})`;
  title.font = { bold: true, size: 14 };
  title.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 26;

  // ---------- A. per-department totals block ----------
  sheet.addRow([]);
  const totalsHead = sheet.addRow([
    "S.No",
    "DEPARTMENT",
    "",
    "Outgoing Qty",
    "Outgoing Expense",
    "Transactions",
    "% of Total Expense",
    "",
  ]);
  totalsHead.font = { bold: true };
  styleHeaderRow(sheet, totalsHead.number);

  const perDept = new Map<
    string,
    { qty: number; expense: number; txCount: number; productSet: Set<string> }
  >();
  for (const r of data.outgoingRows) {
    const key = r.department_name;
    const existing = perDept.get(key);
    if (existing) {
      existing.qty += Number(r.quantity);
      existing.expense += Number(r.total_cost);
      existing.txCount += 1;
      existing.productSet.add(r.product_name);
    } else {
      perDept.set(key, {
        qty: Number(r.quantity),
        expense: Number(r.total_cost),
        txCount: 1,
        productSet: new Set([r.product_name]),
      });
    }
  }
  const deptsSorted = [...perDept.entries()].sort((a, b) => b[1].expense - a[1].expense);
  const grandExpense = [...perDept.values()].reduce((a, b) => a + b.expense, 0) || 1;

  let sno = 1;
  for (const [dept, agg] of deptsSorted) {
    const r = sheet.addRow([
      sno++,
      dept,
      "",
      agg.qty,
      agg.expense,
      agg.txCount,
      agg.expense / grandExpense,
      "",
    ]);
    r.getCell(4).numFmt = QTY_FORMAT;
    r.getCell(5).numFmt = RS_FORMAT;
    r.getCell(7).numFmt = "0.0%";
    sheet.mergeCells(r.number, 2, r.number, 3);
  }
  const grandRow = sheet.addRow([
    "",
    "GRAND TOTAL",
    "",
    [...perDept.values()].reduce((a, b) => a + b.qty, 0),
    grandExpense === 1 && deptsSorted.length === 0 ? 0 : grandExpense,
    [...perDept.values()].reduce((a, b) => a + b.txCount, 0),
    "",
    "",
  ]);
  grandRow.font = { bold: true, size: 12 };
  grandRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
  grandRow.getCell(4).numFmt = QTY_FORMAT;
  grandRow.getCell(5).numFmt = RS_FORMAT;
  sheet.mergeCells(grandRow.number, 2, grandRow.number, 3);

  // ---------- B. detailed by (date, dept, product) ----------
  sheet.addRow([]);
  const detailTitle = sheet.addRow(["", "DAY × DEPARTMENT × PRODUCT DETAIL", "", "", "", "", "", ""]);
  detailTitle.font = { bold: true, size: 12 };
  sheet.mergeCells(detailTitle.number, 2, detailTitle.number, totalCols);

  const detailHead = sheet.addRow([
    "S.No",
    "Date",
    "Day",
    "Department",
    "Product",
    "Unit",
    "Quantity",
    "Expense",
  ]);
  styleHeaderRow(sheet, detailHead.number);

  const grouped = new Map<
    string,
    { date: string; dept: string; product: string; unit: string; qty: number; cost: number }
  >();
  for (const r of data.outgoingRows) {
    const k = `${r.entry_date}|${r.department_name}|${r.product_name}`;
    const existing = grouped.get(k);
    if (existing) {
      existing.qty += Number(r.quantity);
      existing.cost += Number(r.total_cost);
    } else {
      grouped.set(k, {
        date: r.entry_date,
        dept: r.department_name,
        product: r.product_name,
        unit: r.unit,
        qty: Number(r.quantity),
        cost: Number(r.total_cost),
      });
    }
  }
  const sorted = [...grouped.values()].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.dept !== b.dept) return a.dept.localeCompare(b.dept);
    return a.product.localeCompare(b.product);
  });

  let dsno = 1;
  let lastDate = "";
  for (const g of sorted) {
    const dateChanged = g.date !== lastDate;
    lastDate = g.date;
    const row = sheet.addRow([dsno++, g.date, dayName(g.date), g.dept, g.product, g.unit, g.qty, g.cost]);
    row.getCell(7).numFmt = QTY_FORMAT;
    row.getCell(8).numFmt = RS_FORMAT;
    if (dateChanged) {
      row.eachCell((cell) => {
        cell.border = { top: { style: "medium", color: { argb: "FF9CA3AF" } } };
      });
    }
  }

  sheet.getColumn(1).width = 6;
  sheet.getColumn(2).width = 14;
  sheet.getColumn(3).width = 10;
  sheet.getColumn(4).width = 22;
  sheet.getColumn(5).width = 28;
  sheet.getColumn(6).width = 8;
  sheet.getColumn(7).width = 13;
  sheet.getColumn(8).width = 16;

  sheet.views = [{ state: "frozen", ySplit: 2 }];
}

// -----------------------------------------------------------------------------
// Sheets 5+ — one per department, with its own detailed log + total expense
// (categorized per-product breakdown at the bottom)
// -----------------------------------------------------------------------------
export function buildPerDepartmentSheets(wb: Workbook, data: ReportData, opts: Options) {
  const perDept = new Map<
    string,
    ReturnType<() => Array<(typeof data.outgoingRows)[number]>>
  >();
  for (const r of data.outgoingRows) {
    const list = perDept.get(r.department_name) ?? [];
    list.push(r);
    perDept.set(r.department_name, list);
  }
  const deptNames = [...perDept.keys()].sort((a, b) => a.localeCompare(b));

  // Product-name → { categoryName, categoryColor, sort } lookup — for the
  // per-department breakdown to also colour rows by category.
  const productCategoryLookup = new Map<
    string,
    { name: string; color: string; sort: number }
  >();
  for (const p of data.productSummary) {
    productCategoryLookup.set(p.product_name, {
      name: p.category_name ?? "Uncategorized",
      color: p.category_color ?? "E5E7EB",
      sort: p.category_id ? (p.category_sort ?? 9999) : 99999,
    });
  }

  for (const dept of deptNames) {
    const rows = (perDept.get(dept) ?? []).slice().sort((a, b) => {
      if (a.entry_date !== b.entry_date) return a.entry_date.localeCompare(b.entry_date);
      if (a.product_name !== b.product_name) return a.product_name.localeCompare(b.product_name);
      return 0;
    });
    // Excel worksheet names cap at 31 chars and forbid : \ / ? * [ ]
    const safeName = ("Dept: " + dept).replace(/[:\\/?*[\]]/g, "-").slice(0, 31);
    const sheet = wb.addWorksheet(safeName);
    const totalCols = 8;

    sheet.mergeCells(1, 1, 1, totalCols);
    const title = sheet.getCell(1, 1);
    title.value = `DEPARTMENT: ${dept.toUpperCase()}   (${opts.periodLabel})`;
    title.font = { bold: true, size: 14 };
    title.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(1).height = 28;

    // Compact top-line block: total qty, total expense, transaction count, products
    const totalQty = rows.reduce((a, r) => a + Number(r.quantity), 0);
    const totalExp = rows.reduce((a, r) => a + Number(r.total_cost), 0);
    const productSet = new Set(rows.map((r) => r.product_name));
    sheet.addRow([]);
    const kpi = sheet.addRow([
      "",
      "Total Outgoing Qty",
      totalQty,
      "Total Expense",
      totalExp,
      "Transactions",
      rows.length,
      "",
    ]);
    kpi.font = { bold: true };
    kpi.getCell(3).numFmt = QTY_FORMAT;
    kpi.getCell(5).numFmt = RS_FORMAT;
    const kpi2 = sheet.addRow([
      "",
      "Distinct Products",
      productSet.size,
      "First Issue",
      rows[0]?.entry_date ?? "—",
      "Last Issue",
      rows[rows.length - 1]?.entry_date ?? "—",
      "",
    ]);
    kpi2.font = { bold: true };

    sheet.addRow([]);
    sheet.addRow([
      "S.No",
      "Date",
      "Day",
      "Product",
      "Unit",
      "Quantity",
      "Unit Cost",
      "Expense",
    ]);
    styleHeaderRow(sheet, sheet.rowCount);

    let sno = 1;
    let lastDate = "";
    for (const r of rows) {
      const dateChanged = r.entry_date !== lastDate;
      lastDate = r.entry_date;
      const row = sheet.addRow([
        sno++,
        r.entry_date,
        dayName(r.entry_date),
        r.product_name,
        r.unit,
        Number(r.quantity),
        Number(r.unit_cost),
        Number(r.total_cost),
      ]);
      row.getCell(6).numFmt = QTY_FORMAT;
      row.getCell(7).numFmt = RS_FORMAT;
      row.getCell(8).numFmt = RS_FORMAT;
      if (dateChanged) {
        row.eachCell((cell) => {
          cell.border = { top: { style: "medium", color: { argb: "FF9CA3AF" } } };
        });
      }
    }

    // Totals row
    sheet.addRow([]);
    const totRow = sheet.addRow(["", "TOTAL", "", "", "", totalQty, "", totalExp]);
    totRow.font = { bold: true, size: 12 };
    totRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
    totRow.getCell(6).numFmt = QTY_FORMAT;
    totRow.getCell(8).numFmt = RS_FORMAT;

    // Per-product breakdown block — grouped by category, category-coloured
    sheet.addRow([]);
    const brkTitle = sheet.addRow([
      "",
      "PER-PRODUCT BREAKDOWN (BY CATEGORY)",
      "",
      "",
      "",
      "",
      "",
      "",
    ]);
    brkTitle.font = { bold: true, size: 12 };
    sheet.mergeCells(brkTitle.number, 2, brkTitle.number, totalCols);
    sheet.addRow(["S.No", "Category", "Product", "Unit", "Total Qty", "Total Expense", "Transactions", ""]);
    styleHeaderRow(sheet, sheet.rowCount);

    const perProduct = new Map<
      string,
      { unit: string; qty: number; cost: number; count: number }
    >();
    for (const r of rows) {
      const existing = perProduct.get(r.product_name);
      if (existing) {
        existing.qty += Number(r.quantity);
        existing.cost += Number(r.total_cost);
        existing.count += 1;
      } else {
        perProduct.set(r.product_name, {
          unit: r.unit,
          qty: Number(r.quantity),
          cost: Number(r.total_cost),
          count: 1,
        });
      }
    }
    // Group per-product by category so this block reads the same as Sheet 1
    const perProductWithCategory = [...perProduct.entries()].map(([prod, agg]) => {
      const cat = productCategoryLookup.get(prod) ?? {
        name: "Uncategorized",
        color: "E5E7EB",
        sort: 99999,
      };
      return { prod, agg, cat };
    });
    perProductWithCategory.sort((a, b) => {
      if (a.cat.sort !== b.cat.sort) return a.cat.sort - b.cat.sort;
      if (a.cat.name !== b.cat.name) return a.cat.name.localeCompare(b.cat.name);
      return b.agg.cost - a.agg.cost;
    });
    let psno = 1;
    let lastCat = "";
    for (const { prod, agg, cat } of perProductWithCategory) {
      if (cat.name !== lastCat) {
        const banner = sheet.addRow([
          "",
          `${cat.name.toUpperCase()}  —  ${perProductWithCategory.filter((x) => x.cat.name === cat.name).length} product${perProductWithCategory.filter((x) => x.cat.name === cat.name).length === 1 ? "" : "s"}`,
        ]);
        sheet.mergeCells(banner.number, 2, banner.number, totalCols);
        banner.font = { bold: true, size: 11 };
        banner.height = 20;
        banner.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
        banner.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF" + cat.color },
        };
        lastCat = cat.name;
      }
      const r = sheet.addRow([psno++, cat.name, prod, agg.unit, agg.qty, agg.cost, agg.count, ""]);
      r.getCell(2).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: hexWithAlpha(cat.color, 0.35) },
      };
      r.getCell(5).numFmt = QTY_FORMAT;
      r.getCell(6).numFmt = RS_FORMAT;
    }

    sheet.getColumn(1).width = 5;
    sheet.getColumn(2).width = 20;
    sheet.getColumn(3).width = 28;
    sheet.getColumn(4).width = 8;
    sheet.getColumn(5).width = 12;
    sheet.getColumn(6).width = 16;
    sheet.getColumn(7).width = 14;
    sheet.getColumn(8).width = 12;

    sheet.views = [{ state: "frozen", ySplit: 5 }];
  }
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function dayOf(iso: string): number {
  return Number(iso.slice(8, 10));
}

function dayName(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

function addThinBorders(
  sheet: Worksheet,
  fromRow: number,
  toRow: number,
  fromCol: number,
  toCol: number
) {
  for (let r = fromRow; r <= toRow; r++) {
    for (let c = fromCol; c <= toCol; c++) {
      const cell = sheet.getCell(r, c);
      cell.border = {
        top: { style: "thin", color: { argb: "FFD1D5DB" } },
        bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
        left: { style: "thin", color: { argb: "FFD1D5DB" } },
        right: { style: "thin", color: { argb: "FFD1D5DB" } },
      };
    }
  }
}

// Blends a category's 6-hex color with white by (1-alpha) to produce a
// softer tint that's still recognizable as the category color when used
// in the data-row Category cell. Returns an 8-hex ARGB string ExcelJS
// accepts directly (leading FF alpha).
function hexWithAlpha(hex6: string, alpha: number): string {
  const r = parseInt(hex6.slice(0, 2), 16);
  const g = parseInt(hex6.slice(2, 4), 16);
  const b = parseInt(hex6.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c * alpha + 255 * (1 - alpha));
  const to2 = (n: number) => n.toString(16).padStart(2, "0").toUpperCase();
  return "FF" + to2(mix(r)) + to2(mix(g)) + to2(mix(b));
}

// Re-exported for other builders — kept beside sheet-specific helpers.
export function _productSummaryDefined(_p: ProductReportSummaryRow) {
  return _p;
}
