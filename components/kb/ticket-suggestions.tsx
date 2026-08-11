"use client";

import { useEffect, useRef, useState } from "react";
import { Lightbulb, FileText, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";

interface Suggestion {
  id: string;
  title: string;
}

/**
 * Busca artículos de la base de conocimiento relevantes mientras el
 * usuario describe su problema, antes de que llegue a crear el ticket
 * (parte del flujo de "sugerencias antes de crear un ticket" del diseño).
 */
export function TicketSuggestions({ query }: { query: string }) {
  const supabase = createClient();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();

    if (trimmed.length < 5) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from("kb_articles")
        .select("id, title")
        .eq("is_published", true)
        .textSearch("search_vector", trimmed, { type: "websearch", config: "spanish" })
        .limit(4);
      setSuggestions(data ?? []);
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, supabase]);

  if (dismissed || suggestions.length === 0) return null;

  return (
    <Card className="border-accent/40 bg-accent/5">
      <CardContent className="space-y-2 pt-4">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs font-medium text-accent">
            <Lightbulb className="h-4 w-4" />
            Esto podría ayudarte antes de crear el ticket
          </p>
          <button type="button" onClick={() => setDismissed(true)} aria-label="Cerrar sugerencias">
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
        <div className="space-y-1">
          {suggestions.map((s) => (
            <a
              key={s.id}
              href={`/dashboard/knowledge-base/${s.id}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
            >
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              {s.title}
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
