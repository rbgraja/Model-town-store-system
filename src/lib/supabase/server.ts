import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client bound to the current request's cookies.
 * Safe to use in Server Components, Server Actions, and Route Handlers.
 *
 * Not parameterized with a `Database` generic — see the note in
 * `./client.ts` for why, and `@/lib/types/database` for the hand-written
 * types every call site casts `data` to instead.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component render — proxy.ts already
            // refreshes the session cookie on the request/response cycle.
          }
        },
      },
    }
  );
}
