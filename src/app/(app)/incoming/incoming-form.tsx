"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, SelectInput, TextInput } from "@/components/ui/field";
import { UNITS } from "@/lib/units";
import { formatQuantity, todayISODate, nowTimeString } from "@/lib/utils";
import {
  createIncomingBatch,
  createIncomingBatchWithOutgoing,
  updateIncomingBatch,
} from "./actions";

export interface ProductSuggestion {
  name: string;
  unit: string;
}

export interface DepartmentOption {
  id: string;
  name: string;
}

export interface IncomingFormInitial {
  id: string;
  productName: string;
  unit: string;
  quantity: number;
  totalPrice: number;
  unitPrice: number;
  entryDate: string;
  entryTime: string;
  receiptUrl: string | null;
  receiptPath: string | null;
}

export function IncomingForm({
  mode,
  initial,
  productSuggestions,
  departments = [],
}: {
  mode: "create" | "edit";
  initial?: IncomingFormInitial;
  productSuggestions: ProductSuggestion[];
  departments?: DepartmentOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);

  const [productName, setProductName] = useState(initial?.productName ?? "");
  const [unit, setUnit] = useState(initial?.unit ?? UNITS[0]);
  const [quantity, setQuantity] = useState(initial?.quantity?.toString() ?? "");
  const [totalPrice, setTotalPrice] = useState(
    initial?.totalPrice?.toString() ?? ""
  );
  const [unitPrice, setUnitPrice] = useState(
    initial?.unitPrice?.toString() ?? ""
  );
  const [unitPriceTouched, setUnitPriceTouched] = useState(false);
  const [entryDate, setEntryDate] = useState(initial?.entryDate ?? todayISODate());
  const [entryTime, setEntryTime] = useState(initial?.entryTime?.slice(0, 5) ?? nowTimeString());
  const [file, setFile] = useState<File | null>(null);
  const [existingReceiptUrl] = useState(initial?.receiptUrl ?? null);

  // "Incoming + Outgoing" — issue part (or all) of this same purchase to a
  // department immediately. The outgoing quantity is entered explicitly by
  // the operator and is never auto-filled to the full incoming quantity, so
  // this also covers a plain partial outgoing (e.g. 100 in, only 30 out).
  const [withOutgoing, setWithOutgoing] = useState(false);
  const [outgoingDepartmentId, setOutgoingDepartmentId] = useState(
    departments[0]?.id ?? ""
  );
  const [outgoingQuantity, setOutgoingQuantity] = useState("");

  const outgoingExceedsIncoming =
    withOutgoing &&
    Number(outgoingQuantity) > 0 &&
    Number(quantity) > 0 &&
    Number(outgoingQuantity) > Number(quantity);
  const remainingAfterOutgoing =
    withOutgoing && Number(quantity) > 0 && Number(outgoingQuantity) > 0
      ? Number(quantity) - Number(outgoingQuantity)
      : null;

  const suggestionMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of productSuggestions) map.set(p.name.toLowerCase().trim(), p.unit);
    return map;
  }, [productSuggestions]);

  const computedUnitPrice = useMemo(() => {
    const q = Number(quantity);
    const t = Number(totalPrice);
    if (q > 0 && t >= 0) return (t / q).toFixed(4);
    return "";
  }, [quantity, totalPrice]);

  const displayUnitPrice = unitPriceTouched ? unitPrice : computedUnitPrice || unitPrice;

  function handleProductNameBlur() {
    const match = suggestionMap.get(productName.toLowerCase().trim());
    if (match) setUnit(match);
  }

  function submit() {
    startTransition(async () => {
      let receiptUrl = existingReceiptUrl;
      let receiptPath: string | null = initial?.receiptPath ?? null;

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
      if (mode === "edit" && initial) formData.set("id", initial.id);
      if (mode === "create") {
        formData.set("productName", productName);
        formData.set("unit", unit);
      }
      formData.set("quantity", quantity);
      formData.set("totalPrice", totalPrice);
      formData.set("unitPrice", displayUnitPrice || "0");
      formData.set("entryDate", entryDate);
      formData.set("entryTime", entryTime);
      if (receiptUrl) formData.set("receiptUrl", receiptUrl);
      if (receiptPath) formData.set("receiptPath", receiptPath);

      const useWithOutgoing = mode === "create" && withOutgoing;
      if (useWithOutgoing) {
        formData.set("departmentId", outgoingDepartmentId);
        formData.set("outgoingQuantity", outgoingQuantity);
      }

      const result =
        mode === "create"
          ? useWithOutgoing
            ? await createIncomingBatchWithOutgoing(formData)
            : await createIncomingBatch(formData)
          : await updateIncomingBatch(formData);

      if (result.ok) {
        toast.success(
          mode === "create"
            ? useWithOutgoing
              ? "Incoming entry saved and outgoing issued"
              : "Incoming entry saved"
            : "Incoming entry updated"
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
    <form
      action={submit}
      className="max-w-2xl space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Product Name" htmlFor="productName">
          <TextInput
            id="productName"
            list="product-suggestions"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            onBlur={handleProductNameBlur}
            required
            disabled={mode === "edit"}
            placeholder="e.g. Sugar"
          />
          <datalist id="product-suggestions">
            {productSuggestions.map((p) => (
              <option key={p.name} value={p.name} />
            ))}
          </datalist>
        </Field>

        <Field label="Unit" htmlFor="unit">
          <SelectInput
            id="unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            disabled={mode === "edit"}
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label="Quantity" htmlFor="quantity">
          <TextInput
            id="quantity"
            type="number"
            min="0.001"
            step="0.001"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </Field>

        <Field label="Total Price" htmlFor="totalPrice">
          <TextInput
            id="totalPrice"
            type="number"
            min="0"
            step="0.01"
            value={totalPrice}
            onChange={(e) => setTotalPrice(e.target.value)}
            required
          />
        </Field>

        <Field
          label="Price Per Unit"
          htmlFor="unitPrice"
          hint="Auto-calculated as Total Price / Quantity — edit to override."
        >
          <TextInput
            id="unitPrice"
            type="number"
            min="0"
            step="0.0001"
            value={displayUnitPrice}
            onChange={(e) => {
              setUnitPriceTouched(true);
              setUnitPrice(e.target.value);
            }}
            required
          />
        </Field>

        <div />

        <Field label="Date" htmlFor="entryDate">
          <TextInput
            id="entryDate"
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            required
          />
        </Field>

        <Field label="Time" htmlFor="entryTime">
          <TextInput
            id="entryTime"
            type="time"
            value={entryTime}
            onChange={(e) => setEntryTime(e.target.value)}
            required
          />
        </Field>
      </div>

      <Field
        label="Receipt Image (optional)"
        htmlFor="receipt"
        hint="JPG, PNG, WEBP or PDF, up to 5 MB."
      >
        <input
          id="receipt"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-200"
        />
        {existingReceiptUrl && !file && (
          <a
            href={`/api/files/view?path=${encodeURIComponent(initial?.receiptPath ?? "")}`}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block text-xs text-blue-600 hover:underline"
          >
            View current receipt
          </a>
        )}
      </Field>

      {mode === "create" && (
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
                Issue part of this same purchase to a department right away — enter
                only the quantity you want to send out now (
                <span className="font-medium">Outgoing from this Incoming</span>);
                the rest stays in stock.
              </span>
            </span>
          </label>
          {departments.length === 0 && (
            <p className="mt-2 text-xs text-red-600">
              Add at least one active department first to use this option.
            </p>
          )}

          {withOutgoing && (
            <div className="mt-4 grid grid-cols-1 gap-4 border-t border-gray-200 pt-4 sm:grid-cols-2">
              <Field label="Department" htmlFor="outgoingDepartmentId">
                <SelectInput
                  id="outgoingDepartmentId"
                  value={outgoingDepartmentId}
                  onChange={(e) => setOutgoingDepartmentId(e.target.value)}
                  required={withOutgoing}
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </SelectInput>
              </Field>

              <Field
                label="Outgoing Quantity"
                htmlFor="outgoingQuantity"
                hint={
                  remainingAfterOutgoing !== null
                    ? `Remaining stock after this: ${formatQuantity(remainingAfterOutgoing, unit)}`
                    : "Must not be greater than the incoming quantity."
                }
                error={
                  outgoingExceedsIncoming
                    ? "Cannot exceed the incoming quantity"
                    : undefined
                }
              >
                <TextInput
                  id="outgoingQuantity"
                  type="number"
                  min="0.001"
                  step="0.001"
                  max={quantity || undefined}
                  value={outgoingQuantity}
                  onChange={(e) => setOutgoingQuantity(e.target.value)}
                  required={withOutgoing}
                />
              </Field>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push("/incoming")}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={
            busy || (withOutgoing && (outgoingExceedsIncoming || !outgoingDepartmentId))
          }
        >
          {uploading
            ? "Uploading receipt..."
            : pending
              ? "Saving..."
              : mode === "create"
                ? withOutgoing
                  ? "Save Incoming + Outgoing"
                  : "Save Incoming Entry"
                : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
