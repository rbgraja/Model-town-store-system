import { createBrowserClient } from "@supabase/ssr";

/**
 * Note: intentionally not parameterized with a `Database` generic. The
 * installed supabase-js/postgrest-js version requires every table's
 * Insert/Update shape to structurally satisfy `Record<string, unknown>`
 * through a strict conditional-type check that plain hand-written
 * interfaces don't survive (only literal, non-generic object types do).
 * Rather than fight that, every call site casts `data` to the hand-written
 * types in `@/lib/types/database`, which stay the single source of truth
 * for what each table/RPC actually returns.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
