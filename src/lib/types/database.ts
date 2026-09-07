// Hand-written types matching supabase/migrations/*.sql. If the schema
// changes, update this file (or regenerate with `supabase gen types
// typescript` once the project is linked, and reconcile with the shape
// below — the RPC function signatures in particular are load-bearing for
// every server action in this app).

export type Status = "active" | "inactive";

export interface Department {
  id: string;
  name: string;
  normalized_name: string;
  status: Status;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  normalized_name: string;
  color_hex: string;   // 6-char hex, no leading '#'
  sort_order: number;
  status: Status;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  normalized_name: string;
  unit: string;
  status: Status;
  category_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncomingBatch {
  id: string;
  product_id: string;
  entry_date: string;
  entry_time: string;
  quantity: number;
  remaining_quantity: number;
  unit: string;
  total_price: number;
  unit_price: number;
  receipt_url: string | null;
  receipt_path: string | null;
  is_void: boolean;
  void_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutgoingEntry {
  id: string;
  product_id: string;
  department_id: string;
  entry_date: string;
  entry_time: string;
  quantity: number;
  unit: string;
  total_cost: number;
  notes: string | null;
  is_override: boolean;
  is_void: boolean;
  void_reason: string | null;
  batch_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutgoingAllocation {
  id: string;
  outgoing_entry_id: string;
  incoming_batch_id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  created_at: string;
}

export interface YearlyArchive {
  id: string;
  year: number;
  file_name: string;
  file_url: string;
  file_path: string;
  status: "generating" | "completed" | "failed";
  entries_archived_incoming: number;
  entries_archived_outgoing: number;
  created_at: string;
}

export interface CurrentStockRow {
  product_id: string;
  product_name: string;
  unit: string;
  status: Status;
  category_id: string | null;
  category_name: string | null;
  category_color: string | null;
  category_sort: number;
  total_incoming_qty: number;
  total_outgoing_qty: number;
  current_stock: number;
  current_stock_value: number;
  avg_cost: number;
  total_purchase_expense: number;
  total_consumption_expense: number;
}

export interface DashboardSummaryRow {
  total_products: number;
  total_incoming_qty: number;
  total_outgoing_qty: number;
  current_stock_qty: number;
  current_stock_value: number;
  total_incoming_expense: number;
  total_outgoing_expense: number;
  month_incoming_expense: number;
  month_outgoing_expense: number;
  month_incoming_qty: number;
  month_outgoing_qty: number;
  month_incoming_entries: number;
  month_outgoing_entries: number;
}

export interface ProductReportSummaryRow {
  product_id: string;
  product_name: string;
  unit: string;
  category_id: string | null;
  category_name: string | null;
  category_color: string | null;
  category_sort: number;
  opening_qty: number;
  opening_value: number;
  incoming_qty: number;
  incoming_expense: number;
  outgoing_qty: number;
  outgoing_expense: number;
  closing_qty: number;
  closing_value: number;
}

export interface DepartmentReportSummaryRow {
  department_id: string;
  department_name: string;
  product_id: string;
  product_name: string;
  unit: string;
  quantity: number;
  expense: number;
  transaction_count: number;
}

export interface DailyActivityRow {
  entry_date: string;
  product_id: string;
  incoming_qty: number;
  outgoing_qty: number;
}

export interface ProductCalendarRow {
  entry_date: string;
  incoming_qty: number;
  outgoing_qty: number;
  incoming_expense: number;
  outgoing_expense: number;
}

export interface ArchiveYearResult {
  incoming_archived: number;
  outgoing_archived: number;
}

// NOTE: there is deliberately no `Database` generic type passed to the
// Supabase client (see `@/lib/supabase/client.ts` for why — the installed
// supabase-js/postgrest-js version rejects hand-written Insert/Update
// shapes under a strict structural check that only genuine codegen output
// survives). Every `.from()`/`.rpc()` call site instead casts `data` to the
// row types above, e.g. `data as CurrentStockRow[]`. This file remains the
// single source of truth for those shapes — keep it in sync with
// `supabase/migrations/*.sql` (columns) and the RPC function signatures
// (Args/Returns) by hand, or regenerate once the project is linked with
// `supabase gen types typescript` and reconcile the two.
