"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, Eye, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface KbArticleRow {
  id: string;
  title: string;
  body: string;
  is_published: boolean;
  view_count: number;
  created_at: string;
  category: { name: string } | null;
}

function snippet(body: string, len = 160) {
  const clean = body.replace(/\s+/g, " ").trim();
  return clean.length > len ? `${clean.slice(0, len)}…` : clean;
}

export function KbList({ initialArticles }: { initialArticles: KbArticleRow[] }) {
  const supabase = createClient();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KbArticleRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();

    if (!trimmed) {
      setResults(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase
        .from("kb_articles")
        .select("id, title, body, is_published, view_count, created_at, category:categories(name)")
        .textSearch("search_vector", trimmed, { type: "websearch", config: "spanish" })
        .order("view_count", { ascending: false })
        .limit(50);
      setResults((data as any) ?? []);
      setLoading(false);
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, supabase]);

  const articles = results ?? initialArticles;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar en la base de conocimiento…"
          className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
        />
      </div>

      {loading && <p className="text-xs text-muted-foreground">Buscando…</p>}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {articles.map((a) => (
          <Link key={a.id} href={`/dashboard/knowledge-base/${a.id}`}>
            <Card className="h-full transition-colors hover:border-accent">
              <CardContent className="space-y-2 pt-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-accent" />
                    <p className="text-sm font-medium">{a.title}</p>
                  </div>
                  {!a.is_published && <Badge tone="warning">Borrador</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{snippet(a.body)}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {a.category?.name && <Badge tone="accent">{a.category.name}</Badge>}
                  <span className="ml-auto flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    {a.view_count}
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {articles.length === 0 && !loading && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {query.trim() ? `Sin resultados para "${query}".` : "Aún no hay artículos publicados."}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
