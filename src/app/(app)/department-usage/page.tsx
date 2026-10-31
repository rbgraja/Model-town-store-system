import Link from "next/link";
import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { monthRange, todayISODate } from "@/lib/utils";
import { DatePicker } from "./date-picker";
import { UsageGrid } from "./usage-grid";

interface DeptStockRow {
  department_id: string;
  department_name: string;
  product_id: string;
  product_name: string;
  unit: string;
  opening_qty: number;
  received_qty: number;
  used_qty: number;
  remaining_qty: number;
}

export default async function DepartmentUsagePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; department?: string }>;
}) {
  const { date: dateParam, department } = await searchParams;
  const today = todayISODate();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateParam ?? "") ? (dateParam as string) : today;
  const ym = date.slice(0, 7);
  const [year, mon] = ym.split("-").map(Number);
  const [from, to] = monthRange(mon, year);

  const supabase = await createClient();
  const { data } = await supabase.rpc("fn_department_stock", { p_from: from, p_to: to });
  const all = (data as DeptStockRow[]) ?? [];

  // Departments that have any stock activity this month (or carried in).
  const depts = [...new Map(all.map((r) => [r.department_id, r.department_name])).entries()];
  const activeId = depts.find(([id]) => id === department)?.[0] ?? depts[0]?.[0];

  // What was already saved for this department on the chosen date.
  const savedByProduct = new Map<string, number>();
  if (activeId) {
    const { data: saved } = await supabase
      .from("department_usage")
      .select("product_id, quantity")
      .eq("department_id", activeId)
      .eq("entry_date", date)
      .eq("is_void", false);
    for (const s of (saved as { product_id: string; quantity: number }[]) ?? []) {
      savedByProduct.set(s.product_id, (savedByProduct.get(s.product_id) ?? 0) + Number(s.quantity));
    }
  }

  const rows = all
    .filter((r) => r.department_id === activeId)
    .map((r) => ({
      product_id: r.product_id,
      product_name: r.product_name,
      unit: r.unit,
      opening: Number(r.opening_qty),
      received: Number(r.received_qty),
      used: Number(r.used_qty),
      remaining: Number(r.remaining_qty),
      savedToday: savedByProduct.get(r.product_id) ?? 0,
    }));

  const href = (id: string) => `/department-usage?date=${date}&department=${id}`;

  return (
    <div>
      <PageHeader
        title="Department Usage"
        description="Kitna mila, kitna use hua, kitna bacha. Bacha hua maal agle mahine ke Start mein aa jata hai."
      />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <DatePicker date={date} departmentId={activeId} />
        {activeId && (
          <a
            href={`/api/reports/department?department=${activeId}&month=${ym}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <Download className="h-4 w-4" /> Download {depts.find(([id]) => id === activeId)?.[1]} ({ym})
          </a>
        )}
      </div>

      {depts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400">
          Is mahine koi department stock nahi hai.
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            {depts.map(([id, name]) => (
              <Link
                key={id}
                href={href(id)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                  id === activeId
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {name}
              </Link>
            ))}
          </div>
          <UsageGrid key={`${activeId}-${date}`} departmentId={activeId as string} rows={rows} date={date} />
        </>
      )}
    </div>
  );
}
