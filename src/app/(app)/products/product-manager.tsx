"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, SelectInput, TextInput } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatQuantity } from "@/lib/utils";
import { UNITS } from "@/lib/units";
import { createProduct, updateProduct } from "./actions";
import type { CurrentStockRow } from "@/lib/types/database";

export function ProductManager({ rows }: { rows: CurrentStockRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<CurrentStockRow | null>(null);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<string>(UNITS[0]);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.product_name.toLowerCase().includes(q));
  }, [rows, query]);

  function resetForm() {
    setEditing(null);
    setName("");
    setUnit(UNITS[0]);
  }

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = editing
        ? await updateProduct(formData)
        : await createProduct(formData);
      if (result.ok) {
        toast.success(editing ? "Product updated" : "Product added");
        resetForm();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function toggleStatus(row: CurrentStockRow) {
    const formData = new FormData();
    formData.set("id", row.product_id);
    formData.set("name", row.product_name);
    formData.set("unit", row.unit);
    formData.set("status", row.status === "active" ? "inactive" : "active");
    startTransition(async () => {
      const result = await updateProduct(formData);
      if (result.ok) {
        toast.success(row.status === "active" ? "Product deactivated" : "Product activated");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">
          {editing ? `Edit "${editing.product_name}"` : "Add Product"}
        </h2>
        <form
          action={submit}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          {editing && <input type="hidden" name="id" value={editing.product_id} />}
          {editing && <input type="hidden" name="status" value={editing.status} />}
          <div className="flex-1">
            <Field label="Product Name" htmlFor="product-name">
              <TextInput
                id="product-name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sugar"
                required
              />
            </Field>
          </div>
          <div className="w-40">
            <Field label="Unit" htmlFor="product-unit">
              <SelectInput
                id="product-unit"
                name="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {editing ? "Save Changes" : "Add Product"}
            </Button>
            {editing && (
              <Button type="button" variant="secondary" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </div>

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
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Total In</th>
                <th className="px-4 py-3 text-right">Total Out</th>
                <th className="px-4 py-3 text-right">Current Stock</th>
                <th className="px-4 py-3 text-right">Avg Cost</th>
                <th className="px-4 py-3 text-right">Purchase Expense</th>
                <th className="px-4 py-3 text-right">Consumption Expense</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((row) => (
                <tr key={row.product_id}>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {row.product_name}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{row.unit}</td>
                  <td className="px-4 py-3">
                    <Badge tone={row.status === "active" ? "green" : "gray"}>
                      {row.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatQuantity(row.total_incoming_qty)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatQuantity(row.total_outgoing_qty)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-medium ${
                      row.current_stock < 0 ? "text-red-600" : "text-gray-900"
                    }`}
                  >
                    {formatQuantity(row.current_stock)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(row.avg_cost)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(row.total_purchase_expense)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(row.total_consumption_expense)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditing(row);
                          setName(row.product_name);
                          setUnit(row.unit);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant={row.status === "active" ? "secondary" : "primary"}
                        size="sm"
                        disabled={pending}
                        onClick={() => toggleStatus(row)}
                      >
                        {row.status === "active" ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-400">
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
