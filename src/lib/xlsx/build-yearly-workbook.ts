import "server-only";
import ExcelJS from "exceljs";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProductReportSummaryRow } from "@/lib/types/database";
import { fetchReportData, type ReportData } from "./report-data";
import {
  buildIncomingSheet,
  buildOutgoingSheet,
  buildProductSummarySheet,
  buildDepartmentSummarySheet,
  sum,
} from "./build-range-workbook";
import {
  buildStoreOverviewSheet,
  buildDepartmentsSummarySheet,
  buildPerDepartmentSheets,
} from "./build-template-sheets";
import { CURRENCY_FORMAT, QTY_FORMAT, styleHeaderRow, styleTitleRow, addTotalsRow } from "./styles";
import { monthName, monthRange } from "@/lib/utils";

export interface MonthlyBreakdown {
  month: number;
  from: string;
  to: string;
  rows: ProductReportSummaryRow[];
}

async function fetchMonthlyBreakdown(
  supabase: SupabaseClient,
  year: number
): Promise<MonthlyBreakdown[]> {
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  return Promise.all(
    months.map(async (month) => {
      const [from, to] = monthRange(month, year);
      const { data } = await supabase.rpc("fn_product_report_summary", {
        p_from: from,
        p_to: to,
      });
      return { month, from, to, rows: (data as ProductReportSummaryRow[]) ?? [] };
    })
  );
}

