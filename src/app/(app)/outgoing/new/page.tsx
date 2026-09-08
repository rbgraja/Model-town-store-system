import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { OutgoingForm } from "../outgoing-form";
import type { Category, CurrentStockRow, Department } from "@/lib/types/database";

export default async function NewOutgoingPage() {
  const supabase = await createClient();

  const [{ data: stockRows }, { data: departments }, { data: categories }] = await Promise.all([
    supabase.rpc("fn_current_stock"),
    supabase
      .from("departments")
      .select("*")
      .eq("status", "active")
      .order("name", { ascending: true }),
    supabase
      .from("categories")
      .select("*")
      .eq("status", "active")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  const products = ((stockRows as CurrentStockRow[]) ?? [])
    .filter((r) => r.status === "active")
    .map((r) => ({
      id: r.product_id,
      name: r.product_name,
      unit: r.unit,
      currentStock: Number(r.current_stock),
      categoryId: r.category_id,
      categoryName: r.category_name,
    }));

  return (
    <div>
      <PageHeader
        title="Add Outgoing Entry"
        description="Issue stock to a department."
      />
      <OutgoingForm
        products={products}
        departments={
          ((departments as Department[]) ?? []).map((d) => ({
            id: d.id,
            name: d.name,
          }))
        }
        categories={
          ((categories as Category[]) ?? []).map((c) => ({ id: c.id, name: c.name }))
        }
      />
    </div>
  );
}
