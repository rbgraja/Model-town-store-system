"use server";

import { createClient } from "@/lib/supabase/server";
import type { OutgoingEntry, Product } from "@/lib/types/database";

export interface OutgoingSummary {
  itemCount: number;
  totalCost: number;
  products: string[];
}

/**
 * Read-only lookup used by the bulk outgoing form so the operator can see
 * what's already been saved for a department/date before adding more,
 * instead of guessing whether they're about to duplicate work.
 */
export async function getOutgoingSummaryForDepartmentDate(
  departmentId: string,
  entryDate: string
): Promise<OutgoingSummary> {
  if (!departmentId || !entryDate) return { itemCount: 0, totalCost: 0, products: [] };

  const supabase = await createClient();
  const { data: entries } = await supabase
    .from("outgoing_entries")
    .select("product_id, total_cost")
    .eq("department_id", departmentId)
    .eq("entry_date", entryDate)
    .eq("is_void", false);

  const rows = (entries as Pick<OutgoingEntry, "product_id" | "total_cost">[]) ?? [];
  if (rows.length === 0) return { itemCount: 0, totalCost: 0, products: [] };

  const productIds = [...new Set(rows.map((r) => r.product_id))];
  const { data: products } = await supabase
    .from("products")
    .select("id, name")
    .in("id", productIds);

  const nameById = new Map(
    ((products as Pick<Product, "id" | "name">[]) ?? []).map((p) => [p.id, p.name])
  );

  return {
    itemCount: rows.length,
    totalCost: rows.reduce((a, r) => a + Number(r.total_cost), 0),
    products: productIds.map((id) => nameById.get(id) ?? "Unknown"),
  };
}
