"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/field";
import { formatQuantity } from "@/lib/utils";
import { createDepartmentUsageBulk } from "./actions";

export interface GridRow {
  product_id: string;
  product_name: string;
  unit: string;
  opening: number;
  received: number;
  used: number;
  remaining: number;
  /** Usage already saved for the selected date (0 if none). */
  savedToday: number;
}

export function UsageGrid({
  departmentId,
  rows,
  date,
}: {
  departmentId: string;
  rows: GridRow[];
  date: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Boxes start filled with what was already saved for this date, so only the
  // product that needs fixing has to be touched.
  const [entered, setEntered] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.filter((r) => r.savedToday > 0).map((r) => [r.product_id, String(r.savedToday)]))
  );

  const valueOf = (r: GridRow) => Number(entered[r.product_id] || 0);
  const changed = rows.filter((r) => valueOf(r) !== r.savedToday);
  // The most this row may hold is what is left plus what this date already used.
  const tooMuch = rows.filter((r) => valueOf(r) > r.remaining + r.savedToday);

  function save() {
    startTransition(async () => {
      const result = await createDepartmentUsageBulk({
        departmentId,
        entryDate: date,
        items: changed.map((r) => ({ productId: r.product_id, quantity: valueOf(r) })),
      });
      if (result.ok) toast.success(`${changed.length} updated`);
      else toast.error(result.error);
      router.refresh();
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="table-scroll">
        <table className="w-full whitespace-nowrap text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2 text-right">Start</th>
              <th className="px-4 py-2 text-right">Received</th>
              <th className="px-4 py-2 text-right">Used</th>
              <th className="px-4 py-2 text-right">Left</th>
              <th className="px-4 py-2">Used on this date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => {
              const editable = r.remaining + r.savedToday > 0;
              const isChanged = valueOf(r) !== r.savedToday;
              return (
                <tr key={r.product_id} className={isChanged ? "bg-amber-50" : undefined}>
                  <td className="px-4 py-2 font-medium text-gray-900">{r.product_name}</td>
                  <td className="px-4 py-2 text-right text-gray-500">{formatQuantity(r.opening)}</td>
                  <td className="px-4 py-2 text-right text-gray-500">{formatQuantity(r.received)}</td>
                  <td className="px-4 py-2 text-right text-gray-500">{formatQuantity(r.used)}</td>
                  <td className="px-4 py-2 text-right font-semibold">
                    {formatQuantity(r.remaining, r.unit)}
                  </td>
                  <td className="px-4 py-1.5">
                    {editable ? (
                      <TextInput
                        type="number"
                        min="0"
                        step="0.001"
                        placeholder="0"
                        value={entered[r.product_id] ?? ""}
                        onChange={(e) => setEntered((p) => ({ ...p, [r.product_id]: e.target.value }))}
                        className={`w-28 ${valueOf(r) > r.remaining + r.savedToday ? "border-red-400" : ""}`}
                      />
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-gray-50 px-4 py-3">
        <p className="text-xs text-gray-500">
          Jo number badlega wahi peela hoga. Save sirf wahi update karega, baaki waise hi rahenge.
        </p>
        <div className="flex items-center gap-3">
          {tooMuch.length > 0 && (
            <span className="text-xs text-red-600">
              {tooMuch[0].product_name}: max {formatQuantity(tooMuch[0].remaining + tooMuch[0].savedToday, tooMuch[0].unit)}
            </span>
          )}
          <Button onClick={save} disabled={pending || changed.length === 0 || tooMuch.length > 0}>
            {pending ? "Saving…" : `Save${changed.length ? ` (${changed.length})` : ""}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
