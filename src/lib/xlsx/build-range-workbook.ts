import "server-only";
import ExcelJS from "exceljs";
import { CURRENCY_FORMAT, QTY_FORMAT, styleHeaderRow, styleTitleRow, addTotalsRow } from "./styles";
import { dateRange, groupProductsByCategory, type ReportData } from "./report-data";
import {
  buildStoreOverviewSheet,
  buildOutwardMatrixSheet,
  buildInwardMatrixSheet,
  buildDepartmentsSummarySheet,
  buildPerDepartmentSheets,
} from "./build-template-sheets";

export function buildRangeWorkbook(
  data: ReportData,
  opts: { title: string; periodLabel: string }
): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Store Management System";
  wb.created = new Date();

  // 1. Store In & Out — per-product money summary + grand total (category-banded)
  buildStoreOverviewSheet(wb, data, opts);
  // 2 & 3. Day matrices for outward and inward (mirror the paper register)
  buildOutwardMatrixSheet(wb, data, opts);
  buildInwardMatrixSheet(wb, data, opts);
  // 4. Departments summary — per-department totals + day×dept×product detail
  buildDepartmentsSummarySheet(wb, data, opts);
  // 5+. One sheet per department with its own detailed log + totals
  buildPerDepartmentSheets(wb, data, opts);

  // Auxiliary analytical sheets (raw entry lists etc.)
  buildSummarySheet(wb, data, opts);
  buildIncomingSheet(wb, data);
  buildOutgoingSheet(wb, data);
  buildProductSummarySheet(wb, data);
  buildDepartmentSummarySheet(wb, data);
  buildDailyMovementSheet(wb, data);

  return wb;
}

function buildSummarySheet(
  wb: ExcelJS.Workbook,
  data: ReportData,
  opts: { title: string; periodLabel: string }
) {
  const sheet = wb.addWorksheet("Summary");
  sheet.columns = [{ width: 32 }, { width: 22 }];

  sheet.addRow([opts.title]);
  styleTitleRow(sheet, 1);
  sheet.addRow([`Period: ${opts.periodLabel}`]);
  sheet.addRow([]);

  const openingValue = sum(data.productSummary, (r) => r.opening_value);
  const closingValue = sum(data.productSummary, (r) => r.closing_value);
  const incomingExpense = sum(data.productSummary, (r) => r.incoming_expense);
  const outgoingExpense = sum(data.productSummary, (r) => r.outgoing_expense);

  const summaryRows: [string, number | string][] = [
    ["Opening Stock Value", openingValue],
    ["Total Incoming Expense", incomingExpense],
    ["Total Outgoing / Consumption Expense", outgoingExpense],
    ["Closing Stock Value", closingValue],
    ["Total Incoming Entries", data.incomingRows.length],
    ["Total Outgoing Entries", data.outgoingRows.length],
    ["Total Products", data.productSummary.length],
    ["Total Categories", data.categories.length],
  ];

  for (const [label, value] of summaryRows) {
    const row = sheet.addRow([label, value]);
    const lower = label.toLowerCase();
    if (typeof value === "number" && (lower.includes("expense") || lower.includes("value"))) {
      row.getCell(2).numFmt = CURRENCY_FORMAT;
    }
    row.getCell(1).font = { bold: true };
  }

  sheet.addRow([]);
  const deptHeaderRowNum = sheet.rowCount + 1;
  sheet.addRow(["Department-wise Expense Summary"]);
  sheet.getRow(deptHeaderRowNum).font = { bold: true, size: 12 };

  const deptTotals = new Map<string, number>();
  for (const r of data.departmentSummary) {
    deptTotals.set(r.department_name, (deptTotals.get(r.department_name) ?? 0) + Number(r.expense));
  }

  const tableHeaderRowNum = sheet.rowCount + 1;
  sheet.addRow(["Department", "Expense"]);
  styleHeaderRow(sheet, tableHeaderRowNum);

  let deptGrandTotal = 0;
  for (const [name, expense] of [...deptTotals.entries()].sort((a, b) => b[1] - a[1])) {
    const row = sheet.addRow([name, expense]);
    row.getCell(2).numFmt = CURRENCY_FORMAT;
    deptGrandTotal += expense;
  }
  addTotalsRow(sheet, "Total Department Expense", [deptGrandTotal]).getCell(2).numFmt =
    CURRENCY_FORMAT;

  // Category-wise expense summary — same shape, but coloured
  sheet.addRow([]);
  const catHeaderRow = sheet.addRow(["Category-wise Expense Summary"]);
  catHeaderRow.font = { bold: true, size: 12 };
  const catTableHead = sheet.addRow(["Category", "Purchases", "Consumption", "Closing Value"]);
  styleHeaderRow(sheet, catTableHead.number);
  const groups = groupProductsByCategory(data.productSummary);
  for (const g of groups) {
    const purchases = g.products.reduce((a, p) => a + Number(p.incoming_expense), 0);
    const consumption = g.products.reduce((a, p) => a + Number(p.outgoing_expense), 0);
    const closing = g.products.reduce((a, p) => a + Number(p.closing_value), 0);
    const row = sheet.addRow([g.categoryName, purchases, consumption, closing]);
    row.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF" + g.categoryColor },
    };
    row.getCell(1).font = { bold: true };
    row.getCell(2).numFmt = CURRENCY_FORMAT;
    row.getCell(3).numFmt = CURRENCY_FORMAT;
    row.getCell(4).numFmt = CURRENCY_FORMAT;
  }
}

