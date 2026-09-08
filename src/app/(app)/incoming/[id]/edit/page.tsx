import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { IncomingForm } from "../../incoming-form";
import type { IncomingBatch, Product } from "@/lib/types/database";

export default async function EditIncomingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: batch } = await supabase
    .from("incoming_batches")
    .select("*")
    .eq("id", id)
    .single();

  if (!batch) notFound();

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", (batch as IncomingBatch).product_id)
    .single();

  return (
    <div>
      <PageHeader
        title={`Edit Incoming Entry — ${(product as Product | null)?.name ?? ""}`}
        description="Price, date and receipt can be corrected. Quantity cannot be lowered below what has already been issued."
      />
      <IncomingForm
        initial={{
          id: (batch as IncomingBatch).id,
          productName: (product as Product | null)?.name ?? "",
          unit: (batch as IncomingBatch).unit,
          quantity: Number((batch as IncomingBatch).quantity),
          totalPrice: Number((batch as IncomingBatch).total_price),
          unitPrice: Number((batch as IncomingBatch).unit_price),
          entryDate: (batch as IncomingBatch).entry_date,
          entryTime: (batch as IncomingBatch).entry_time,
          receiptUrl: (batch as IncomingBatch).receipt_url,
          receiptPath: (batch as IncomingBatch).receipt_path,
        }}
      />
    </div>
  );
}
