import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import type { Category } from "@/lib/types/database";
import { CategoryManager } from "./category-manager";

export default async function CategoriesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  const categories = (data as Category[] | null) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Categories"
        description="Group products so reports, calendars, and the Products page are colour-coded by kind (bread, meat, dairy, cleaning, …). Every product should have one category; you can create as many as you need."
      />
      <CategoryManager categories={categories} />
    </div>
  );
}
