import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CategoriesManager } from "@/components/settings/categories-manager";

export default async function CategoriesSettingsPage() {
  await requireRole(["admin"]);
  const supabase = createClient();

  const [{ data: categories }, { data: subcategories }, { data: companies }] = await Promise.all([
    supabase.from("categories").select("*").order("name"),
    supabase.from("subcategories").select("*").order("name"),
    supabase.from("companies").select("*").eq("is_active", true).order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Categorías y subcategorías</h1>
        <p className="text-sm text-muted-foreground">
          Una categoría puede ser general o específica de una empresa/cliente.
        </p>
      </div>
      <CategoriesManager
        initialCategories={categories ?? []}
        initialSubcategories={subcategories ?? []}
        companies={companies ?? []}
      />
    </div>
  );
}
