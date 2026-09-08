"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { todayISODate, nowTimeString } from "@/lib/utils";
import { updateIncomingBatch } from "./actions";

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

/**
 * Editing an existing incoming batch is always single-row — creating new
 * incoming entries now goes through BulkIncomingForm (see bulk-incoming-form.tsx),
 * which lets several products be added for one date in one save.
 */
export function IncomingForm({ initial }: { initial: IncomingFormInitial }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);

  const [quantity, setQuantity] = useState(initial.quantity.toString());
  const [totalPrice, setTotalPrice] = useState(initial.totalPrice.toString());
  const [unitPrice, setUnitPrice] = useState(initial.unitPrice.toString());
  const [unitPriceTouched, setUnitPriceTouched] = useState(false);
  const [entryDate, setEntryDate] = useState(initial.entryDate ?? todayISODate());
  const [entryTime, setEntryTime] = useState(initial.entryTime?.slice(0, 5) ?? nowTimeString());
  const [file, setFile] = useState<File | null>(null);
  const [existingReceiptUrl] = useState(initial.receiptUrl);

  const computedUnitPrice =
    Number(quantity) > 0 && Number(totalPrice) >= 0
      ? (Number(totalPrice) / Number(quantity)).toFixed(4)
      : "";
  const displayUnitPrice = unitPriceTouched ? unitPrice : computedUnitPrice || unitPrice;

  function submit() {
    startTransition(async () => {
      let receiptUrl = existingReceiptUrl;
      let receiptPath: string | null = initial.receiptPath;

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
      formData.set("id", initial.id);
      formData.set("quantity", quantity);
      formData.set("totalPrice", totalPrice);
      formData.set("unitPrice", displayUnitPrice || "0");
      formData.set("entryDate", entryDate);
      formData.set("entryTime", entryTime);
      if (receiptUrl) formData.set("receiptUrl", receiptUrl);
      if (receiptPath) formData.set("receiptPath", receiptPath);

      const result = await updateIncomingBatch(formData);

      if (result.ok) {
        toast.success("Incoming entry updated");
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
        <Field label="Product Name">
          <TextInput value={initial.productName} disabled />
        </Field>

        <Field label="Unit">
          <TextInput value={initial.unit} disabled />
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
            href={`/api/files/view?path=${encodeURIComponent(initial.receiptPath ?? "")}`}
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
          {uploading ? "Uploading receipt..." : pending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
