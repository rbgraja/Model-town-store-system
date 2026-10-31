import "server-only";
import ExcelJS from "exceljs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CURRENCY_FORMAT, QTY_FORMAT, styleHeaderRow, styleTitleRow } from "./styles";
import type { DepartmentStockRow } from "./report-data";

export interface DepartmentReportData {
  departmentName: string;
  from: string;
  to: string;
  stock: DepartmentStockRow[];
  issued: { date: string; time: string; product: string; unit: string; quantity: number; unitCost: number; totalCost: number; notes: string }[];
  usage: { date: string; product: string; unit: string; quantity: number }[];
}

/** Everything one department's monthly sheet needs, in a few round-trips. */
export async function fetchDepartmentReportData(
  supabase: SupabaseClient,
  departmentId: string,
  from: string,
  to: string
): Promise<DepartmentReportData | null> {
  const [{ data: dept }, { data: stock }, { data: products }, { data: out }, { data: use }] =
    await Promise.all([
      supabase.from("departments").select("name").eq("id", departmentId).maybeSingle(),
      supabase.rpc("fn_department_stock", { p_from: from, p_to: to }),
      supabase.from("products").select("id, name, unit"),
      supabase
        .from("outgoing_entries")
        .select("*")
        .eq("department_id", departmentId)
        .eq("is_void", false)
        .gte("entry_date", from)
        .lte("entry_date", to)
        .order("entry_date")
        .order("entry_time"),
      supabase
        .from("department_usage")
        .select("*")
        .eq("department_id", departmentId)
        .eq("is_void", false)
        .gte("entry_date", from)
        .lte("entry_date", to)
        .order("entry_date")
        .order("created_at"),
    ]);
  if (!dept) return null;

  const productName = new Map((products ?? []).map((p) => [p.id as string, p.name as string]));

  return {
    departmentName: dept.name as string,
    from,
    to,
    stock: ((stock as DepartmentStockRow[]) ?? []).filter((r) => r.department_id === departmentId),
    issued: (out ?? []).map((e) => ({
      date: e.entry_date,
      time: String(e.entry_time).slice(0, 5),
      product: productName.get(e.product_id) ?? "Unknown",
      unit: e.unit,
      quantity: Number(e.quantity),
      unitCost: Number(e.quantity) > 0 ? Number(e.total_cost) / Number(e.quantity) : 0,
      totalCost: Number(e.total_cost),
      notes: e.notes ?? "",
    })),
    usage: (use ?? []).map((u) => ({
      date: u.entry_date,
      product: productName.get(u.product_id) ?? "Unknown",
      unit: u.unit,
      quantity: Number(u.quantity),
    })),
  };
}

export function buildDepartmentWorkbook(data: DepartmentReportData, periodLabel: string): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Store Management System";
  wb.created = new Date();

  // --- Summary: start + received - used = left, per product ------------------
  const s = wb.addWorksheet("Summary");
  s.columns = [
    { width: 28 }, { width: 10 }, { width: 14 }, { width: 14 }, { width: 12 }, { width: 14 },
  ];
  s.addRow([`${data.departmentName.toUpperCase()} — ${periodLabel}`]);
  styleTitleRow(s, 1);
  s.addRow([]);
  s.addRow(["Product", "Unit", "Start Qty", "Received Qty", "Used Qty", "Left Qty"]);
  styleHeaderRow(s, 3);
  for (const r of data.stock) {
    const row = s.addRow([
      r.product_name,
      r.unit,
      Number(r.opening_qty),
      Number(r.received_qty),
      Number(r.used_qty),
      Number(r.remaining_qty),
    ]);
    for (let c = 3; c <= 6; c++) row.getCell(c).numFmt = QTY_FORMAT;
    row.getCell(6).font = { bold: true };
  }
  if (data.stock.length === 0) s.addRow(["No stock activity for this department in this period."]);
  s.addRow([]);
  s.addRow(["Left Qty carries forward as next month's Start Qty."]).font = { italic: true, color: { argb: "FF6B7280" } };
  s.views = [{ state: "frozen", ySplit: 3 }];

  // --- Issued: what the store sent to this department ------------------------
  const i = wb.addWorksheet("Issued");
  i.columns = [
    { header: "Date", width: 12 },
    { header: "Time", width: 8 },
    { header: "Product", width: 28 },
    { header: "Unit", width: 10 },
    { header: "Quantity", width: 12 },
    { header: "Unit Cost", width: 14 },
    { header: "Total Cost", width: 16 },
    { header: "Notes", width: 28 },
  ];
  styleHeaderRow(i);
  let totalCost = 0;
  for (const e of data.issued) {
    const row = i.addRow([e.date, e.time, e.product, e.unit, e.quantity, e.unitCost, e.totalCost, e.notes]);
    row.getCell(5).numFmt = QTY_FORMAT;
    row.getCell(6).numFmt = CURRENCY_FORMAT;
    row.getCell(7).numFmt = CURRENCY_FORMAT;
    totalCost += e.totalCost;
  }
  if (data.issued.length) {
    const t = i.addRow(["Total", "", "", "", "", "", totalCost, ""]);
    t.font = { bold: true };
    t.getCell(7).numFmt = CURRENCY_FORMAT;
  }
  i.views = [{ state: "frozen", ySplit: 1 }];

  // --- Usage: what the department actually used, day by day -------------------
  const u = wb.addWorksheet("Usage");
  u.columns = [
    { header: "Date", width: 12 },
    { header: "Product", width: 28 },
    { header: "Unit", width: 10 },
    { header: "Used Qty", width: 12 },
  ];
  styleHeaderRow(u);
  for (const e of data.usage) {
    const row = u.addRow([e.date, e.product, e.unit, e.quantity]);
    row.getCell(4).numFmt = QTY_FORMAT;
  }
  u.views = [{ state: "frozen", ySplit: 1 }];

  return wb;
}
