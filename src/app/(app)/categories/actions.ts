"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  categoryFormSchema,
  categoryUpdateSchema,
} from "@/lib/validation";
import { errorMessage } from "@/lib/utils";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createCategory(formData: FormData): Promise<ActionResult> {
  const parsed = categoryFormSchema.safeParse({
    name: formData.get("name"),
    color_hex: formData.get("color_hex"),
    sort_order: formData.get("sort_order"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("categories")
    .select("id")
    .ilike("name", parsed.data.name)
    .maybeSingle();
  if (existing) {
    return { ok: false, error: "A category with that name already exists." };
  }

  const { error } = await supabase.rpc("fn_upsert_category", {
    p_name: parsed.data.name,
    p_color_hex: parsed.data.color_hex,
    p_sort_order: parsed.data.sort_order,
  });

  if (error) return { ok: false, error: errorMessage(new Error(error.message)) };

  revalidatePath("/categories");
  revalidatePath("/products");
  revalidatePath("/stock");
  return { ok: true };
}

export async function updateCategory(formData: FormData): Promise<ActionResult> {
  const parsed = categoryUpdateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    color_hex: formData.get("color_hex"),
    sort_order: formData.get("sort_order"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("fn_update_category", {
    p_id: parsed.data.id,
    p_name: parsed.data.name,
    p_color_hex: parsed.data.color_hex,
    p_sort_order: parsed.data.sort_order,
    p_status: parsed.data.status,
  });

  if (error) return { ok: false, error: errorMessage(new Error(error.message)) };

  revalidatePath("/categories");
  revalidatePath("/products");
  revalidatePath("/stock");
  return { ok: true };
}
