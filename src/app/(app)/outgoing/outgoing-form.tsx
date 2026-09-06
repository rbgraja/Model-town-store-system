"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, SelectInput, TextInput, TextareaInput } from "@/components/ui/field";
import { formatQuantity, todayISODate, nowTimeString } from "@/lib/utils";
import { createOutgoingEntry } from "./actions";

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

export function OutgoingForm({
  products,
  departments,
}: {
  products: ProductOption[];
  departments: DepartmentOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? "");
  const [quantity, setQuantity] = useState("");
  const [entryDate, setEntryDate] = useState(todayISODate());
  const [entryTime, setEntryTime] = useState(nowTimeString());
  const [notes, setNotes] = useState("");
  const [allowOverride, setAllowOverride] = useState(false);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId),
    [products, productId]
  );

  const insufficient =
    selectedProduct !== undefined &&
    Number(quantity) > 0 &&
    Number(quantity) > selectedProduct.currentStock;

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await createOutgoingEntry(formData);
      if (result.ok) {
        toast.success("Outgoing entry saved");
        router.push("/outgoing");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form
      action={submit}
      className="max-w-2xl space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      <input type="hidden" name="allowOverride" value={allowOverride ? "on" : ""} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Product" htmlFor="productId">
          <SelectInput
            id="productId"
            name="productId"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            required
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label="Department" htmlFor="departmentId">
          <SelectInput
            id="departmentId"
            name="departmentId"
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

        <Field
          label="Quantity"
          htmlFor="quantity"
          hint={
            selectedProduct
              ? `Available: ${formatQuantity(selectedProduct.currentStock, selectedProduct.unit)}`
              : undefined
          }
        >
          <TextInput
            id="quantity"
            name="quantity"
            type="number"
            min="0.001"
            step="0.001"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </Field>

        <div />

        <Field label="Date" htmlFor="entryDate">
          <TextInput
            id="entryDate"
            name="entryDate"
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            required
          />
        </Field>

        <Field label="Time" htmlFor="entryTime">
          <TextInput
            id="entryTime"
            name="entryTime"
            type="time"
            value={entryTime}
            onChange={(e) => setEntryTime(e.target.value)}
            required
          />
        </Field>
      </div>

      <Field label="Notes (optional)" htmlFor="notes">
        <TextareaInput
          id="notes"
          name="notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>

      {insufficient && (
        <div className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Insufficient stock</p>
            <p className="mt-0.5 text-xs">
              Only {formatQuantity(selectedProduct?.currentStock, selectedProduct?.unit)} is
              available. Enable admin override below to issue anyway.
            </p>
            <label className="mt-2 flex items-center gap-2 text-xs font-medium">
              <input
                type="checkbox"
                checked={allowOverride}
                onChange={(e) => setAllowOverride(e.target.checked)}
              />
              Allow override (issue beyond available stock)
            </label>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
        <Button type="button" variant="secondary" onClick={() => router.push("/outgoing")}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending || products.length === 0 || departments.length === 0}>
          {pending ? "Saving..." : "Save Outgoing Entry"}
        </Button>
      </div>

      {(products.length === 0 || departments.length === 0) && (
        <p className="text-xs text-red-600">
          {products.length === 0 && "Add a product via Incoming before issuing stock. "}
          {departments.length === 0 && "Add at least one active department first."}
        </p>
      )}
    </form>
  );
}
