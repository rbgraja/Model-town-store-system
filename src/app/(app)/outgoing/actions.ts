"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { bulkOutgoingEntrySchema, outgoingEntrySchema, voidReasonSchema } from "@/lib/validation";
import { errorMessage } from "@/lib/utils";

export type ActionResult = { ok: true } | { ok: false; error: string };

function revalidateAll() {
  revalidatePath("/outgoing");
  revalidatePath("/products");
  revalidatePath("/stock");
  revalidatePath("/");
}

export async function createOutgoingEntry(
  formData: FormData
): Promise<ActionResult> {
  const parsed = outgoingEntrySchema.safeParse({
    productId: formData.get("productId"),
    departmentId: formData.get("departmentId"),
    quantity: formData.get("quantity"),
    entryDate: formData.get("entryDate"),
    entryTime: formData.get("entryTime"),
    notes: formData.get("notes") || undefined,
    allowOverride: formData.get("allowOverride") === "on",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("fn_process_outgoing", {
    p_product_id: parsed.data.productId,
    p_department_id: parsed.data.departmentId,
    p_quantity: parsed.data.quantity,
    p_entry_date: parsed.data.entryDate,
    p_entry_time: parsed.data.entryTime,
    p_notes: parsed.data.notes ?? null,
    p_allow_override: parsed.data.allowOverride,
  });

  if (error) return { ok: false, error: errorMessage(new Error(error.message)) };

  revalidateAll();
  return { ok: true };
}

export async function createBulkOutgoingEntries(
  formData: FormData
): Promise<ActionResult> {
  let items: unknown;
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { ok: false, error: "Invalid product list" };
  }

  const parsed = bulkOutgoingEntrySchema.safeParse({
    departmentId: formData.get("departmentId"),
    entryDate: formData.get("entryDate"),
    entryTime: formData.get("entryTime"),
    notes: formData.get("notes") || undefined,
    allowOverride: formData.get("allowOverride") === "on",
    items,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("fn_process_outgoing_bulk", {
    p_department_id: parsed.data.departmentId,
    p_entry_date: parsed.data.entryDate,
    p_entry_time: parsed.data.entryTime,
    p_items: parsed.data.items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
    p_notes: parsed.data.notes ?? null,
    p_allow_override: parsed.data.allowOverride,
  });

  if (error) return { ok: false, error: errorMessage(new Error(error.message)) };

  revalidateAll();
  return { ok: true };
}

export async function voidOutgoingEntry(
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
  const { error } = await supabase.rpc("fn_void_outgoing_entry", {
    p_entry_id: parsed.data.id,
    p_reason: parsed.data.reason,
  });

  if (error) return { ok: false, error: errorMessage(new Error(error.message)) };

  revalidateAll();
  return { ok: true };
}
