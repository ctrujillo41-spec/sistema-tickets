"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Comment {
  id: string;
  body: string;
  is_internal: boolean;
  created_at: string;
  author: { full_name: string | null; role: string } | null;
}

export function CommentsSection({
  ticketId,
  initialComments,
  canPostInternal,
}: {
  ticketId: string;
  initialComments: Comment[];
  canPostInternal: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Tu sesión expiró.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("ticket_comments").insert({
      ticket_id: ticketId,
      author_id: user.id,
      body: body.trim(),
      is_internal: canPostInternal ? isInternal : false,
    });

    if (error) {
      setError(error.message);
    } else {
      setBody("");
      setIsInternal(false);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">Comentarios</p>

      <div className="space-y-3">
        {initialComments.map((c) => (
          <div
            key={c.id}
            className={cn(
              "rounded-lg border p-3 text-sm",
              c.is_internal ? "border-warning/40 bg-warning/10" : "border-border bg-card"
            )}
          >
            <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{c.author?.full_name ?? "—"}</span>
              {c.is_internal && <Badge tone="warning">Interno</Badge>}
              <span className="ml-auto">
                {new Date(c.created_at).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
              </span>
            </div>
            <p className="whitespace-pre-wrap">{c.body}</p>
          </div>
        ))}
        {initialComments.length === 0 && (
          <p className="text-sm text-muted-foreground">Aún no hay comentarios.</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Escribe un comentario…"
          rows={3}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <div className="flex items-center justify-between">
          {canPostInternal ? (
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="h-4 w-4 accent-accent"
              />
              Comentario interno (no lo ve el usuario final)
            </label>
          ) : (
            <span />
          )}
          <Button type="submit" size="sm" disabled={loading || !body.trim()}>
            {loading ? "Enviando…" : "Comentar"}
          </Button>
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
      </form>
    </div>
  );
}
