"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/field";
import { formatCurrency, formatQuantity } from "@/lib/utils";
import { createDepartmentUsageBulk } from "./actions";

export interface GridRow {
  product_id: string;
  product_name: string;
  unit: string;
  opening: number;
  received: number;
  used: number;
  waste: number;
  wasteValue: number;
  remaining: number;
  /** Already saved for the selected date (0 if none). */
  savedUsed: number;
  savedWaste: number;
}

type Kind = "used" | "waste";

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
  const [entered, setEntered] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const r of rows) {
      if (r.savedUsed > 0) init[`used:${r.product_id}`] = String(r.savedUsed);
      if (r.savedWaste > 0) init[`waste:${r.product_id}`] = String(r.savedWaste);
    }
    return init;
  });

  const val = (r: GridRow, kind: Kind) => Number(entered[`${kind}:${r.product_id}`] || 0);
  const saved = (r: GridRow, kind: Kind) => (kind === "used" ? r.savedUsed : r.savedWaste);
  const changes = rows.flatMap((r) =>
    (["used", "waste"] as Kind[])
      .filter((k) => val(r, k) !== saved(r, k))
      .map((k) => ({ productId: r.product_id, kind: k, quantity: val(r, k), delta: val(r, k) - saved(r, k) }))
  )
    // Save decreases first so a row that swaps used <-> waste never trips the stock check.
    .sort((a, b) => a.delta - b.delta);
  // Used + waste together may not exceed what is left plus what this date already took.
  const limit = (r: GridRow) => r.remaining + r.savedUsed + r.savedWaste;
  const tooMuch = rows.filter((r) => val(r, "used") + val(r, "waste") > limit(r));

  function save() {
    startTransition(async () => {
      const result = await createDepartmentUsageBulk({ departmentId, entryDate: date, items: changes });
      if (result.ok) toast.success(`${changes.length} updated`);
      else toast.error(result.error);
      router.refresh();
    });
  }

  const totalWasteValue = rows.reduce((a, r) => a + r.wasteValue, 0);

  function box(r: GridRow, kind: Kind) {
    const key = `${kind}:${r.product_id}`;
    const over = val(r, "used") + val(r, "waste") > limit(r);
    return (
      <TextInput
        type="number"
        min="0"
        step="0.001"
        placeholder="0"
        value={entered[key] ?? ""}
        onChange={(e) => setEntered((p) => ({ ...p, [key]: e.target.value }))}
        className={`w-24 ${over ? "border-red-400" : ""}`}
      />
    );
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
              <th className="px-4 py-2 text-right">Waste</th>
              <th className="px-4 py-2 text-right">Waste Rs</th>
              <th className="px-4 py-2 text-right">Left</th>
              <th className="px-4 py-2">Used (this date)</th>
              <th className="px-4 py-2">Waste (this date)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => {
              const editable = limit(r) > 0;
              const isChanged = val(r, "used") !== r.savedUsed || val(r, "waste") !== r.savedWaste;
              return (
                <tr key={r.product_id} className={isChanged ? "bg-amber-50" : undefined}>
                  <td className="px-4 py-2 font-medium text-gray-900">{r.product_name}</td>
                  <td className="px-4 py-2 text-right text-gray-500">{formatQuantity(r.opening)}</td>
                  <td className="px-4 py-2 text-right text-gray-500">{formatQuantity(r.received)}</td>
                  <td className="px-4 py-2 text-right text-gray-500">{formatQuantity(r.used)}</td>
                  <td className="px-4 py-2 text-right text-gray-500">{formatQuantity(r.waste)}</td>
                  <td className="px-4 py-2 text-right text-gray-500">
                    {r.wasteValue > 0 ? formatCurrency(r.wasteValue) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold">
                    {formatQuantity(r.remaining, r.unit)}
                  </td>
                  <td className="px-4 py-1.5">
                    {editable ? box(r, "used") : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-1.5">
                    {editable ? box(r, "waste") : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-gray-50 px-4 py-3">
        <p className="text-xs text-gray-500">
          Is mahine ka total waste: <span className="font-semibold text-gray-700">{formatCurrency(totalWasteValue)}</span>
          {" · "}Jo number badlega wahi peela hoga, Save sirf wahi update karega.
        </p>
        <div className="flex items-center gap-3">
          {tooMuch.length > 0 && (
            <span className="text-xs text-red-600">
              {tooMuch[0].product_name}: used + waste max {formatQuantity(limit(tooMuch[0]), tooMuch[0].unit)}
            </span>
          )}
          <Button onClick={save} disabled={pending || changes.length === 0 || tooMuch.length > 0}>
            {pending ? "Saving…" : `Save${changes.length ? ` (${changes.length})` : ""}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
