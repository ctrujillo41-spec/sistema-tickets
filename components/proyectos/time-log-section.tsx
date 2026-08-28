"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TimeEntry {
  id: string;
  fecha: string;
  horas: number;
  nota: string | null;
  user: { full_name: string | null } | null;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function TimeLogSection({
  proyectoId,
  initialEntries,
}: {
  proyectoId: string;
  initialEntries: TimeEntry[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [fecha, setFecha] = useState(today());
  const [horas, setHoras] = useState("");
  const [nota, setNota] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(
    () => initialEntries.reduce((sum, e) => sum + Number(e.horas), 0),
    [initialEntries]
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const horasNum = Number(horas);
    if (!horasNum || horasNum <= 0) return;
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

    const { error } = await supabase.from("proyecto_tiempos").insert({
      proyecto_id: proyectoId,
      user_id: user.id,
      fecha,
      horas: horasNum,
      nota: nota.trim() || null,
    });

    if (error) {
      setError(error.message);
    } else {
      setHoras("");
      setNota("");
      setFecha(today());
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Tiempo invertido</p>
        <span className="text-sm font-semibold tabular-nums text-accent">{total.toFixed(1)} h</span>
      </div>

      <div className="space-y-2">
        {initialEntries.map((t) => (
          <div key={t.id} className="rounded-lg border border-border bg-card p-3 text-sm">
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{t.user?.full_name ?? "—"}</span>
              <span className="flex items-center gap-2">
                <span className="tabular-nums">{Number(t.horas).toFixed(1)} h</span>
                <span>{new Date(t.fecha).toLocaleDateString("es-MX", { dateStyle: "short" })}</span>
              </span>
            </div>
            {t.nota && <p className="whitespace-pre-wrap text-muted-foreground">{t.nota}</p>}
          </div>
        ))}
        {initialEntries.length === 0 && (
          <p className="text-sm text-muted-foreground">Aún no hay tiempo registrado.</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-2 rounded-lg border border-border p-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Fecha</label>
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Horas</label>
            <Input
              type="number"
              min="0.25"
              max="24"
              step="0.25"
              value={horas}
              onChange={(e) => setHoras(e.target.value)}
              placeholder="Ej. 2.5"
              required
            />
          </div>
        </div>
        <textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Qué hiciste en ese tiempo…"
          rows={2}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <div className="flex items-center justify-between">
          {error && <p className="text-xs text-danger">{error}</p>}
          <Button type="submit" size="sm" disabled={loading || !horas} className="ml-auto">
            {loading ? "Guardando…" : "Registrar tiempo"}
          </Button>
        </div>
      </form>
    </div>
  );
}
