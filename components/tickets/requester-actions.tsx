"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function RequesterActions({
  ticketId,
  status,
  csatRating,
}: {
  ticketId: string;
  status: string;
  csatRating: number | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(csatRating ?? 0);
  const [comment, setComment] = useState("");

  async function callClose() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.rpc("close_ticket", { p_ticket_id: ticketId });
    if (error) setError(error.message);
    else router.refresh();
    setLoading(false);
  }

  async function callReopen() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.rpc("reopen_ticket", { p_ticket_id: ticketId });
    if (error) setError(error.message);
    else router.refresh();
    setLoading(false);
  }

  async function submitRating() {
    if (rating < 1) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.rpc("rate_ticket", {
      p_ticket_id: ticketId,
      p_rating: rating,
      p_comment: comment.trim() || undefined,
    });
    if (error) setError(error.message);
    else router.refresh();
    setLoading(false);
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <p className="text-xs font-medium text-muted-foreground">Tus acciones</p>

      {status === "resuelto" && (
        <Button size="sm" variant="outline" disabled={loading} onClick={callClose}>
          Confirmar y cerrar ticket
        </Button>
      )}

      {status === "cerrado" && (
        <Button size="sm" variant="outline" disabled={loading} onClick={callReopen}>
          Reabrir ticket
        </Button>
      )}

      {(status === "resuelto" || status === "cerrado") && !csatRating && (
        <div className="space-y-2 border-t border-border pt-2">
          <p className="text-xs text-muted-foreground">Califica la atención recibida</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} estrellas`}>
                <Star
                  className={cn(
                    "h-5 w-5",
                    n <= rating ? "fill-warning text-warning" : "text-muted-foreground"
                  )}
                />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Comentario opcional"
            rows={2}
            className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <Button size="sm" disabled={loading || rating < 1} onClick={submitRating}>
            Enviar calificación
          </Button>
        </div>
      )}

      {csatRating && (
        <p className="text-xs text-muted-foreground">
          Calificaste este ticket con {csatRating} de 5 estrellas. ¡Gracias!
        </p>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
