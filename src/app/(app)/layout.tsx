import { createClient } from "@/lib/supabase/server";
import { Shell } from "@/components/layout/shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <Shell email={user?.email ?? null}>{children}</Shell>;
}
