"use client";

import { Fragment, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { SelectInput, TextInput } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatQuantity } from "@/lib/utils";
import type { CurrentStockRow } from "@/lib/types/database";

const UNCAT_LABEL = "Uncategorized";

export function StockTable({ rows }: { rows: CurrentStockRow[] }) {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  // Deduplicate category options from the incoming rows so this component
  // stays a leaf — no separate categories query needed on the server page.
  const categoryOptions = useMemo(() => {
    const seen = new Map<string, { name: string; sort: number }>();
    for (const r of rows) {
      if (!r.category_id) continue;
      if (!seen.has(r.category_id))
        seen.set(r.category_id, {
          name: r.category_name ?? "?",
          sort: r.category_sort ?? 9999,
        });
    }
    return [...seen.entries()]
      .sort((a, b) => a[1].sort - b[1].sort || a[1].name.localeCompare(b[1].name))
      .map(([id, v]) => ({ id, name: v.name }));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !r.product_name.toLowerCase().includes(q)) return false;
      if (categoryFilter) {
        if (categoryFilter === "__none__") {
          if (r.category_id) return false;
        } else if (r.category_id !== categoryFilter) return false;
      }
      return true;
    });
  }, [rows, query, categoryFilter]);

  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { name: string; color: string; sort: number; items: CurrentStockRow[] }
    >();
    for (const r of filtered) {
      const key = r.category_id ?? "__none__";
      const label = r.category_name ?? UNCAT_LABEL;
      const color = r.category_color ?? "E5E7EB";
      const sort = r.category_id ? r.category_sort ?? 9999 : 99999;
      const bucket = map.get(key);
      if (bucket) bucket.items.push(r);
      else map.set(key, { name: label, color, sort, items: [r] });
    }
    return [...map.values()].sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <TextInput
            placeholder="Search products..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="w-full sm:w-64">
          <SelectInput
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All categories</option>
            <option value="__none__">— Uncategorized —</option>
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectInput>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-4 md:hidden">
        {grouped.map((group) => (
          <div key={group.name} className="space-y-2">
            <div
              className="rounded-md px-3 py-1.5 text-xs font-semibold uppercase text-gray-700"
              style={{ backgroundColor: `#${group.color}` }}
            >
              {group.name}
            </div>
            {group.items.map((row) => (
              <div
                key={row.product_id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-gray-900">
                      {row.product_name}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">{row.unit || "—"}</p>
                  </div>
                  <div className="text-right">
                    {row.current_stock < 0 ? (
                      <Badge tone="red">Over-issued</Badge>
                    ) : row.current_stock === 0 ? (
                      <Badge tone="amber">Out of stock</Badge>
                    ) : (
                      <Badge tone="green">In stock</Badge>
                    )}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-gray-500">Current</p>
                    <p
                      className={
                        row.current_stock < 0
                          ? "text-base font-bold text-red-600"
                          : row.current_stock === 0
                            ? "text-base font-bold text-gray-400"
                            : "text-base font-bold text-gray-900"
                      }
                    >
                      {formatQuantity(row.current_stock)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Value</p>
                    <p className="text-base font-semibold text-gray-900">
                      {formatCurrency(row.current_stock_value)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Avg Cost</p>
                    <p className="text-base font-semibold text-gray-900">
                      {formatCurrency(row.avg_cost)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
        {grouped.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400">
            No products found.
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:block">
        <div className="table-scroll">
          <table className="w-full whitespace-nowrap text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3 text-right">Current Stock</th>
                <th className="px-4 py-3 text-right">Stock Value</th>
                <th className="px-4 py-3 text-right">Avg Cost / Unit</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {grouped.map((group) => (
                <Fragment key={group.name}>
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-700"
                      style={{ backgroundColor: `#${group.color}` }}
                    >
                      {group.name}{" "}
                      <span className="ml-2 text-[10px] font-normal text-gray-600">
                        {group.items.length} product{group.items.length === 1 ? "" : "s"}
                      </span>
                    </td>
                  </tr>
                  {group.items.map((row) => (
                    <tr key={row.product_id}>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {row.product_name}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{row.unit}</td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={
                            row.current_stock < 0
                              ? "font-semibold text-red-600"
                              : row.current_stock === 0
                                ? "text-gray-400"
                                : "font-medium text-gray-900"
                          }
                        >
                          {formatQuantity(row.current_stock)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(row.current_stock_value)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(row.avg_cost)}
                      </td>
                      <td className="px-4 py-3">
                        {row.current_stock < 0 ? (
                          <Badge tone="red">Over-issued</Badge>
                        ) : row.current_stock === 0 ? (
                          <Badge tone="amber">Out of stock</Badge>
                        ) : (
                          <Badge tone="green">In stock</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
              {grouped.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                    No products found.
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
