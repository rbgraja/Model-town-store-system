"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { voidReasonSchema } from "@/lib/validation";
import { errorMessage } from "@/lib/utils";

export type ActionResult = { ok: true } | { ok: false; error: string };

const usageSchema = z.object({
  departmentId: z.string().uuid("Select a department"),
  productId: z.string().uuid("Select a product"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  notes: z.string().trim().max(500).optional(),
});

export async function createDepartmentUsage(formData: FormData): Promise<ActionResult> {
  const parsed = usageSchema.safeParse({
    departmentId: formData.get("departmentId"),
    productId: formData.get("productId"),
    quantity: formData.get("quantity"),
    entryDate: formData.get("entryDate"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("fn_create_department_usage", {
    p_department_id: parsed.data.departmentId,
    p_product_id: parsed.data.productId,
    p_quantity: parsed.data.quantity,
    p_entry_date: parsed.data.entryDate,
    p_notes: parsed.data.notes ?? null,
  });
  if (error) return { ok: false, error: errorMessage(new Error(error.message)) };

  revalidatePath("/department-usage");
  return { ok: true };
}

const bulkSchema = z.object({
  departmentId: z.string().uuid(),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  items: z
    .array(z.object({ productId: z.string().uuid(), quantity: z.coerce.number().min(0) }))
    .min(1, "Nothing changed"),
});

/**
 * Sets that day's usage for the given products of one department. Each value
 * REPLACES whatever was saved for that product on that date (0 clears it).
 */
export async function createDepartmentUsageBulk(input: unknown): Promise<ActionResult> {
  const parsed = bulkSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  let saved = 0;
  for (const item of parsed.data.items) {
    const { error } = await supabase.rpc("fn_set_department_usage", {
      p_department_id: parsed.data.departmentId,
      p_product_id: item.productId,
      p_entry_date: parsed.data.entryDate,
      p_quantity: item.quantity,
    });
    if (error) {
      revalidatePath("/department-usage");
      const msg = errorMessage(new Error(error.message));
      return { ok: false, error: saved > 0 ? `${saved} saved, then: ${msg}` : msg };
    }
    saved++;
  }

  revalidatePath("/department-usage");
  return { ok: true };
}

export async function voidDepartmentUsage(formData: FormData): Promise<ActionResult> {
  const parsed = voidReasonSchema.safeParse({
    id: formData.get("id"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("fn_void_department_usage", {
    p_id: parsed.data.id,
    p_reason: parsed.data.reason,
  });
  if (error) return { ok: false, error: errorMessage(new Error(error.message)) };

  revalidatePath("/department-usage");
  return { ok: true };
}
