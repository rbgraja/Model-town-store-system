import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { ProductManager } from "./product-manager";
import type { CurrentStockRow } from "@/lib/types/database";

export default async function ProductsPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("fn_current_stock");

  return (
    <div>
      <PageHeader
        title="Products"
        description="Every product with its running stock and expense totals."
      />
      <ProductManager rows={(data as CurrentStockRow[]) ?? []} />
    </div>
  );
}
