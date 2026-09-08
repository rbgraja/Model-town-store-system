"use client";

import { Fragment, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReasonModalForm } from "@/components/ui/reason-modal-form";
import { formatCurrency, formatDate, formatQuantity, formatTime } from "@/lib/utils";
import { voidIncomingBatch } from "./actions";

export interface IncomingRow {
  id: string;
  entry_date: string;
  entry_time: string;
  product_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  receipt_path: string | null;
  is_void: boolean;
  void_reason: string | null;
  fully_untouched: boolean;
  batch_id: string | null;
}

interface RowGroup {
  key: string;
  isBulkBatch: boolean;
  rows: IncomingRow[];
}

// Rows created together by the bulk incoming form share a batch_id — group
// them here purely for display ("Sep 7, 2026 · 5 items") so it's visually
// obvious they were saved as one purchase, not five separate entries.
function groupByBatch(rows: IncomingRow[]): RowGroup[] {
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
  const totalPrice = group.rows.reduce((a, r) => a + r.total_price, 0);
  return (
    <div className="flex items-center justify-between rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-800">
      <span>
        {formatDate(first.entry_date)} · {group.rows.length} items
      </span>
      <span>{formatCurrency(totalPrice)}</span>
    </div>
  );
}

export function IncomingTable({ rows }: { rows: IncomingRow[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const groups = groupByBatch(rows);

  function handleVoid(formData: FormData) {
    startTransition(async () => {
      const result = await voidIncomingBatch(formData);
      if (result.ok) {
        toast.success("Incoming entry voided");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      {/* Mobile card list */}
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
                <p className="text-xs text-gray-500">
                  {formatCurrency(r.unit_price)} / unit
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-gray-500">Total Price</p>
                <p className="font-semibold text-gray-900">
                  {formatCurrency(r.total_price)}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Receipt</p>
                {r.receipt_path ? (
                  <a
                    href={`/api/files/view?path=${encodeURIComponent(r.receipt_path)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline"
                  >
                    <Eye className="h-3.5 w-3.5" /> View
                  </a>
                ) : (
                  <p className="text-gray-400">—</p>
                )}
              </div>
            </div>

            {r.is_void && (
              <div className="mt-2">
                <Badge tone="red">Void</Badge>
              </div>
            )}

            {(!r.is_void && (r.fully_untouched)) && (
              <div className="mt-3 flex flex-col-reverse gap-2 border-t border-gray-100 pt-3 sm:flex-row sm:justify-end">
                <ReasonModalForm
                  triggerLabel="Void"
                  title="Void this incoming entry?"
                  description="This purchase has not been issued to any department yet, so it can be safely voided."
                  confirmLabel="Void Entry"
                  action={handleVoid}
                  hiddenFields={{ id: r.id }}
                />
                <Link href={`/incoming/${r.id}/edit`} className="w-full sm:w-auto">
                  <Button variant="secondary" size="sm" className="w-full sm:w-auto">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                </Link>
              </div>
            )}
            {!r.is_void && !r.fully_untouched && (
              <div className="mt-3 flex justify-end border-t border-gray-100 pt-3">
                <Link href={`/incoming/${r.id}/edit`}>
                  <Button variant="secondary" size="sm">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                </Link>
              </div>
            )}
          </div>
            ))}
          </div>
        ))}
        {rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400">
            No incoming entries found.
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:block">
        <div className="table-scroll">
          <table className="w-full whitespace-nowrap text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3 text-right">Per Unit</th>
                <th className="px-4 py-3 text-right">Total Price</th>
                <th className="px-4 py-3">Receipt</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {groups.map((group) => (
                <Fragment key={group.key}>
                  {group.isBulkBatch && group.rows.length >= 2 && (
                    <tr>
                      <td colSpan={8} className="bg-blue-50 px-4 py-1.5">
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
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatQuantity(r.quantity, r.unit)}
                  </td>
                  <td className="px-4 py-3 text-right">{formatCurrency(r.unit_price)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(r.total_price)}</td>
                  <td className="px-4 py-3">
                    {r.receipt_path ? (
                      <a
                        href={`/api/files/view?path=${encodeURIComponent(r.receipt_path)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </a>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {!r.is_void && (
                        <Link href={`/incoming/${r.id}/edit`}>
                          <Button variant="secondary" size="sm">
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </Button>
                        </Link>
                      )}
                      {!r.is_void && r.fully_untouched && (
                        <ReasonModalForm
                          triggerLabel="Void"
                          title="Void this incoming entry?"
                          description="This purchase has not been issued to any department yet, so it can be safely voided."
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
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">
                    No incoming entries found.
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
