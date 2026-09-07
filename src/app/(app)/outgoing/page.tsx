import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { FilterBar } from "@/components/filters/filter-bar";
import { OutgoingTable, type OutgoingRow } from "./outgoing-table";
import type { Department, OutgoingEntry, Product } from "@/lib/types/database";

const PAGE_SIZE = 25;

export default async function OutgoingPage({
  searchParams,
}: {
  searchParams: Promise<{
    product?: string;
    department?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const { product, department, from, to, page } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);
  const supabase = await createClient();

  const [{ data: products }, { data: departments }] = await Promise.all([
    supabase.from("products").select("id, name, unit").order("name", { ascending: true }),
    supabase.from("departments").select("id, name").order("name", { ascending: true }),
  ]);

  let query = supabase
    .from("outgoing_entries")
    .select("*", { count: "exact" })
    .order("entry_date", { ascending: false })
    .order("entry_time", { ascending: false });

  if (product) query = query.eq("product_id", product);
  if (department) query = query.eq("department_id", department);
  if (from) query = query.gte("entry_date", from);
  if (to) query = query.lte("entry_date", to);

  const rangeStart = (currentPage - 1) * PAGE_SIZE;
  query = query.range(rangeStart, rangeStart + PAGE_SIZE - 1);

  const { data: entries, count } = await query;

  const productMap = new Map(
    ((products as Pick<Product, "id" | "name" | "unit">[]) ?? []).map((p) => [p.id, p])
  );
  const departmentMap = new Map(
    ((departments as Pick<Department, "id" | "name">[]) ?? []).map((d) => [d.id, d])
  );

  const rows: OutgoingRow[] = ((entries as OutgoingEntry[]) ?? []).map((e) => ({
    id: e.id,
    entry_date: e.entry_date,
    entry_time: e.entry_time,
    product_name: productMap.get(e.product_id)?.name ?? "Unknown",
    unit: e.unit,
    quantity: Number(e.quantity),
    department_name: departmentMap.get(e.department_id)?.name ?? "Unknown",
    total_cost: Number(e.total_cost),
    notes: e.notes,
    is_override: e.is_override,
    is_void: e.is_void,
    batch_id: e.batch_id,
  }));

  return (
    <div>
      <PageHeader
        title="Outgoing"
        description="Stock issued to departments."
        action={
          <Link href="/outgoing/new">
            <Button>
              <Plus className="h-4 w-4" /> Add Outgoing
            </Button>
          </Link>
        }
      />
      <FilterBar
        basePath="/outgoing"
        products={(products as { id: string; name: string }[]) ?? []}
        departments={(departments as { id: string; name: string }[]) ?? []}
      />
      <OutgoingTable rows={rows} />
      <Pagination
        basePath="/outgoing"
        page={currentPage}
        pageSize={PAGE_SIZE}
        total={count ?? 0}
      />
    </div>
  );
}
