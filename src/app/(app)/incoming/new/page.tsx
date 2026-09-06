import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { IncomingForm } from "../incoming-form";

export default async function NewIncomingPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("name, unit")
    .order("name", { ascending: true });

  return (
    <div>
      <PageHeader
        title="Add Incoming Entry"
        description="Record a purchase of grocery or store material."
      />
      <IncomingForm mode="create" productSuggestions={data ?? []} />
    </div>
  );
}
