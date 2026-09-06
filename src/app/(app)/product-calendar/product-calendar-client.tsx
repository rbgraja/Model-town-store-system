"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelectInput } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatQuantity, monthName } from "@/lib/utils";
import type {
  Category,
  CurrentStockRow,
  ProductCalendarRow,
} from "@/lib/types/database";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// Turn (year, monthIndex 0-11) into a padded 6-week grid — each cell is
// either { iso, day, inMonth } or null. First column is Sunday, matching
// WEEKDAY_LABELS above.
function buildMonthGrid(year: number, monthIdx: number) {
  const first = new Date(Date.UTC(year, monthIdx, 1));
  const startDow = first.getUTCDay(); // 0=Sun
  const daysInMonth = new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();

  const cells: Array<{ iso: string; day: number } | null> = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ iso: isoDate(year, monthIdx + 1, d), day: d });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

interface Props {
  products: CurrentStockRow[];
  categories: Category[];
}

export function ProductCalendarClient({ products, categories }: Props) {
  const now = new Date();
  const [productId, setProductId] = useState<string>(products[0]?.product_id ?? "");
  const [year, setYear] = useState(now.getFullYear());
  const [monthIdx, setMonthIdx] = useState(now.getMonth());
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [rows, setRows] = useState<ProductCalendarRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedProduct = products.find((p) => p.product_id === productId) ?? null;

  const filteredProducts = useMemo(() => {
    if (!categoryFilter) return products;
    if (categoryFilter === "__none__") return products.filter((p) => !p.category_id);
    return products.filter((p) => p.category_id === categoryFilter);
  }, [products, categoryFilter]);

  const grid = useMemo(() => buildMonthGrid(year, monthIdx), [year, monthIdx]);

  const dataByDate = useMemo(() => {
    const m = new Map<string, ProductCalendarRow>();
    for (const r of rows) m.set(r.entry_date, r);
    return m;
  }, [rows]);

  const monthTotals = useMemo(() => {
    let inQty = 0,
      outQty = 0,
      inExp = 0,
      outExp = 0,
      inDays = 0,
      outDays = 0;
    for (const r of rows) {
      inQty += Number(r.incoming_qty);
      outQty += Number(r.outgoing_qty);
      inExp += Number(r.incoming_expense);
      outExp += Number(r.outgoing_expense);
      if (Number(r.incoming_qty) > 0) inDays++;
      if (Number(r.outgoing_qty) > 0) outDays++;
    }
    return { inQty, outQty, inExp, outExp, inDays, outDays };
  }, [rows]);

  // Colour scale: for each day compute a 0..1 intensity relative to the
  // month's max incoming/outgoing, so a busy day pops but a whole-month
  // view stays readable when volumes are tiny.
  const maxIn = useMemo(
    () => rows.reduce((m, r) => Math.max(m, Number(r.incoming_qty)), 0),
    [rows]
  );
  const maxOut = useMemo(
    () => rows.reduce((m, r) => Math.max(m, Number(r.outgoing_qty)), 0),
    [rows]
  );

  useEffect(() => {
    if (!productId) {
      setRows([]);
      return;
    }
    const abort = new AbortController();
    setLoading(true);
    setError(null);
    const from = isoDate(year, monthIdx + 1, 1);
    const lastDay = new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();
    const to = isoDate(year, monthIdx + 1, lastDay);
    const supabase = createClient();
    (async () => {
      try {
        const { data, error } = await supabase.rpc("fn_product_calendar", {
          p_product_id: productId,
          p_from: from,
          p_to: to,
        });
        if (abort.signal.aborted) return;
        if (error) {
          setError(error.message);
          setRows([]);
        } else {
          setRows((data as ProductCalendarRow[]) ?? []);
        }
      } catch (e) {
        if (!abort.signal.aborted) {
          setError(e instanceof Error ? e.message : String(e));
          setRows([]);
        }
      } finally {
        if (!abort.signal.aborted) setLoading(false);
      }
    })();
    return () => abort.abort();
  }, [productId, year, monthIdx]);

  function prevMonth() {
    if (monthIdx === 0) {
      setMonthIdx(11);
      setYear((y) => y - 1);
    } else setMonthIdx((m) => m - 1);
  }
  function nextMonth() {
    if (monthIdx === 11) {
      setMonthIdx(0);
      setYear((y) => y + 1);
    } else setMonthIdx((m) => m + 1);
  }
  function goToday() {
    const t = new Date();
    setYear(t.getFullYear());
    setMonthIdx(t.getMonth());
  }

  return (
    <div className="space-y-4">
      {/* --- controls row --------------------------------------------------- */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
          <div className="sm:col-span-3">
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Filter by category
            </label>
            <SelectInput
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All categories</option>
              <option value="__none__">— Uncategorized —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </SelectInput>
          </div>
          <div className="sm:col-span-5">
            <label className="mb-1 block text-xs font-medium text-gray-500">Product</label>
            <SelectInput
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              {filteredProducts.length === 0 && <option value="">No products</option>}
              {filteredProducts.map((p) => (
                <option key={p.product_id} value={p.product_id}>
                  {p.product_name}
                  {p.category_name ? `  ·  ${p.category_name}` : ""}
                </option>
              ))}
            </SelectInput>
          </div>
          <div className="sm:col-span-4 flex items-end gap-2">
            <Button variant="secondary" size="sm" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[9rem] text-center text-sm font-semibold text-gray-900">
              {monthName(monthIdx + 1)} {year}
            </div>
            <Button variant="secondary" size="sm" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="sm" onClick={goToday}>
              Today
            </Button>
          </div>
        </div>
      </div>

      {/* --- KPI strip ------------------------------------------------------ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat
          label="Incoming this month"
          value={`${formatQuantity(monthTotals.inQty)} ${selectedProduct?.unit ?? ""}`}
          sub={`${monthTotals.inDays} day${monthTotals.inDays === 1 ? "" : "s"} · ${formatCurrency(monthTotals.inExp)}`}
          tone="green"
          icon={<ArrowDownToLine className="h-4 w-4" />}
        />
        <MiniStat
          label="Outgoing this month"
          value={`${formatQuantity(monthTotals.outQty)} ${selectedProduct?.unit ?? ""}`}
          sub={`${monthTotals.outDays} day${monthTotals.outDays === 1 ? "" : "s"} · ${formatCurrency(monthTotals.outExp)}`}
          tone="red"
          icon={<ArrowUpFromLine className="h-4 w-4" />}
        />
        <MiniStat
          label="Net movement"
          value={`${formatQuantity(monthTotals.inQty - monthTotals.outQty)} ${selectedProduct?.unit ?? ""}`}
          sub={
            monthTotals.inQty - monthTotals.outQty >= 0
              ? "grew during the month"
              : "shrunk during the month"
          }
        />
        <MiniStat
          label="Current stock"
          value={
            selectedProduct
              ? `${formatQuantity(selectedProduct.current_stock)} ${selectedProduct.unit}`
              : "—"
          }
          sub={
            selectedProduct
              ? `${formatCurrency(selectedProduct.current_stock_value)} · avg ${formatCurrency(selectedProduct.avg_cost)}`
              : ""
          }
        />
      </div>

      {/* --- calendar heatmap ---------------------------------------------- */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {error && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase text-gray-500">
          {WEEKDAY_LABELS.map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map((cell, i) => {
            if (!cell) return <div key={i} className="h-20 rounded-md bg-gray-50/50" />;
            const row = dataByDate.get(cell.iso);
            const inQty = row ? Number(row.incoming_qty) : 0;
            const outQty = row ? Number(row.outgoing_qty) : 0;
            const inAlpha = maxIn > 0 ? Math.max(0.15, inQty / maxIn) : 0;
            const outAlpha = maxOut > 0 ? Math.max(0.15, outQty / maxOut) : 0;
            const hasIn = inQty > 0;
            const hasOut = outQty > 0;

            const tooltip = row
              ? [
                  `${cell.iso}`,
                  hasIn
                    ? `IN  ${formatQuantity(inQty)} ${selectedProduct?.unit ?? ""}  (${formatCurrency(Number(row.incoming_expense))})`
                    : "",
                  hasOut
                    ? `OUT ${formatQuantity(outQty)} ${selectedProduct?.unit ?? ""}  (${formatCurrency(Number(row.outgoing_expense))})`
                    : "",
                ]
                  .filter(Boolean)
                  .join("\n")
              : `${cell.iso}\nno movement`;

            return (
              <div
                key={i}
                title={tooltip}
                className="relative h-20 overflow-hidden rounded-md border border-gray-200 bg-white"
              >
                {/* two coloured stripes: top = incoming (green), bottom = outgoing (red) */}
                {hasIn && (
                  <div
                    className="absolute inset-x-0 top-0 h-1/2"
                    style={{ backgroundColor: `rgba(16, 185, 129, ${inAlpha})` }}
                  />
                )}
                {hasOut && (
                  <div
                    className="absolute inset-x-0 bottom-0 h-1/2"
                    style={{ backgroundColor: `rgba(239, 68, 68, ${outAlpha})` }}
                  />
                )}
                <div className="relative flex h-full flex-col p-1 text-[10px]">
                  <div className="text-right text-gray-600">{cell.day}</div>
                  <div className="mt-auto space-y-0.5 font-medium">
                    {hasIn && (
                      <div className="text-emerald-900">
                        +{formatQuantity(inQty)}
                      </div>
                    )}
                    {hasOut && (
                      <div className="text-red-900">−{formatQuantity(outQty)}</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-gray-500">
          <div className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm bg-emerald-500" />
            Incoming (top stripe)
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm bg-red-500" />
            Outgoing (bottom stripe)
          </div>
          <div className="ml-auto">
            {loading ? "Loading…" : `${rows.length} active day${rows.length === 1 ? "" : "s"}`}
          </div>
        </div>
      </div>

      {/* --- daily list ---------------------------------------------------- */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">Day-by-day movement</h3>
          <p className="text-xs text-gray-500">
            Only days with at least one movement are shown.
          </p>
        </div>
        <div className="table-scroll">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2 text-right">In qty</th>
                <th className="px-4 py-2 text-right">In expense</th>
                <th className="px-4 py-2 text-right">Out qty</th>
                <th className="px-4 py-2 text-right">Out expense</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.entry_date}>
                  <td className="px-4 py-2 font-medium text-gray-900">{r.entry_date}</td>
                  <td className="px-4 py-2 text-right text-emerald-700">
                    {Number(r.incoming_qty) > 0 ? `+${formatQuantity(r.incoming_qty)}` : "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {Number(r.incoming_expense) > 0
                      ? formatCurrency(r.incoming_expense)
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-right text-red-700">
                    {Number(r.outgoing_qty) > 0 ? `−${formatQuantity(r.outgoing_qty)}` : "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {Number(r.outgoing_expense) > 0
                      ? formatCurrency(r.outgoing_expense)
                      : "—"}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                    {loading
                      ? "Loading…"
                      : `No movement for this product in ${monthName(monthIdx + 1)} ${year}.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  sub,
  tone,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "green" | "red";
  icon?: React.ReactNode;
}) {
  const iconWrap =
    tone === "green"
      ? "bg-emerald-50 text-emerald-600"
      : tone === "red"
        ? "bg-red-50 text-red-600"
        : "bg-gray-100 text-gray-600";
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">{label}</p>
        {icon && <div className={`rounded-md p-1 ${iconWrap}`}>{icon}</div>}
      </div>
      <p className="mt-2 text-lg font-semibold text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}
