import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ArticleForm } from "@/components/kb/article-form";

export default async function NewKbArticlePage() {
  await requireRole(["admin", "agent"]);
  const supabase = createClient();

  const [{ data: categories }, { data: companies }] = await Promise.all([
    supabase.from("categories").select("*").eq("is_active", true).order("name"),
    supabase.from("companies").select("*").eq("is_active", true).order("name"),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Nuevo artículo</h1>
        <p className="text-sm text-muted-foreground">
          Comparte una solución o guía para que los usuarios la encuentren antes de crear un ticket.
        </p>
      </div>

      <ArticleForm mode="create" categories={categories ?? []} companies={companies ?? []} />
    </div>
  );
}
