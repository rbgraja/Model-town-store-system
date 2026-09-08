"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  bulkIncomingEntrySchema,
  incomingUpdateSchema,
  voidReasonSchema,
} from "@/lib/validation";
import { errorMessage } from "@/lib/utils";

export type ActionResult = { ok: true } | { ok: false; error: string };

function revalidateAll() {
  revalidatePath("/incoming");
  revalidatePath("/outgoing");
  revalidatePath("/products");
  revalidatePath("/stock");
  revalidatePath("/");
}

export async function createBulkIncomingBatches(
  formData: FormData
): Promise<ActionResult> {
  let items: unknown;
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { ok: false, error: "Invalid product list" };
  }

  const parsed = bulkIncomingEntrySchema.safeParse({
    entryDate: formData.get("entryDate"),
    entryTime: formData.get("entryTime"),
    departmentId: formData.get("departmentId") || "",
    items,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("fn_create_incoming_batch_bulk", {
    p_entry_date: parsed.data.entryDate,
    p_entry_time: parsed.data.entryTime,
    p_department_id: parsed.data.departmentId || null,
    p_items: parsed.data.items.map((i) => ({
      product_name: i.productName,
      unit: i.unit,
      quantity: i.quantity,
      total_price: i.totalPrice,
      unit_price: i.unitPrice,
      receipt_url: i.receiptUrl ?? null,
      receipt_path: i.receiptPath ?? null,
      outgoing_quantity: i.outgoingQuantity ?? null,
    })),
  });

  if (error) return { ok: false, error: errorMessage(new Error(error.message)) };

  revalidateAll();
  return { ok: true };
}

export async function updateIncomingBatch(
  formData: FormData
): Promise<ActionResult> {
  const parsed = incomingUpdateSchema.safeParse({
    id: formData.get("id"),
    quantity: formData.get("quantity"),
    totalPrice: formData.get("totalPrice"),
    unitPrice: formData.get("unitPrice"),
    entryDate: formData.get("entryDate"),
    entryTime: formData.get("entryTime"),
    receiptUrl: formData.get("receiptUrl") || undefined,
    receiptPath: formData.get("receiptPath") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("fn_update_incoming_batch", {
    p_batch_id: parsed.data.id,
    p_quantity: parsed.data.quantity,
    p_total_price: parsed.data.totalPrice,
    p_unit_price: parsed.data.unitPrice,
    p_entry_date: parsed.data.entryDate,
    p_entry_time: parsed.data.entryTime,
    p_receipt_url: parsed.data.receiptUrl ?? null,
    p_receipt_path: parsed.data.receiptPath ?? null,
  });

  if (error) return { ok: false, error: errorMessage(new Error(error.message)) };

  revalidateAll();
  return { ok: true };
}

export async function voidIncomingBatch(
  formData: FormData
): Promise<ActionResult> {
  const parsed = voidReasonSchema.safeParse({
    id: formData.get("id"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("fn_void_incoming_batch", {
    p_batch_id: parsed.data.id,
    p_reason: parsed.data.reason,
  });

  if (error) return { ok: false, error: errorMessage(new Error(error.message)) };

  revalidateAll();
  return { ok: true };
}
