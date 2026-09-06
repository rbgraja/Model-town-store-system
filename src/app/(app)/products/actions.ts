"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { productFormSchema, productUpdateSchema } from "@/lib/validation";
import { errorMessage } from "@/lib/utils";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createProduct(formData: FormData): Promise<ActionResult> {
  const parsed = productFormSchema.safeParse({
    name: formData.get("name"),
    unit: formData.get("unit"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("products")
    .select("id")
    .ilike("name", parsed.data.name)
    .maybeSingle();
  if (existing) {
    return { ok: false, error: "A product with that name already exists." };
  }

  const { error } = await supabase.rpc("fn_upsert_product", {
    p_name: parsed.data.name,
    p_unit: parsed.data.unit,
  });

  if (error) return { ok: false, error: errorMessage(new Error(error.message)) };

  revalidatePath("/products");
  return { ok: true };
}

export async function updateProduct(formData: FormData): Promise<ActionResult> {
  const parsed = productUpdateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    unit: formData.get("unit"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("fn_update_product", {
    p_id: parsed.data.id,
    p_name: parsed.data.name,
    p_unit: parsed.data.unit,
    p_status: parsed.data.status,
  });

  if (error) return { ok: false, error: errorMessage(new Error(error.message)) };

  revalidatePath("/products");
  revalidatePath("/stock");
  return { ok: true };
}
