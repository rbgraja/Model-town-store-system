"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, SelectInput, TextInput } from "@/components/ui/field";
import { UNITS } from "@/lib/units";
import { todayISODate, nowTimeString } from "@/lib/utils";
import { createIncomingBatch, updateIncomingBatch } from "./actions";

export interface ProductSuggestion {
  name: string;
  unit: string;
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
}: {
  mode: "create" | "edit";
  initial?: IncomingFormInitial;
  productSuggestions: ProductSuggestion[];
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

      const result =
        mode === "create"
          ? await createIncomingBatch(formData)
          : await updateIncomingBatch(formData);

      if (result.ok) {
        toast.success(
          mode === "create" ? "Incoming entry saved" : "Incoming entry updated"
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

      <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push("/incoming")}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {uploading
            ? "Uploading receipt..."
            : pending
              ? "Saving..."
              : mode === "create"
                ? "Save Incoming Entry"
                : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
