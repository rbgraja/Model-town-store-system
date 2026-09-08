import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { FilterBar } from "@/components/filters/filter-bar";
import { IncomingTable, type IncomingRow } from "./incoming-table";
import type { IncomingBatch, Product } from "@/lib/types/database";

const PAGE_SIZE = 25;

export default async function IncomingPage({
  searchParams,
}: {
  searchParams: Promise<{
    product?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const { product, from, to, page } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);
  const supabase = await createClient();

  const { data: products } = await supabase
    .from("products")
    .select("id, name, unit")
    .order("name", { ascending: true });

  let query = supabase
    .from("incoming_batches")
    .select("*", { count: "exact" })
    .order("entry_date", { ascending: false })
    .order("entry_time", { ascending: false });

  if (product) query = query.eq("product_id", product);
  if (from) query = query.gte("entry_date", from);
  if (to) query = query.lte("entry_date", to);

  const rangeStart = (currentPage - 1) * PAGE_SIZE;
  query = query.range(rangeStart, rangeStart + PAGE_SIZE - 1);

  const { data: batches, count } = await query;

  const productMap = new Map(
    ((products as Pick<Product, "id" | "name" | "unit">[]) ?? []).map((p) => [
      p.id,
      p,
    ])
  );

  const rows: IncomingRow[] = ((batches as IncomingBatch[]) ?? []).map((b) => ({
    id: b.id,
    entry_date: b.entry_date,
    entry_time: b.entry_time,
    product_name: productMap.get(b.product_id)?.name ?? "Unknown",
    unit: b.unit,
    quantity: Number(b.quantity),
    unit_price: Number(b.unit_price),
    total_price: Number(b.total_price),
    receipt_path: b.receipt_path,
    is_void: b.is_void,
    void_reason: b.void_reason,
    fully_untouched: Number(b.remaining_quantity) === Number(b.quantity),
    batch_id: b.batch_id,
  }));

  return (
    <div>
      <PageHeader
        title="Incoming"
        description="Purchases of grocery and store material."
        action={
          <Link href="/incoming/new">
            <Button>
              <Plus className="h-4 w-4" /> Add Incoming
            </Button>
          </Link>
        }
      />
      <FilterBar
        basePath="/incoming"
        products={(products as { id: string; name: string }[]) ?? []}
      />
      <IncomingTable rows={rows} />
      <Pagination
        basePath="/incoming"
        page={currentPage}
        pageSize={PAGE_SIZE}
        total={count ?? 0}
      />
    </div>
  );
}