export function buildIncomingSheet(wb: ExcelJS.Workbook, data: ReportData) {
  const sheet = wb.addWorksheet("Incoming");
  sheet.columns = [
    { header: "Date", key: "date", width: 12 },
    { header: "Time", key: "time", width: 10 },
    { header: "Product", key: "product", width: 24 },
    { header: "Unit", key: "unit", width: 10 },
    { header: "Quantity", key: "qty", width: 12 },
    { header: "Per Unit Price", key: "unitPrice", width: 14 },
    { header: "Total Price", key: "totalPrice", width: 14 },
    { header: "Receipt", key: "receipt", width: 10 },
    { header: "Entry ID", key: "id", width: 38 },
  ];
  styleHeaderRow(sheet);

  let totalQty = 0;
  let totalPrice = 0;
  for (const r of data.incomingRows) {
    sheet.addRow({
      date: r.entry_date,
      time: r.entry_time,
      product: r.product_name,
      unit: r.unit,
      qty: r.quantity,
      unitPrice: r.unit_price,
      totalPrice: r.total_price,
      receipt: r.has_receipt ? "Yes" : "No",
      id: r.id,
    });
    totalQty += r.quantity;
    totalPrice += r.total_price;
  }
  sheet.getColumn("qty").numFmt = QTY_FORMAT;
  sheet.getColumn("unitPrice").numFmt = CURRENCY_FORMAT;
  sheet.getColumn("totalPrice").numFmt = CURRENCY_FORMAT;

  if (data.incomingRows.length) {
    const row = addTotalsRow(sheet, "Total", ["", "", "", totalQty, "", totalPrice, "", ""], 3);
    row.getCell(5).numFmt = QTY_FORMAT;
    row.getCell(7).numFmt = CURRENCY_FORMAT;
  }
}

export function buildOutgoingSheet(wb: ExcelJS.Workbook, data: ReportData) {
  const sheet = wb.addWorksheet("Outgoing");
  sheet.columns = [
    { header: "Date", key: "date", width: 12 },
    { header: "Time", key: "time", width: 10 },
    { header: "Product", key: "product", width: 24 },
    { header: "Unit", key: "unit", width: 10 },
    { header: "Quantity", key: "qty", width: 12 },
    { header: "Department", key: "department", width: 20 },
    { header: "Unit Cost", key: "unitCost", width: 12 },
    { header: "Total Cost", key: "totalCost", width: 14 },
    { header: "Notes", key: "notes", width: 24 },
    { header: "Entry ID", key: "id", width: 38 },
  ];
  styleHeaderRow(sheet);

  let totalQty = 0;
  let totalCost = 0;
  for (const r of data.outgoingRows) {
    sheet.addRow({
      date: r.entry_date,
      time: r.entry_time,
      product: r.product_name,
      unit: r.unit,
      qty: r.quantity,
      department: r.department_name,
      unitCost: r.unit_cost,
      totalCost: r.total_cost,
      notes: r.notes ?? "",
      id: r.id,
    });
    totalQty += r.quantity;
    totalCost += r.total_cost;
  }
  sheet.getColumn("qty").numFmt = QTY_FORMAT;
  sheet.getColumn("unitCost").numFmt = CURRENCY_FORMAT;
  sheet.getColumn("totalCost").numFmt = CURRENCY_FORMAT;

  if (data.outgoingRows.length) {
    const row = addTotalsRow(
      sheet,
      "Total",
      ["", "", "", totalQty, "", "", totalCost, "", ""],
      3
    );
    row.getCell(5).numFmt = QTY_FORMAT;
    row.getCell(8).numFmt = CURRENCY_FORMAT;
  }
}

