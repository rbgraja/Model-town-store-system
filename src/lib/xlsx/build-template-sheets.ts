import "server-only";
import type { Workbook, Worksheet } from "exceljs";
import { QTY_FORMAT, styleHeaderRow } from "./styles";
import { dateRange, type ReportData } from "./report-data";

/**
 * Custom operator-facing sheets that mirror the hand-kept monthly ledger
 * (see AUG INVENTRY STOCK HOUSE KEEPING.xlsx) and add every money column
 * the paper register was missing. Sheets, in order:
 *
 *   1. Store In & Out — per-product summary with money: opening qty+value,
 *      incoming qty+expense, outgoing qty+expense (consumption), closing
 *      qty+value. Grand-total row across all products at the bottom.
 *   2. Outward Matrix — products × days-of-month, cell = qty issued that
 *      day. Opening / Closing stock formulas on the sides.
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

const CATEGORY_LABEL = "House Keeping";
// Rupee currency format — the operator's ledger is denominated in PKR.
export const RS_FORMAT = '"Rs. "#,##0.00';

// -----------------------------------------------------------------------------
// Sheet 1 — Store In & Out (monetary summary per product)
// -----------------------------------------------------------------------------
export function buildStoreOverviewSheet(wb: Workbook, data: ReportData, opts: Options) {
  const sheet = wb.addWorksheet("Store In & Out");
  const totalCols = 12;

  sheet.mergeCells(1, 1, 1, totalCols);
  const title = sheet.getCell(1, 1);
  title.value = `STORE INCOMING & OUTGOING SUMMARY — ${CATEGORY_LABEL.toUpperCase()}   (${opts.periodLabel})`;
  title.font = { bold: true, size: 14 };
  title.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 28;

  sheet.addRow([
    "S.No",
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
    "Net Movement (In − Out)",
  ]);
  styleHeaderRow(sheet, 2);
  sheet.getRow(2).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  sheet.getRow(2).height = 32;

  const products = [...data.productSummary].sort((a, b) =>
    a.product_name.localeCompare(b.product_name)
  );

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
  for (const p of products) {
    const openingQty = Number(p.opening_qty);
    const openingVal = Number(p.opening_value);
    const inQty = Number(p.incoming_qty);
    const inExp = Number(p.incoming_expense);
    const outQty = Number(p.outgoing_qty);
    const outExp = Number(p.outgoing_expense);
    const closeQty = Number(p.closing_qty);
    const closeVal = Number(p.closing_value);
    const row = sheet.addRow([
      sno++,
      p.product_name,
      p.unit,
      openingQty,
      openingVal,
      inQty,
      inExp,
      outQty,
      outExp,
      closeQty,
      closeVal,
      inQty - outQty,
    ]);
    row.getCell(4).numFmt = QTY_FORMAT;
    row.getCell(5).numFmt = RS_FORMAT;
    row.getCell(6).numFmt = QTY_FORMAT;
    row.getCell(7).numFmt = RS_FORMAT;
    row.getCell(8).numFmt = QTY_FORMAT;
    row.getCell(9).numFmt = RS_FORMAT;
    row.getCell(10).numFmt = QTY_FORMAT;
    row.getCell(11).numFmt = RS_FORMAT;
    row.getCell(12).numFmt = QTY_FORMAT;
    totOpenQty += openingQty;
    totOpenVal += openingVal;
    totInQty += inQty;
    totInExp += inExp;
    totOutQty += outQty;
    totOutExp += outExp;
    totCloseQty += closeQty;
    totCloseVal += closeVal;
  }
  const lastDataRow = sheet.rowCount;

  // Grand-total row
  const totalRow = sheet.addRow([
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
    totInQty - totOutQty,
  ]);
  totalRow.font = { bold: true, size: 12 };
  totalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
  totalRow.getCell(4).numFmt = QTY_FORMAT;
  totalRow.getCell(5).numFmt = RS_FORMAT;
  totalRow.getCell(6).numFmt = QTY_FORMAT;
  totalRow.getCell(7).numFmt = RS_FORMAT;
  totalRow.getCell(8).numFmt = QTY_FORMAT;
  totalRow.getCell(9).numFmt = RS_FORMAT;
  totalRow.getCell(10).numFmt = QTY_FORMAT;
  totalRow.getCell(11).numFmt = RS_FORMAT;
  totalRow.getCell(12).numFmt = QTY_FORMAT;
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
    ["Products Tracked", products.length],
    ["Incoming Entries", data.incomingRows.length],
    ["Outgoing Entries", data.outgoingRows.length],
  ];
  for (const [label, value, fmt] of callouts) {
    const r = sheet.addRow(["", label, "", value]);
    r.getCell(2).font = { bold: true };
    r.getCell(4).font = { bold: true };
    if (fmt) r.getCell(4).numFmt = fmt;
    sheet.mergeCells(r.number, 2, r.number, 3);
  }

  sheet.getColumn(1).width = 6;
  sheet.getColumn(2).width = 32;
  sheet.getColumn(3).width = 8;
  for (let c = 4; c <= totalCols; c++) sheet.getColumn(c).width = 16;

  sheet.views = [{ state: "frozen", xSplit: 3, ySplit: 2 }];
  addThinBorders(sheet, 2, lastDataRow, 1, totalCols);
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
  // Ensure Excel actually recalculates our SUM formulas when the file is
  // opened. Without this some Excel builds will happily display the cached
  // result even when the underlying cells contain fresh numbers.
  if (sheet.workbook && sheet.workbook.calcProperties) {
    sheet.workbook.calcProperties.fullCalcOnLoad = true;
  }
  const dayCount = dates.length;
  // Columns: S.No | Product | Unit | Opening | day1..dayN | Total | Expense | Closing
  const totalCols = 4 + dayCount + 3;
  const totalQtyCol = 4 + dayCount + 1;
  const expenseCol = 4 + dayCount + 2;
  const closingCol = 4 + dayCount + 3;

  sheet.mergeCells(1, 1, 1, totalCols);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = `MONTHLY STOCK INVENTRY ( ${label === "OUT" ? "OUTWARD" : "INWARD"} ) — ${CATEGORY_LABEL.toUpperCase()}   (${opts.periodLabel})`;
  titleCell.font = { bold: true, size: 13 };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 26;

  const headerRow: (string | number)[] = ["S.No", "PRODUCT NAME", "P.UNIT", "Opening stock"];
  for (const d of dates) headerRow.push(dayOf(d));
  headerRow.push(label === "OUT" ? "TOTAL OUT" : "TOTAL IN");
  headerRow.push(label === "OUT" ? "OUT EXPENSE" : "IN EXPENSE");
  headerRow.push("CLOSING STOCK");
  sheet.addRow(headerRow);
  styleHeaderRow(sheet, 2);

  const categoryRow: (string | number)[] = ["", CATEGORY_LABEL, "", ""];
  for (let i = 0; i < dayCount; i++) categoryRow.push(label);
  categoryRow.push(label, label, label);
  const catRow = sheet.addRow(categoryRow);
  catRow.font = { bold: true };
  catRow.alignment = { horizontal: "center" };
  catRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };

  const perDay = new Map<string, number>();
  const rows = mode === "outgoing" ? data.outgoingRows : data.incomingRows;
  const productMeta = new Map<
    string,
    { name: string; unit: string; opening: number; expense: number }
  >();
  for (const p of data.productSummary) {
    productMeta.set(p.product_id, {
      name: p.product_name,
      unit: p.unit,
      opening: Number(p.opening_qty),
      expense:
        mode === "outgoing" ? Number(p.outgoing_expense) : Number(p.incoming_expense),
    });
  }
  const nameToId = new Map<string, string>();
  for (const p of data.productSummary) nameToId.set(p.product_name, p.product_id);

  for (const r of rows) {
    const pid = nameToId.get(r.product_name);
    if (!pid) continue;
    const key = `${pid}|${r.entry_date}`;
    perDay.set(key, (perDay.get(key) ?? 0) + Number(r.quantity));
  }

  let sno = 1;
  const productsSorted = [...productMeta.entries()].sort((a, b) =>
    a[1].name.localeCompare(b[1].name)
  );
  const firstDataRow = sheet.rowCount + 1;
  for (const [pid, meta] of productsSorted) {
    const rowValues: (string | number | null)[] = [sno++, meta.name, meta.unit || "", meta.opening];
    let sumDaily = 0;
    for (const d of dates) {
      const v = perDay.get(`${pid}|${d}`) ?? 0;
      rowValues.push(v > 0 ? v : null);
      sumDaily += v;
    }
    rowValues.push(null, meta.expense, null); // Total, Expense, Closing placeholders
    const row = sheet.addRow(rowValues);
    const openingAddr = row.getCell(4).address;
    const firstDayAddr = row.getCell(5).address;
    const lastDayAddr = row.getCell(4 + dayCount).address;
    row.getCell(totalQtyCol).value = {
      formula: `SUM(${firstDayAddr}:${lastDayAddr})`,
      result: sumDaily,
    };
    row.getCell(closingCol).value = {
      formula:
        mode === "outgoing"
          ? `${openingAddr}-${row.getCell(totalQtyCol).address}`
          : `${openingAddr}+${row.getCell(totalQtyCol).address}`,
      result: mode === "outgoing" ? meta.opening - sumDaily : meta.opening + sumDaily,
    };
    row.getCell(totalQtyCol).font = { bold: true };
    row.getCell(closingCol).font = { bold: true };
    row.getCell(expenseCol).numFmt = RS_FORMAT;
    row.getCell(expenseCol).font = { bold: true };
  }
  const lastDataRow = sheet.rowCount;

  // Column-total row — compute the actual sum per column and cache it so
  // Excel shows the right number even before its own recalc kicks in.
  sheet.addRow([]);
  const totalsRow = sheet.addRow(["", `TOTAL ${label}`, "", ""]);
  totalsRow.font = { bold: true };
  totalsRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
  for (let c = 5; c <= closingCol; c++) {
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

  sheet.getColumn(1).width = 6;
  sheet.getColumn(2).width = 28;
  sheet.getColumn(3).width = 8;
  sheet.getColumn(4).width = 12;
  for (let c = 5; c <= 4 + dayCount; c++) sheet.getColumn(c).width = 5;
  sheet.getColumn(totalQtyCol).width = 11;
  sheet.getColumn(expenseCol).width = 16;
  sheet.getColumn(closingCol).width = 14;
  for (let c = 4; c <= totalCols; c++) {
    if (c !== expenseCol) sheet.getColumn(c).numFmt = QTY_FORMAT;
  }

  sheet.views = [{ state: "frozen", xSplit: 4, ySplit: 3 }];
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

  // Aggregate per department
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
    title.value = `DEPARTMENT: ${dept.toUpperCase()}   —   ${CATEGORY_LABEL.toUpperCase()}   (${opts.periodLabel})`;
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

    // Per-product breakdown block
    sheet.addRow([]);
    const brkTitle = sheet.addRow([
      "",
      "PER-PRODUCT BREAKDOWN FOR THIS DEPARTMENT",
      "",
      "",
      "",
      "",
      "",
      "",
    ]);
    brkTitle.font = { bold: true, size: 12 };
    sheet.mergeCells(brkTitle.number, 2, brkTitle.number, totalCols);
    sheet.addRow(["S.No", "Product", "Unit", "Total Qty", "Total Expense", "Transactions", "", ""]);
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
    let psno = 1;
    for (const [prod, agg] of [...perProduct.entries()].sort((a, b) => b[1].cost - a[1].cost)) {
      const r = sheet.addRow([psno++, prod, agg.unit, agg.qty, agg.cost, agg.count, "", ""]);
      r.getCell(4).numFmt = QTY_FORMAT;
      r.getCell(5).numFmt = RS_FORMAT;
    }

    sheet.getColumn(1).width = 6;
    sheet.getColumn(2).width = 14;
    sheet.getColumn(3).width = 10;
    sheet.getColumn(4).width = 28;
    sheet.getColumn(5).width = 8;
    sheet.getColumn(6).width = 13;
    sheet.getColumn(7).width = 14;
    sheet.getColumn(8).width = 16;

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
