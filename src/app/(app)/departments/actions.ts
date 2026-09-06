"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  departmentFormSchema,
  departmentUpdateSchema,
} from "@/lib/validation";
import { errorMessage } from "@/lib/utils";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createDepartment(
  formData: FormData
): Promise<ActionResult> {
  const parsed = departmentFormSchema.safeParse({
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("departments")
    .select("id")
    .ilike("name", parsed.data.name)
    .maybeSingle();
  if (existing) {
    return { ok: false, error: "A department with that name already exists." };
  }

  const { error } = await supabase.rpc("fn_upsert_department", {
    p_name: parsed.data.name,
  });

  if (error) return { ok: false, error: errorMessage(new Error(error.message)) };

  revalidatePath("/departments");
  return { ok: true };
}

export async function updateDepartment(
  formData: FormData
): Promise<ActionResult> {
  const parsed = departmentUpdateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("fn_update_department", {
    p_id: parsed.data.id,
    p_name: parsed.data.name,
    p_status: parsed.data.status,
  });

  if (error) return { ok: false, error: errorMessage(new Error(error.message)) };

  revalidatePath("/departments");
  return { ok: true };
}
