"use client";

import { useEffect, useId, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, SelectInput, TextInput, TextareaInput } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { formatQuantity, todayISODate, nowTimeString } from "@/lib/utils";
import { getStockStatus, STOCK_STATUS_LABELS, type StockStatus } from "@/lib/stock";
import { createBulkOutgoingEntries } from "./actions";
import { getOutgoingSummaryForDepartmentDate } from "./data-actions";

export interface ProductOption {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  categoryId: string | null;
  categoryName?: string | null;
}

export interface DepartmentOption {
  id: string;
  name: string;
}

export interface CategoryOption {
  id: string;
  name: string;
}

const STOCK_BADGE_TONE: Record<StockStatus, "green" | "amber" | "red"> = {
  in_stock: "green",
  low_stock: "amber",
  out_of_stock: "red",
};

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
  categories,
}: {
  products: ProductOption[];
  departments: DepartmentOption[];
  categories: CategoryOption[];
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

  // Product-picker filters — purely local UI state, optional, and never
  // persisted: "All Categories" / "All" stock / empty search is always the
  // default whenever this form mounts. They only narrow which products show
  // up as <option>s below; they never gate which products can be selected.
  const [productCategory, setProductCategory] = useState("");
  const [productStock, setProductStock] = useState("");
  const [productSearch, setProductSearch] = useState("");

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products.filter((p) => {
      if (productCategory) {
        if (productCategory === "__none__") {
          if (p.categoryId) return false;
        } else if (p.categoryId !== productCategory) return false;
      }
      if (productStock && getStockStatus(p.currentStock) !== productStock) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, productCategory, productStock, productSearch]);

  const productFiltersActive = Boolean(productCategory || productStock || productSearch);

  function clearProductFilters() {
    setProductCategory("");
    setProductStock("");
    setProductSearch("");
  }

  // A row's own already-selected product must stay visible in its <select>
  // even if it no longer matches the active filters — filters narrow future
  // choices, they never hide or unset a choice already made.
  function optionsForRow(selectedProductId: string): ProductOption[] {
    if (!selectedProductId || filteredProducts.some((p) => p.id === selectedProductId)) {
      return filteredProducts;
    }
    const selected = productMap.get(selectedProductId);
    return selected ? [selected, ...filteredProducts] : filteredProducts;
  }

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

        {/* Optional, temporary filters — narrow the <select> options below.
            Category is never mandatory and never sticky: this state lives
            only in this component and resets whenever the form remounts. */}
        <div className="mt-2 flex flex-col gap-2 rounded-lg border border-gray-100 bg-gray-50 p-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="w-full sm:w-52">
            <label className="mb-1 block text-xs font-medium text-gray-500">Category</label>
            <SelectInput
              value={productCategory}
              onChange={(e) => setProductCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="__none__">— Uncategorized —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </SelectInput>
          </div>

          <div className="w-full sm:w-44">
            <label className="mb-1 block text-xs font-medium text-gray-500">Stock</label>
            <SelectInput value={productStock} onChange={(e) => setProductStock(e.target.value)}>
              <option value="">All</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </SelectInput>
          </div>

          <div className="relative w-full sm:w-56">
            <label className="mb-1 block text-xs font-medium text-gray-500">Search</label>
            <Search className="pointer-events-none absolute left-3 top-[calc(50%+0.5rem)] h-4 w-4 -translate-y-1/2 text-gray-400" />
            <TextInput
              placeholder="Search product…"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {productFiltersActive && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearProductFilters}
              className="w-full sm:w-auto"
            >
              <X className="h-3.5 w-3.5" /> Clear Filters
            </Button>
          )}

          <p className="w-full text-xs text-gray-400">
            {filteredProducts.length} of {products.length} products shown
          </p>
        </div>

        <div className="mt-2 space-y-2">
          {rows.map((row, idx) => {
            const product = productMap.get(row.productId);
            const isDuplicate = row.productId && duplicateProductIds.has(row.productId);
            const rowRequested = row.productId
              ? requestedByProduct.get(row.productId) ?? 0
              : 0;
            const rowInsufficient =
              product !== undefined && rowRequested > 0 && rowRequested > product.currentStock;
            const rowStockStatus = product ? getStockStatus(product.currentStock) : null;
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
                    {optionsForRow(row.productId).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </SelectInput>
                  {product && rowStockStatus && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                      Available: {formatQuantity(product.currentStock, product.unit)}
                      <Badge tone={STOCK_BADGE_TONE[rowStockStatus]}>
                        {STOCK_STATUS_LABELS[rowStockStatus]}
                      </Badge>
                    </p>
                  )}
                  {isDuplicate && (
                    <p className="mt-1 text-xs text-red-600">Listed more than once</p>
                  )}
                </Field>

                <Field
                  label={idx === 0 ? "Quantity" : undefined}
                  htmlFor={`${row.key}-qty`}
                  error={
                    rowInsufficient && product
                      ? `Only ${formatQuantity(product.currentStock, product.unit)} available`
                      : undefined
                  }
                >
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
