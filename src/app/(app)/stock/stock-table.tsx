"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { TextInput } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatQuantity } from "@/lib/utils";
import type { CurrentStockRow } from "@/lib/types/database";

export function StockTable({ rows }: { rows: CurrentStockRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.product_name.toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <div className="space-y-4">
      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <TextInput
          placeholder="Search products..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {filtered.map((row) => (
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
        {filtered.length === 0 && (
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
              {filtered.map((row) => (
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
              {filtered.length === 0 && (
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
