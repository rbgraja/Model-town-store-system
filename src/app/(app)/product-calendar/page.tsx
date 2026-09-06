import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import type { Category, CurrentStockRow } from "@/lib/types/database";
import { ProductCalendarClient } from "./product-calendar-client";

export default async function ProductCalendarPage() {
  const supabase = await createClient();
  const [stockRes, catRes] = await Promise.all([
    supabase.rpc("fn_current_stock"),
    supabase
      .from("categories")
      .select("*")
      .eq("status", "active")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Calendar"
        description="Pick a product and a month. Every day it moved is coloured — green for stock coming in, red for stock going out. Hover a day to see the exact quantities and expense."
      />
      <ProductCalendarClient
        products={(stockRes.data as CurrentStockRow[]) ?? []}
        categories={(catRes.data as Category[]) ?? []}
      />
    </div>
  );
}
