import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ViewCounter } from "@/components/kb/view-counter";
import type { Role } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface ArticleDetail {
  id: string;
  title: string;
  body: string;
  is_published: boolean;
  view_count: number;
  created_at: string;
  category: { name: string } | null;
  company: { name: string } | null;
  author: { full_name: string | null } | null;
}

export default async function KbArticlePage({ params }: { params: { id: string } }) {
  const profile = await getCurrentProfile();
  const role = (profile?.role as Role) ?? "user";
  const isStaff = role === "admin" || role === "agent";
  const supabase = createClient();

  const { data } = await supabase
    .from("kb_articles")
    .select(
      `id, title, body, is_published, view_count, created_at,
       category:categories(name),
       company:companies(name),
       author:profiles!kb_articles_created_by_fkey(full_name)`
    )
    .eq("id", params.id)
    .single();

  if (!data) notFound();
  const article = data as unknown as ArticleDetail;

  return (
    <div className="max-w-3xl space-y-6">
      <ViewCounter articleId={article.id} />

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold">{article.title}</h1>
          {article.category?.name && <Badge tone="accent">{article.category.name}</Badge>}
          {!article.is_published && <Badge tone="warning">Borrador</Badge>}
        </div>
        <p className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <span>Por {article.author?.full_name ?? "—"}</span>
          <span>·</span>
          <span>
            {new Date(article.created_at).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {article.view_count} vistas
          </span>
        </p>
      </div>

      <Card>
        <CardContent className="whitespace-pre-wrap pt-4 text-sm leading-relaxed">{article.body}</CardContent>
      </Card>

      {isStaff && (
        <Link href={`/dashboard/knowledge-base/${article.id}/edit`}>
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4" />
            Editar artículo
          </Button>
        </Link>
      )}
    </div>
  );
}
