"use client";

import { useTransition } from "react";
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
}

export function IncomingTable({ rows }: { rows: IncomingRow[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

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
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
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
  );
}
