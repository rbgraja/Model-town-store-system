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
      <div className="relative w-full max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <TextInput
          placeholder="Search products..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
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
