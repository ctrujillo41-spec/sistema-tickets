import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ArticleForm } from "@/components/kb/article-form";

export default async function EditKbArticlePage({ params }: { params: { id: string } }) {
  await requireRole(["admin", "agent"]);
  const supabase = createClient();

  const [{ data: article }, { data: categories }, { data: companies }] = await Promise.all([
    supabase.from("kb_articles").select("*").eq("id", params.id).single(),
    supabase.from("categories").select("*").eq("is_active", true).order("name"),
    supabase.from("companies").select("*").eq("is_active", true).order("name"),
  ]);

  if (!article) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Editar artículo</h1>
        <p className="text-sm text-muted-foreground">Actualiza el contenido o cambia su estado de publicación.</p>
      </div>

      <ArticleForm
        mode="edit"
        articleId={article.id}
        categories={categories ?? []}
        companies={companies ?? []}
        initial={{
          title: article.title,
          body: article.body,
          category_id: article.category_id,
          company_id: article.company_id,
          is_published: article.is_published,
        }}
      />
    </div>
  );
}
