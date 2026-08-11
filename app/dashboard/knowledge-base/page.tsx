import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { KbList } from "@/components/kb/kb-list";
import type { Role } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function KnowledgeBasePage() {
  const profile = await getCurrentProfile();
  const role = (profile?.role as Role) ?? "user";
  const isStaff = role === "admin" || role === "agent";
  const supabase = createClient();

  // RLS ya filtra: usuarios finales solo ven artículos publicados; el
  // staff ve también los borradores (sección 4.4 del documento de
  // arquitectura, mismo patrón que tickets).
  const { data } = await supabase
    .from("kb_articles")
    .select("id, title, body, is_published, view_count, created_at, category:categories(name)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Base de conocimiento</h1>
          <p className="text-sm text-muted-foreground">
            Artículos y guías para resolver dudas comunes antes de abrir un ticket.
          </p>
        </div>
        {isStaff && (
          <Link href="/dashboard/knowledge-base/new">
            <Button>
              <Plus className="h-4 w-4" />
              Nuevo artículo
            </Button>
          </Link>
        )}
      </div>

      <KbList initialArticles={(data as any) ?? []} />
    </div>
  );
}