export async function buildYearlyWorkbook(
  supabase: SupabaseClient,
  year: number
): Promise<{ workbook: ExcelJS.Workbook; data: ReportData }> {
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;

  const [data, monthly] = await Promise.all([
    fetchReportData(supabase, from, to),
    fetchMonthlyBreakdown(supabase, year),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Store Management System";
  wb.created = new Date();

  const yearOpts = {
    title: `Yearly Store Report — ${year}`,
    periodLabel: `${year}`,
  };
  // Same operator-facing structure as the range/monthly workbook:
  buildStoreOverviewSheet(wb, data, yearOpts);
  buildYearlySummarySheet(wb, data, monthly, year);
  buildMonthlySummarySheet(wb, monthly, year);
  buildProductSummarySheet(wb, data);
  buildDepartmentsSummarySheet(wb, data, yearOpts);
  buildPerDepartmentSheets(wb, data, yearOpts);
  buildDepartmentSummarySheet(wb, data);
  buildIncomingSheet(wb, data);
  buildOutgoingSheet(wb, data);
  buildMonthlyMovementSheet(wb, monthly);

  return { workbook: wb, data };
}

function buildYearlySummarySheet(
  wb: ExcelJS.Workbook,
  data: ReportData,
  monthly: MonthlyBreakdown[],
  year: number
) {
  const sheet = wb.addWorksheet("Yearly Summary");
  sheet.columns = [{ width: 32 }, { width: 22 }];

  sheet.addRow([`Yearly Store Report — ${year}`]);
  styleTitleRow(sheet, 1);
  sheet.addRow([`Period: January 1 - December 31, ${year}`]);
  sheet.addRow([]);

  const openingValue = sum(data.productSummary, (r) => r.opening_value);
  const closingValue = sum(data.productSummary, (r) => r.closing_value);
  const incomingExpense = sum(data.productSummary, (r) => r.incoming_expense);
  const outgoingExpense = sum(data.productSummary, (r) => r.outgoing_expense);

  const rows: [string, number][] = [
    ["Opening Stock Value (Jan 1)", openingValue],
    ["Total Incoming Expense", incomingExpense],
    ["Total Outgoing / Consumption Expense", outgoingExpense],
    ["Closing Stock Value (Dec 31)", closingValue],
  ];
  for (const [label, value] of rows) {
    const row = sheet.addRow([label, value]);
    row.getCell(1).font = { bold: true };
    row.getCell(2).numFmt = CURRENCY_FORMAT;
  }

  sheet.addRow(["Total Incoming Entries", data.incomingRows.length]).getCell(1).font = {
    bold: true,
  };
  sheet.addRow(["Total Outgoing Entries", data.outgoingRows.length]).getCell(1).font = {
    bold: true,
  };
  sheet.addRow(["Total Products", data.productSummary.length]).getCell(1).font = {
    bold: true,
  };

  sheet.addRow([]);
  const deptTitleRow = sheet.rowCount + 1;
  sheet.addRow(["Department-wise Expense Summary"]);
  sheet.getRow(deptTitleRow).font = { bold: true, size: 12 };

  const deptTotals = new Map<string, number>();
  for (const r of data.departmentSummary) {
    deptTotals.set(r.department_name, (deptTotals.get(r.department_name) ?? 0) + Number(r.expense));
  }
  const headerRowNum = sheet.rowCount + 1;
  sheet.addRow(["Department", "Expense"]);
  styleHeaderRow(sheet, headerRowNum);

  let grandTotal = 0;
  for (const [name, expense] of [...deptTotals.entries()].sort((a, b) => b[1] - a[1])) {
    const row = sheet.addRow([name, expense]);
    row.getCell(2).numFmt = CURRENCY_FORMAT;
    grandTotal += expense;
  }
  addTotalsRow(sheet, "Total Department Expense", [grandTotal]).getCell(2).numFmt =
    CURRENCY_FORMAT;

  void monthly; // monthly breakdown lives in its own sheet
}

function buildMonthlySummarySheet(wb: ExcelJS.Workbook, monthly: MonthlyBreakdown[], year: number) {
  const sheet = wb.addWorksheet("Monthly Summary");
  sheet.columns = [
    { header: "Month", key: "month", width: 14 },
    { header: "Opening Value", key: "openingValue", width: 15 },
    { header: "Incoming Qty", key: "incomingQty", width: 13 },
    { header: "Incoming Expense", key: "incomingExpense", width: 16 },
    { header: "Outgoing Qty", key: "outgoingQty", width: 13 },
    { header: "Outgoing Expense", key: "outgoingExpense", width: 16 },
    { header: "Closing Value", key: "closingValue", width: 15 },
  ];
  styleHeaderRow(sheet);

  for (const m of monthly) {
    sheet.addRow({
      month: `${monthName(m.month)} ${year}`,
      openingValue: sum(m.rows, (r) => r.opening_value),
      incomingQty: sum(m.rows, (r) => r.incoming_qty),
      incomingExpense: sum(m.rows, (r) => r.incoming_expense),
      outgoingQty: sum(m.rows, (r) => r.outgoing_qty),
      outgoingExpense: sum(m.rows, (r) => r.outgoing_expense),
      closingValue: sum(m.rows, (r) => r.closing_value),
    });
  }

  for (const key of ["incomingQty", "outgoingQty"]) sheet.getColumn(key).numFmt = QTY_FORMAT;
  for (const key of ["openingValue", "incomingExpense", "outgoingExpense", "closingValue"]) {
    sheet.getColumn(key).numFmt = CURRENCY_FORMAT;
  }
}

function buildMonthlyMovementSheet(wb: ExcelJS.Workbook, monthly: MonthlyBreakdown[]) {
  const sheet = wb.addWorksheet("Monthly Movement");
  sheet.columns = [
    { header: "Month", key: "month", width: 14 },
    { header: "Product", key: "product", width: 24 },
    { header: "Opening Qty", key: "opening", width: 13 },
    { header: "Incoming", key: "incoming", width: 13 },
    { header: "Outgoing", key: "outgoing", width: 13 },
    { header: "Closing Qty", key: "closing", width: 13 },
  ];
  styleHeaderRow(sheet);

  for (const m of monthly) {
    for (const r of m.rows) {
      sheet.addRow({
        month: monthName(m.month),
        product: r.product_name,
        opening: r.opening_qty,
        incoming: r.incoming_qty,
        outgoing: r.outgoing_qty,
        closing: r.closing_qty,
      });
    }
  }

  for (const key of ["opening", "incoming", "outgoing", "closing"]) {
    sheet.getColumn(key).numFmt = QTY_FORMAT;
  }
}
