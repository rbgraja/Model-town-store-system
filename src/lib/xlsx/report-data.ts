import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Category,
  DailyActivityRow,
  DepartmentReportSummaryRow,
  IncomingBatch,
  OutgoingEntry,
  ProductReportSummaryRow,
} from "@/lib/types/database";

export interface RawIncomingRow {
  id: string;
  entry_date: string;
  entry_time: string;
  product_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  has_receipt: boolean;
}

export interface RawOutgoingRow {
  id: string;
  entry_date: string;
  entry_time: string;
  product_name: string;
  unit: string;
  quantity: number;
  department_name: string;
  unit_cost: number;
  total_cost: number;
  notes: string | null;
}

export interface ReportData {
  from: string;
  to: string;
  productSummary: ProductReportSummaryRow[];
  departmentSummary: DepartmentReportSummaryRow[];
  dailyActivity: DailyActivityRow[];
  incomingRows: RawIncomingRow[];
  outgoingRows: RawOutgoingRow[];
  categories: Category[];
}

/**
 * Pulls every number a monthly/custom/yearly report needs for [from, to] in
 * a small, fixed number of round-trips — never the full history table.
 */
export async function fetchReportData(
  supabase: SupabaseClient,
  from: string,
  to: string
): Promise<ReportData> {
  const [
    { data: productSummary },
    { data: departmentSummary },
    { data: dailyActivity },
    { data: products },
    { data: departments },
    { data: incomingBatches },
    { data: outgoingEntries },
    { data: categories },
  ] = await Promise.all([
    supabase.rpc("fn_product_report_summary", { p_from: from, p_to: to }),
    supabase.rpc("fn_department_report_summary", { p_from: from, p_to: to }),
    supabase.rpc("fn_daily_activity", { p_from: from, p_to: to }),
    supabase.from("products").select("id, name, unit"),
    supabase.from("departments").select("id, name"),
    supabase
      .from("incoming_batches")
      .select("*")
      .eq("is_void", false)
      .gte("entry_date", from)
      .lte("entry_date", to)
      .order("entry_date", { ascending: true }),
    supabase
      .from("outgoing_entries")
      .select("*")
      .eq("is_void", false)
      .gte("entry_date", from)
      .lte("entry_date", to)
      .order("entry_date", { ascending: true }),
    supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  const productMap = new Map(
    (products ?? []).map((p) => [p.id, p as { id: string; name: string; unit: string }])
  );
  const departmentMap = new Map(
    (departments ?? []).map((d) => [d.id, d as { id: string; name: string }])
  );

  const incomingRows: RawIncomingRow[] = ((incomingBatches as IncomingBatch[]) ?? []).map(
    (b) => ({
      id: b.id,
      entry_date: b.entry_date,
      entry_time: b.entry_time,
      product_name: productMap.get(b.product_id)?.name ?? "Unknown",
      unit: b.unit,
      quantity: Number(b.quantity),
      unit_price: Number(b.unit_price),
      total_price: Number(b.total_price),
      has_receipt: Boolean(b.receipt_path),
    })
  );

  const outgoingRows: RawOutgoingRow[] = ((outgoingEntries as OutgoingEntry[]) ?? []).map(
    (e) => ({
      id: e.id,
      entry_date: e.entry_date,
      entry_time: e.entry_time,
      product_name: productMap.get(e.product_id)?.name ?? "Unknown",
      unit: e.unit,
      quantity: Number(e.quantity),
      department_name: departmentMap.get(e.department_id)?.name ?? "Unknown",
      unit_cost: Number(e.quantity) > 0 ? Number(e.total_cost) / Number(e.quantity) : 0,
      total_cost: Number(e.total_cost),
      notes: e.notes,
    })
  );

  return {
    from,
    to,
    productSummary: (productSummary as ProductReportSummaryRow[]) ?? [],
    departmentSummary: (departmentSummary as DepartmentReportSummaryRow[]) ?? [],
    dailyActivity: (dailyActivity as DailyActivityRow[]) ?? [],
    incomingRows,
    outgoingRows,
    categories: (categories as Category[]) ?? [],
  };
}

/** Enumerates every calendar date in [from, to] inclusive, as ISO strings. */
export function* dateRange(from: string, to: string): Generator<string> {
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  for (let d = start; d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    yield d.toISOString().slice(0, 10);
  }
}

/**
 * Groups product summary rows by category, preserving the sort_order that
 * came back from the RPC. Products with no category go into a final
 * "Uncategorized" bucket. Every group is sorted internally by product name.
 * Used by the xlsx generator to build category-banded sheets.
 */
export function groupProductsByCategory(
  productSummary: ProductReportSummaryRow[]
): Array<{
  categoryId: string | null;
  categoryName: string;
  categoryColor: string; // 6-hex, no '#'
  sort: number;
  products: ProductReportSummaryRow[];
}> {
  const buckets = new Map<
    string,
    {
      categoryId: string | null;
      categoryName: string;
      categoryColor: string;
      sort: number;
      products: ProductReportSummaryRow[];
    }
  >();

  for (const p of productSummary) {
    const key = p.category_id ?? "__none__";
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.products.push(p);
    } else {
      buckets.set(key, {
        categoryId: p.category_id,
        categoryName: p.category_name ?? "Uncategorized",
        categoryColor: p.category_color ?? "E5E7EB",
        sort: p.category_id ? (p.category_sort ?? 9999) : 99999,
        products: [p],
      });
    }
  }

  const arr = [...buckets.values()].sort(
    (a, b) => a.sort - b.sort || a.categoryName.localeCompare(b.categoryName)
  );
  for (const g of arr) {
    g.products.sort((a, b) => a.product_name.localeCompare(b.product_name));
  }
  return arr;
}
