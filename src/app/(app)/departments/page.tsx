import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { DepartmentManager } from "./department-manager";
import type { Department } from "@/lib/types/database";

export default async function DepartmentsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("departments")
    .select("*")
    .order("name", { ascending: true });

  return (
    <div>
      <PageHeader
        title="Departments"
        description="Departments that can receive stock via outgoing entries."
      />
      <DepartmentManager departments={(data as Department[]) ?? []} />
    </div>
  );
}
