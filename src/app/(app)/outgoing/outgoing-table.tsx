"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ReasonModalForm } from "@/components/ui/reason-modal-form";
import { formatCurrency, formatDate, formatQuantity, formatTime } from "@/lib/utils";
import { voidOutgoingEntry } from "./actions";

export interface OutgoingRow {
  id: string;
  entry_date: string;
  entry_time: string;
  product_name: string;
  unit: string;
  quantity: number;
  department_name: string;
  total_cost: number;
  notes: string | null;
  is_override: boolean;
  is_void: boolean;
}

export function OutgoingTable({ rows }: { rows: OutgoingRow[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function handleVoid(formData: FormData) {
    startTransition(async () => {
      const result = await voidOutgoingEntry(formData);
      if (result.ok) {
        toast.success("Outgoing entry voided — stock returned to inventory");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="table-scroll">
        <table className="w-full whitespace-nowrap text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3 text-right">Quantity</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3 text-right">Unit Cost</th>
              <th className="px-4 py-3 text-right">Total Cost</th>
              <th className="px-4 py-3">Notes</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => (
              <tr key={r.id} className={r.is_void ? "opacity-50" : undefined}>
                <td className="px-4 py-3">{formatDate(r.entry_date)}</td>
                <td className="px-4 py-3 text-gray-500">{formatTime(r.entry_time)}</td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {r.product_name}
                  {r.is_void && (
                    <span className="ml-2">
                      <Badge tone="red">Void</Badge>
                    </span>
                  )}
                  {!r.is_void && r.is_override && (
                    <span className="ml-2">
                      <Badge tone="amber">Override</Badge>
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {formatQuantity(r.quantity, r.unit)}
                </td>
                <td className="px-4 py-3">{r.department_name}</td>
                <td className="px-4 py-3 text-right">
                  {formatCurrency(r.quantity > 0 ? r.total_cost / r.quantity : 0)}
                </td>
                <td className="px-4 py-3 text-right">{formatCurrency(r.total_cost)}</td>
                <td className="max-w-[200px] truncate px-4 py-3 text-gray-500">
                  {r.notes || "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    {!r.is_void && (
                      <ReasonModalForm
                        triggerLabel="Void"
                        title="Void this outgoing entry?"
                        description="The issued quantity will be returned to stock at its original cost."
                        confirmLabel="Void Entry"
                        action={handleVoid}
                        hiddenFields={{ id: r.id }}
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">
                  No outgoing entries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
