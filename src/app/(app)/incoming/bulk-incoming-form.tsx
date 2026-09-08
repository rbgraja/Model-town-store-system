"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRightLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, SelectInput, TextInput } from "@/components/ui/field";
import { UNITS } from "@/lib/units";
import { formatQuantity, todayISODate, nowTimeString } from "@/lib/utils";
import { createBulkIncomingBatches } from "./actions";

export interface ProductSuggestion {
  name: string;
  unit: string;
}

export interface DepartmentOption {
  id: string;
  name: string;
}

interface Row {
  key: string;
  productName: string;
  unit: string;
  quantity: string;
  totalPrice: string;
  unitPrice: string;
  unitPriceTouched: boolean;
  outgoingQuantity: string;
}

function emptyRow(): Row {
  return {
    key: Math.random().toString(36).slice(2),
    productName: "",
    unit: UNITS[0],
    quantity: "",
    totalPrice: "",
    unitPrice: "",
    unitPriceTouched: false,
    outgoingQuantity: "",
  };
}

export function BulkIncomingForm({
  productSuggestions,
  departments,
}: {
  productSuggestions: ProductSuggestion[];
  departments: DepartmentOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const formId = useId();

  const [entryDate, setEntryDate] = useState(todayISODate());
  const [entryTime, setEntryTime] = useState(nowTimeString());
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [file, setFile] = useState<File | null>(null);

  // "Incoming + Outgoing" for the whole batch — one shared department, then
  // each product row below gets its own optional "send out now" quantity.
  // Off by default, and never mandatory: with it off, this is a plain bulk
  // incoming save exactly like before.
  const [withOutgoing, setWithOutgoing] = useState(false);
  const [outgoingDepartmentId, setOutgoingDepartmentId] = useState(
    departments[0]?.id ?? ""
  );

  const suggestionMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of productSuggestions) map.set(p.name.toLowerCase().trim(), p.unit);
    return map;
  }, [productSuggestions]);

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(key: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));
  }

  function displayUnitPrice(row: Row): string {
    if (row.unitPriceTouched) return row.unitPrice;
    const q = Number(row.quantity);
    const t = Number(row.totalPrice);
    if (q > 0 && t >= 0) return (t / q).toFixed(4);
    return row.unitPrice;
  }

  const validRows = rows.filter(
    (r) => r.productName.trim() && Number(r.quantity) > 0 && Number(r.totalPrice) >= 0
  );

  const rowsWithOutgoingExceeding = validRows.filter(
    (r) => Number(r.outgoingQuantity) > 0 && Number(r.outgoingQuantity) > Number(r.quantity)
  );

  function submit() {
    if (validRows.length === 0) {
      toast.error("Add at least one product with a quantity and total price");
      return;
    }
    if (withOutgoing && !outgoingDepartmentId) {
      toast.error("Select a department to send any of these products out");
      return;
    }
    if (rowsWithOutgoingExceeding.length > 0) {
      toast.error("Outgoing quantity cannot exceed the incoming quantity for a product");
      return;
    }

    startTransition(async () => {
      let receiptUrl: string | null = null;
      let receiptPath: string | null = null;

      if (file) {
        setUploading(true);
        try {
          const uploadData = new FormData();
          uploadData.set("file", file);
          const res = await fetch("/api/receipts/upload", {
            method: "POST",
            body: uploadData,
          });
          const json = await res.json();
          if (!res.ok) {
            toast.error(json.error ?? "Receipt upload failed");
            setUploading(false);
            return;
          }
          receiptUrl = json.url;
          receiptPath = json.path;
        } catch {
          toast.error("Receipt upload failed");
          setUploading(false);
          return;
        }
        setUploading(false);
      }

      const formData = new FormData();
      formData.set("entryDate", entryDate);
      formData.set("entryTime", entryTime);
      if (withOutgoing) formData.set("departmentId", outgoingDepartmentId);
      formData.set(
        "items",
        JSON.stringify(
          validRows.map((r) => ({
            productName: r.productName.trim(),
            unit: r.unit,
            quantity: Number(r.quantity),
            totalPrice: Number(r.totalPrice),
            unitPrice: Number(displayUnitPrice(r) || 0),
            receiptUrl,
            receiptPath,
            outgoingQuantity:
              withOutgoing && Number(r.outgoingQuantity) > 0 ? Number(r.outgoingQuantity) : null,
          }))
        )
      );

      const result = await createBulkIncomingBatches(formData);
      if (result.ok) {
        toast.success(
          validRows.length === 1
            ? "Incoming entry saved"
            : `${validRows.length} incoming entries saved`
        );
        router.push("/incoming");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const busy = pending || uploading;

  return (
    <div className="max-w-3xl space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      {/* Shared date/time for the whole batch */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="1. Date" htmlFor={`${formId}-entryDate`}>
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

      {/* Optional: mark some of these products to go straight out */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <label className="flex items-start gap-2.5">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            checked={withOutgoing}
            onChange={(e) => setWithOutgoing(e.target.checked)}
            disabled={departments.length === 0}
          />
          <span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
              <ArrowRightLeft className="h-3.5 w-3.5" /> Incoming + Outgoing
            </span>
            <span className="mt-0.5 block text-xs text-gray-500">
              Send some of the products below straight to a department — pick the
              department here, then enter an outgoing quantity on whichever product
              rows need it. Leave a row&apos;s outgoing quantity blank to keep all of it
              in stock.
            </span>
          </span>
        </label>
        {departments.length === 0 && (
          <p className="mt-2 text-xs text-red-600">
            Add at least one active department first to use this option.
          </p>
        )}
        {withOutgoing && (
          <div className="mt-4 border-t border-gray-200 pt-4">
            <Field label="Department" htmlFor={`${formId}-outDept`}>
              <SelectInput
                id={`${formId}-outDept`}
                value={outgoingDepartmentId}
                onChange={(e) => setOutgoingDepartmentId(e.target.value)}
                required
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>
        )}
      </div>

      {/* Product rows */}
      <div>
        <p className="text-sm font-medium text-gray-700">2. Products</p>
        <div className="mt-2 space-y-3">
          {rows.map((row) => {
            const outgoingExceeds =
              Number(row.outgoingQuantity) > 0 &&
              Number(row.outgoingQuantity) > Number(row.quantity);
            const remaining =
              withOutgoing && Number(row.outgoingQuantity) > 0 && Number(row.quantity) > 0
                ? Number(row.quantity) - Number(row.outgoingQuantity)
                : null;
            return (
              <div
                key={row.key}
                className="rounded-lg border border-gray-200 p-3 sm:p-4"
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Product Name" htmlFor={`${row.key}-name`}>
                    <TextInput
                      id={`${row.key}-name`}
                      list={`${formId}-product-suggestions`}
                      value={row.productName}
                      onChange={(e) => updateRow(row.key, { productName: e.target.value })}
                      onBlur={() => {
                        const match = suggestionMap.get(row.productName.toLowerCase().trim());
                        if (match) updateRow(row.key, { unit: match });
                      }}
                      placeholder="e.g. Sugar"
                    />
                  </Field>

                  <Field label="Unit" htmlFor={`${row.key}-unit`}>
                    <SelectInput
                      id={`${row.key}-unit`}
                      value={row.unit}
                      onChange={(e) => updateRow(row.key, { unit: e.target.value })}
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </SelectInput>
                  </Field>

                  <Field label="Quantity" htmlFor={`${row.key}-qty`}>
                    <TextInput
                      id={`${row.key}-qty`}
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={row.quantity}
                      onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                    />
                  </Field>

                  <Field label="Total Price" htmlFor={`${row.key}-total`}>
                    <TextInput
                      id={`${row.key}-total`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.totalPrice}
                      onChange={(e) => updateRow(row.key, { totalPrice: e.target.value })}
                    />
                  </Field>

                  <Field
                    label="Price Per Unit"
                    htmlFor={`${row.key}-unitPrice`}
                    hint="Auto-calculated — edit to override."
                  >
                    <TextInput
                      id={`${row.key}-unitPrice`}
                      type="number"
                      min="0"
                      step="0.0001"
                      value={displayUnitPrice(row)}
                      onChange={(e) =>
                        updateRow(row.key, { unitPriceTouched: true, unitPrice: e.target.value })
                      }
                    />
                  </Field>

                  {withOutgoing && (
                    <Field
                      label="Send Out Now (optional)"
                      htmlFor={`${row.key}-outQty`}
                      hint={
                        remaining !== null
                          ? `Remaining stock after this: ${formatQuantity(remaining, row.unit)}`
                          : undefined
                      }
                      error={outgoingExceeds ? "Cannot exceed the incoming quantity" : undefined}
                    >
                      <TextInput
                        id={`${row.key}-outQty`}
                        type="number"
                        min="0"
                        step="0.001"
                        max={row.quantity || undefined}
                        value={row.outgoingQuantity}
                        onChange={(e) => updateRow(row.key, { outgoingQuantity: e.target.value })}
                      />
                    </Field>
                  )}
                </div>

                <div className="mt-2 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRow(row.key)}
                    disabled={rows.length === 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove product
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <datalist id={`${formId}-product-suggestions`}>
          {productSuggestions.map((p) => (
            <option key={p.name} value={p.name} />
          ))}
        </datalist>

        <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={addRow}>
          <Plus className="h-3.5 w-3.5" /> Add another product
        </Button>
      </div>

      <Field
        label="Receipt Image (optional, applies to the whole purchase)"
        htmlFor={`${formId}-receipt`}
        hint="JPG, PNG, WEBP or PDF, up to 5 MB."
      >
        <input
          id={`${formId}-receipt`}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-200"
        />
      </Field>

      <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
        <Button type="button" variant="secondary" onClick={() => router.push("/incoming")}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={submit}
          disabled={
            busy ||
            validRows.length === 0 ||
            (withOutgoing && !outgoingDepartmentId) ||
            rowsWithOutgoingExceeding.length > 0
          }
        >
          {uploading ? "Uploading receipt..." : pending ? "Saving..." : "Save Incoming"}
        </Button>
      </div>
    </div>
  );
}
