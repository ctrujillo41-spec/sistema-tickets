"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  BITACORA_TIPO_LABELS,
  BITACORA_TIPO_ORDER,
  BITACORA_TIPO_TONE,
  BITACORA_STATUS_LABELS,
  BITACORA_STATUS_ORDER,
  BITACORA_STATUS_TONE,
} from "@/lib/equipos";

export interface BitacoraEntry {
  id: string;
  tipo: string;
  descripcion: string;
  status: string;
  costo: number | null;
  fecha: string;
  reportado_por: { full_name: string | null } | null;
  resuelto_por: { full_name: string | null } | null;
}

export function BitacoraSection({
  equipoId,
  initialEntries,
}: {
  equipoId: string;
  initialEntries: BitacoraEntry[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [tipo, setTipo] = useState("daño");
  const [descripcion, setDescripcion] = useState("");
  const [costo, setCosto] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!descripcion.trim()) return;
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

    const { error } = await supabase.from("equipo_bitacora").insert({
      equipo_id: equipoId,
      tipo,
      descripcion: descripcion.trim(),
      costo: costo ? Number(costo) : null,
      reportado_por: user.id,
    });

    if (error) {
      setError(error.message);
    } else {
      setDescripcion("");
      setCosto("");
      router.refresh();
    }
    setLoading(false);
  }

  async function handleStatusChange(entryId: string, newStatus: string) {
    setSavingId(entryId);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const patch: { status: string; resolved_at?: string | null; resuelto_por?: string | null } = {
      status: newStatus,
    };
    if (newStatus === "resuelto") {
      patch.resolved_at = new Date().toISOString();
      patch.resuelto_por = user?.id ?? null;
    } else {
      patch.resolved_at = null;
      patch.resuelto_por = null;
    }

    const { error } = await supabase.from("equipo_bitacora").update(patch).eq("id", entryId);
    if (error) setError(error.message);
    router.refresh();
    setSavingId(null);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">Bitácora de daños, consumibles y mejoras</p>

      <div className="space-y-2">
        {initialEntries.map((b) => (
          <div key={b.id} className="rounded-lg border border-border bg-card p-3 text-sm">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <Badge tone={BITACORA_TIPO_TONE[b.tipo] ?? "neutral"}>
                {BITACORA_TIPO_LABELS[b.tipo] ?? b.tipo}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(b.fecha).toLocaleDateString("es-MX", { dateStyle: "medium" })}
              </span>
              {b.costo != null && (
                <span className="text-xs text-muted-foreground">
                  ${Number(b.costo).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </span>
              )}
              <Select
                value={b.status}
                disabled={savingId === b.id}
                onChange={(e) => handleStatusChange(b.id, e.target.value)}
                className="ml-auto h-7 py-0 text-xs"
              >
                {BITACORA_STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {BITACORA_STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            </div>
            <p className="whitespace-pre-wrap">{b.descripcion}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Reportado por {b.reportado_por?.full_name ?? "—"}
              {b.status === "resuelto" && b.resuelto_por?.full_name && (
                <> · Resuelto por {b.resuelto_por.full_name}</>
              )}
            </p>
          </div>
        ))}
        {initialEntries.length === 0 && (
          <p className="text-sm text-muted-foreground">Sin entradas todavía.</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-2 rounded-lg border border-border p-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Tipo</label>
            <Select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full">
              {BITACORA_TIPO_ORDER.map((t) => (
                <option key={t} value={t}>
                  {BITACORA_TIPO_LABELS[t]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Costo (opcional)</label>
            <Input type="number" min="0" step="0.01" value={costo} onChange={(e) => setCosto(e.target.value)} placeholder="MXN" />
          </div>
        </div>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Qué pasó, qué se cambió, qué se necesita…"
          rows={2}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <div className="flex items-center justify-between">
          {error && <p className="text-xs text-danger">{error}</p>}
          <Button type="submit" size="sm" disabled={loading || !descripcion.trim()} className="ml-auto">
            {loading ? "Guardando…" : "Agregar entrada"}
          </Button>
        </div>
      </form>
    </div>
  );
}
