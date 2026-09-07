"use client";

import { Fragment, useTransition } from "react";
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
  batch_id: string | null;
}

interface RowGroup {
  key: string;
  isBulkBatch: boolean;
  rows: OutgoingRow[];
}

// Rows created together by the bulk outgoing form share a batch_id — group
// them here purely for display ("Kitchen — Sep 7, 2026 · 5 items") so it's
// visually obvious they were saved as one batch, not five separate entries.
function groupByBatch(rows: OutgoingRow[]): RowGroup[] {
  const groups: RowGroup[] = [];
  const indexByKey = new Map<string, number>();
  for (const r of rows) {
    const key = r.batch_id ?? r.id;
    let idx = indexByKey.get(key);
    if (idx === undefined) {
      idx = groups.length;
      indexByKey.set(key, idx);
      groups.push({ key, isBulkBatch: Boolean(r.batch_id), rows: [] });
    }
    groups[idx].rows.push(r);
  }
  return groups;
}

function BatchHeader({ group }: { group: RowGroup }) {
  if (!group.isBulkBatch || group.rows.length < 2) return null;
  const first = group.rows[0];
  const totalCost = group.rows.reduce((a, r) => a + r.total_cost, 0);
  return (
    <div className="flex items-center justify-between rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-800">
      <span>
        {first.department_name} — {formatDate(first.entry_date)} · {group.rows.length} items
      </span>
      <span>{formatCurrency(totalCost)}</span>
    </div>
  );
}

export function OutgoingTable({ rows }: { rows: OutgoingRow[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const groups = groupByBatch(rows);

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
    <>
      {/* Mobile: card list — one card per entry, easy to read with a thumb */}
      <div className="space-y-3 md:hidden">
        {groups.map((group) => (
          <div key={group.key} className="space-y-2">
            <BatchHeader group={group} />
            {group.rows.map((r) => (
        <div
            key={r.id}
            className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${
              r.is_void ? "opacity-60" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-gray-900">
                  {r.product_name}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {formatDate(r.entry_date)} · {formatTime(r.entry_time)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">
                  {formatQuantity(r.quantity, r.unit)}
                </p>
                <p className="text-xs text-gray-500">{formatCurrency(r.total_cost)}</p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700">
                → {r.department_name}
              </span>
              {r.is_void && <Badge tone="red">Void</Badge>}
              {!r.is_void && r.is_override && <Badge tone="amber">Override</Badge>}
            </div>

            {r.notes && (
              <p className="mt-2 rounded-md bg-gray-50 px-2.5 py-1.5 text-xs text-gray-600">
                {r.notes}
              </p>
            )}

            {!r.is_void && (
              <div className="mt-3 flex justify-end border-t border-gray-100 pt-3">
                <ReasonModalForm
                  triggerLabel="Void this entry"
                  title="Void this outgoing entry?"
                  description="The issued quantity will be returned to stock at its original cost."
                  confirmLabel="Void Entry"
                  action={handleVoid}
                  hiddenFields={{ id: r.id }}
                />
              </div>
            )}
          </div>
            ))}
          </div>
        ))}
        {rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400">
            No outgoing entries found.
          </div>
        )}
      </div>

      {/* Desktop: classic table */}
      <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:block">
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
              {groups.map((group) => (
                <Fragment key={group.key}>
                  {group.isBulkBatch && group.rows.length >= 2 && (
                    <tr>
                      <td colSpan={9} className="bg-blue-50 px-4 py-1.5">
                        <BatchHeader group={group} />
                      </td>
                    </tr>
                  )}
                  {group.rows.map((r) => (
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
                </Fragment>
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
    </>
  );
}
