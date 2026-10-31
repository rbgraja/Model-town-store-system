import type { SupabaseClient } from "@supabase/supabase-js";

export interface BatchDepartmentUsage {
  department_name: string;
  quantity: number;
  cost: number;
}

interface AllocationRow {
  incoming_batch_id: string;
  quantity: number;
  total_cost: number;
  outgoing_entries: { department_id: string; is_void: boolean } | { department_id: string; is_void: boolean }[] | null;
}

const CHUNK = 100;

/**
 * For each incoming batch, how much of it went to which department (FIFO
 * allocations of non-void outgoing entries). Chunked so a long report range
 * never overflows the PostgREST URL limit with a huge `in (...)` list.
 */
export async function fetchBatchDepartmentUsage(
  supabase: SupabaseClient,
  batchIds: string[]
): Promise<Map<string, BatchDepartmentUsage[]>> {
  const result = new Map<string, BatchDepartmentUsage[]>();
  if (batchIds.length === 0) return result;

  const { data: departments } = await supabase.from("departments").select("id, name");
  const deptName = new Map((departments ?? []).map((d) => [d.id as string, d.name as string]));

  for (let i = 0; i < batchIds.length; i += CHUNK) {
    const { data } = await supabase
      .from("outgoing_allocations")
      .select("incoming_batch_id, quantity, total_cost, outgoing_entries(department_id, is_void)")
      .in("incoming_batch_id", batchIds.slice(i, i + CHUNK));

    for (const a of (data as unknown as AllocationRow[]) ?? []) {
      const entry = Array.isArray(a.outgoing_entries) ? a.outgoing_entries[0] : a.outgoing_entries;
      if (!entry || entry.is_void) continue;
      const name = deptName.get(entry.department_id) ?? "Unknown";
      const list = result.get(a.incoming_batch_id) ?? [];
      const existing = list.find((u) => u.department_name === name);
      if (existing) {
        existing.quantity += Number(a.quantity);
        existing.cost += Number(a.total_cost);
      } else {
        list.push({ department_name: name, quantity: Number(a.quantity), cost: Number(a.total_cost) });
      }
      result.set(a.incoming_batch_id, list);
    }
  }
  return result;
}
