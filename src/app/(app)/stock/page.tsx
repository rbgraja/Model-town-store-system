import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { StockTable } from "./stock-table";
import type { CurrentStockRow } from "@/lib/types/database";

export default async function StockPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("fn_current_stock");

  return (
    <div>
      <PageHeader
        title="Stock"
        description="Live stock = total incoming quantity minus total outgoing quantity, per product."
      />
      <StockTable rows={(data as CurrentStockRow[]) ?? []} />
    </div>
  );
}