export function buildProductSummarySheet(wb: ExcelJS.Workbook, data: ReportData) {
  const sheet = wb.addWorksheet("Product Summary");
  sheet.columns = [
    { header: "Category", key: "category", width: 22 },
    { header: "Product Name", key: "name", width: 24 },
    { header: "Unit", key: "unit", width: 10 },
    { header: "Opening Qty", key: "openingQty", width: 13 },
    { header: "Incoming Qty", key: "incomingQty", width: 13 },
    { header: "Outgoing Qty", key: "outgoingQty", width: 13 },
    { header: "Closing Qty", key: "closingQty", width: 13 },
    { header: "Opening Value", key: "openingValue", width: 14 },
    { header: "Incoming Expense", key: "incomingExpense", width: 16 },
    { header: "Outgoing Expense", key: "outgoingExpense", width: 16 },
    { header: "Closing Value", key: "closingValue", width: 14 },
  ];
  styleHeaderRow(sheet);

  for (const r of data.productSummary) {
    const added = sheet.addRow({
      category: r.category_name ?? "Uncategorized",
      name: r.product_name,
      unit: r.unit,
      openingQty: r.opening_qty,
      incomingQty: r.incoming_qty,
      outgoingQty: r.outgoing_qty,
      closingQty: r.closing_qty,
      openingValue: r.opening_value,
      incomingExpense: r.incoming_expense,
      outgoingExpense: r.outgoing_expense,
      closingValue: r.closing_value,
    });
    if (r.category_color) {
      added.getCell(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF" + r.category_color },
      };
    }
  }

  for (const key of ["openingQty", "incomingQty", "outgoingQty", "closingQty"]) {
    sheet.getColumn(key).numFmt = QTY_FORMAT;
  }
  for (const key of ["openingValue", "incomingExpense", "outgoingExpense", "closingValue"]) {
    sheet.getColumn(key).numFmt = CURRENCY_FORMAT;
  }

  if (data.productSummary.length) {
    const tot = addTotalsRow(
      sheet,
      "Total",
      [
        "",
        "",
        sum(data.productSummary, (r) => r.opening_qty),
        sum(data.productSummary, (r) => r.incoming_qty),
        sum(data.productSummary, (r) => r.outgoing_qty),
        sum(data.productSummary, (r) => r.closing_qty),
        sum(data.productSummary, (r) => r.opening_value),
        sum(data.productSummary, (r) => r.incoming_expense),
        sum(data.productSummary, (r) => r.outgoing_expense),
        sum(data.productSummary, (r) => r.closing_value),
      ],
      2
    );
    tot.eachCell((cell, colNumber) => {
      if (colNumber >= 8) cell.numFmt = CURRENCY_FORMAT;
      else if (colNumber >= 4) cell.numFmt = QTY_FORMAT;
    });
  }
}

export function buildDepartmentSummarySheet(wb: ExcelJS.Workbook, data: ReportData) {
  const sheet = wb.addWorksheet("Department Summary");
  sheet.columns = [
    { header: "Department Name", key: "department", width: 20 },
    { header: "Product", key: "product", width: 24 },
    { header: "Quantity Received", key: "qty", width: 16 },
    { header: "Expense", key: "expense", width: 14 },
    { header: "Number of Transactions", key: "count", width: 18 },
  ];
  styleHeaderRow(sheet);

  for (const r of data.departmentSummary) {
    sheet.addRow({
      department: r.department_name,
      product: r.product_name,
      qty: r.quantity,
      expense: r.expense,
      count: r.transaction_count,
    });
  }
  sheet.getColumn("qty").numFmt = QTY_FORMAT;
  sheet.getColumn("expense").numFmt = CURRENCY_FORMAT;

  const totalExpense = sum(data.departmentSummary, (r) => r.expense);
  if (data.departmentSummary.length) {
    addTotalsRow(sheet, "Total Department Expense", ["", totalExpense], 3).getCell(4).numFmt =
      CURRENCY_FORMAT;
  }
}

function buildDailyMovementSheet(wb: ExcelJS.Workbook, data: ReportData) {
  const sheet = wb.addWorksheet("Daily Movement");
  sheet.columns = [
    { header: "Date", key: "date", width: 12 },
    { header: "Product", key: "product", width: 24 },
    { header: "Opening Qty", key: "opening", width: 13 },
    { header: "Incoming", key: "incoming", width: 13 },
    { header: "Outgoing", key: "outgoing", width: 13 },
    { header: "Closing Qty", key: "closing", width: 13 },
  ];
  styleHeaderRow(sheet);

  const activityMap = new Map<string, { incoming: number; outgoing: number }>();
  for (const a of data.dailyActivity) {
    activityMap.set(`${a.entry_date}|${a.product_id}`, {
      incoming: Number(a.incoming_qty),
      outgoing: Number(a.outgoing_qty),
    });
  }

  const dates = [...dateRange(data.from, data.to)];

  for (const product of data.productSummary) {
    let running = Number(product.opening_qty);
    for (const date of dates) {
      const activity = activityMap.get(`${date}|${product.product_id}`) ?? {
        incoming: 0,
        outgoing: 0,
      };
      const opening = running;
      const closing = opening + activity.incoming - activity.outgoing;
      sheet.addRow({
        date,
        product: product.product_name,
        opening,
        incoming: activity.incoming,
        outgoing: activity.outgoing,
        closing,
      });
      running = closing;
    }
  }

  for (const key of ["opening", "incoming", "outgoing", "closing"]) {
    sheet.getColumn(key).numFmt = QTY_FORMAT;
  }
}

export function sum<T>(rows: T[], pick: (row: T) => number | string): number {
  return rows.reduce((acc, r) => acc + Number(pick(r) || 0), 0);
}
