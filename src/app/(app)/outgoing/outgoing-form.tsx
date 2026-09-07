"use client";

import { useEffect, useId, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, SelectInput, TextInput, TextareaInput } from "@/components/ui/field";
import { formatQuantity, todayISODate, nowTimeString } from "@/lib/utils";
import { createBulkOutgoingEntries } from "./actions";
import { getOutgoingSummaryForDepartmentDate } from "./data-actions";

export interface ProductOption {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
}

export interface DepartmentOption {
  id: string;
  name: string;
}

interface Row {
  key: string;
  productId: string;
  quantity: string;
}

function emptyRow(): Row {
  return { key: Math.random().toString(36).slice(2), productId: "", quantity: "" };
}

export function OutgoingForm({
  products,
  departments,
}: {
  products: ProductOption[];
  departments: DepartmentOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const formId = useId();

  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? "");
  const [entryDate, setEntryDate] = useState(todayISODate());
  const [entryTime, setEntryTime] = useState(nowTimeString());
  const [notes, setNotes] = useState("");
  const [allowOverride, setAllowOverride] = useState(false);
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [existing, setExisting] = useState<{
    itemCount: number;
    totalCost: number;
    products: string[];
  } | null>(null);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  // Aggregate requested quantity per product across every row, so stock
  // checks account for the same product appearing on more than one row.
  const requestedByProduct = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      if (!r.productId || !(Number(r.quantity) > 0)) continue;
      map.set(r.productId, (map.get(r.productId) ?? 0) + Number(r.quantity));
    }
    return map;
  }, [rows]);

  const insufficientProducts = useMemo(() => {
    const list: { name: string; requested: number; available: number; unit: string }[] = [];
    for (const [productId, requested] of requestedByProduct.entries()) {
      const product = productMap.get(productId);
      if (!product) continue;
      if (requested > product.currentStock) {
        list.push({
          name: product.name,
          requested,
          available: product.currentStock,
          unit: product.unit,
        });
      }
    }
    return list;
  }, [requestedByProduct, productMap]);

  const hasInsufficientStock = insufficientProducts.length > 0;

  const validRows = rows.filter((r) => r.productId && Number(r.quantity) > 0);
  const duplicateProductIds = useMemo(() => {
    const seen = new Set<string>();
    const dupes = new Set<string>();
    for (const r of validRows) {
      if (seen.has(r.productId)) dupes.add(r.productId);
      seen.add(r.productId);
    }
    return dupes;
  }, [validRows]);

  // Let the operator see what's already been saved for this department/date
  // before adding more, instead of guessing whether they're duplicating work.
  useEffect(() => {
    if (!departmentId || !entryDate) return;
    let cancelled = false;
    getOutgoingSummaryForDepartmentDate(departmentId, entryDate).then((summary) => {
      if (!cancelled) setExisting(summary.itemCount > 0 ? summary : null);
    });
    return () => {
      cancelled = true;
    };
  }, [departmentId, entryDate]);

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(key: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));
  }

  function submit() {
    if (validRows.length === 0) {
      toast.error("Add at least one product with a quantity");
      return;
    }
    if (duplicateProductIds.size > 0) {
      toast.error("The same product is listed more than once — combine it into a single row");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("departmentId", departmentId);
      formData.set("entryDate", entryDate);
      formData.set("entryTime", entryTime);
      formData.set("notes", notes);
      formData.set("allowOverride", allowOverride ? "on" : "");
      formData.set(
        "items",
        JSON.stringify(
          validRows.map((r) => ({ productId: r.productId, quantity: Number(r.quantity) }))
        )
      );

      const result = await createBulkOutgoingEntries(formData);
      if (result.ok) {
        toast.success(
          validRows.length === 1
            ? "Outgoing entry saved"
            : `${validRows.length} outgoing entries saved`
        );
        router.push("/outgoing");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const noProductsOrDepartments = products.length === 0 || departments.length === 0;

  return (
    <div className="max-w-3xl space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      {/* Step 1 + 2: Department & Date, once for the whole batch */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="1. Department" htmlFor={`${formId}-departmentId`}>
          <SelectInput
            id={`${formId}-departmentId`}
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            required
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label="2. Date" htmlFor={`${formId}-entryDate`}>
          <TextInput
            id={`${formId}-entryDate`}
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            required
          />
        </Field>

        <Field label="Time" htmlFor={`${formId}-entryTime`}>
          <TextInput
            id={`${formId}-entryTime`}
            type="time"
            value={entryTime}
            onChange={(e) => setEntryTime(e.target.value)}
            required
          />
        </Field>
      </div>

      {existing && (
        <div className="rounded-md bg-blue-50 px-3 py-2.5 text-xs text-blue-800">
          <p className="font-medium">
            {existing.itemCount} outgoing {existing.itemCount === 1 ? "entry" : "entries"}{" "}
            already saved for this department on this date
          </p>
          <p className="mt-0.5 text-blue-700">
            {existing.products.slice(0, 6).join(", ")}
            {existing.products.length > 6 ? ", …" : ""} — this new save adds to them, it
            won&apos;t duplicate or replace them.
          </p>
        </div>
      )}

      {/* Step 3: product rows */}
      <div>
        <p className="text-sm font-medium text-gray-700">3. Products</p>
        <div className="mt-2 space-y-2">
          {rows.map((row, idx) => {
            const product = productMap.get(row.productId);
            const isDuplicate = row.productId && duplicateProductIds.has(row.productId);
            const rowRequested = row.productId
              ? requestedByProduct.get(row.productId) ?? 0
              : 0;
            const rowInsufficient =
              product !== undefined && rowRequested > 0 && rowRequested > product.currentStock;
            return (
              <div
                key={row.key}
                className="grid grid-cols-1 items-start gap-2 rounded-lg border border-gray-200 p-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end sm:border-0 sm:p-0"
              >
                <Field label={idx === 0 ? "Product" : undefined} htmlFor={`${row.key}-product`}>
                  <SelectInput
                    id={`${row.key}-product`}
                    value={row.productId}
                    onChange={(e) => updateRow(row.key, { productId: e.target.value })}
                  >
                    <option value="">Select a product…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </SelectInput>
                  {product && (
                    <p className="mt-1 text-xs text-gray-500">
                      Available: {formatQuantity(product.currentStock, product.unit)}
                    </p>
                  )}
                  {isDuplicate && (
                    <p className="mt-1 text-xs text-red-600">Listed more than once</p>
                  )}
                </Field>

                <Field label={idx === 0 ? "Quantity" : undefined} htmlFor={`${row.key}-qty`}>
                  <TextInput
                    id={`${row.key}-qty`}
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={row.quantity}
                    onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                    className={rowInsufficient ? "border-amber-400" : undefined}
                  />
                </Field>

                <div className={idx === 0 ? "sm:pb-0.5" : undefined}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRow(row.key)}
                    disabled={rows.length === 1}
                    aria-label="Remove product"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={addRow}>
          <Plus className="h-3.5 w-3.5" /> Add another product
        </Button>
      </div>

      <Field label="Notes (optional, applies to the whole batch)" htmlFor={`${formId}-notes`}>
        <TextareaInput
          id={`${formId}-notes`}
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>

      {hasInsufficientStock && (
        <div className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Insufficient stock</p>
            <ul className="mt-1 space-y-0.5 text-xs">
              {insufficientProducts.map((p) => (
                <li key={p.name}>
                  {p.name}: requested {formatQuantity(p.requested, p.unit)}, only{" "}
                  {formatQuantity(p.available, p.unit)} available
                </li>
              ))}
            </ul>
            <label className="mt-2 flex items-center gap-2 text-xs font-medium">
              <input
                type="checkbox"
                checked={allowOverride}
                onChange={(e) => setAllowOverride(e.target.checked)}
              />
              Allow override (issue beyond available stock for all products above)
            </label>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
        <Button type="button" variant="secondary" onClick={() => router.push("/outgoing")}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={submit}
          disabled={
            pending ||
            noProductsOrDepartments ||
            validRows.length === 0 ||
            duplicateProductIds.size > 0 ||
            (hasInsufficientStock && !allowOverride)
          }
        >
          {pending ? "Saving..." : "Save Outgoing"}
        </Button>
      </div>

      {noProductsOrDepartments && (
        <p className="text-xs text-red-600">
          {products.length === 0 && "Add a product via Incoming before issuing stock. "}
          {departments.length === 0 && "Add at least one active department first."}
        </p>
      )}
    </div>
  );
}
