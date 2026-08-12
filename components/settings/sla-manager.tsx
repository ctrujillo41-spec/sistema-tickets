"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/types/database";

type SlaPolicy = Tables<"sla_policies">;

const PRIORITY_ORDER = ["critica", "alta", "media", "baja", "muy_baja"];
const PRIORITY_TONE: Record<string, "danger" | "warning" | "accent" | "neutral"> = {
  critica: "danger",
  alta: "warning",
  media: "accent",
  baja: "neutral",
  muy_baja: "neutral",
};

export function SlaManager({ initial }: { initial: SlaPolicy[] }) {
  const supabase = createClient();
  const [items, setItems] = useState(
    [...initial].sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority))
  );
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Record<string, boolean>>({});

  function updateField(priority: string, field: "response_hours" | "resolution_hours", value: number) {
    setItems((prev) => prev.map((p) => (p.priority === priority ? { ...p, [field]: value } : p)));
    setDirty((prev) => ({ ...prev, [priority]: true }));
    setSavedAt((prev) => ({ ...prev, [priority]: false }));
  }

  async function handleSave(priority: string) {
    const row = items.find((p) => p.priority === priority);
    if (!row) return;

    if (row.response_hours <= 0 || row.resolution_hours <= 0) {
      setError("Las horas deben ser mayores a 0.");
      return;
    }
    if (row.response_hours > row.resolution_hours) {
      setError("El tiempo de primera respuesta no puede ser mayor al de resolución.");
      return;
    }

    setSaving(priority);
    setError(null);

    const { error } = await supabase
      .from("sla_policies")
      .update({
        response_hours: row.response_hours,
        resolution_hours: row.resolution_hours,
      })
      .eq("priority", priority);

    setSaving(null);
    if (error) {
      setError(error.message);
      return;
    }
    setDirty((prev) => ({ ...prev, [priority]: false }));
    setSavedAt((prev) => ({ ...prev, [priority]: true }));
    setTimeout(() => setSavedAt((prev) => ({ ...prev, [priority]: false })), 2000);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Estos tiempos se aplican automáticamente a cada ticket nuevo según su prioridad, y son
        los que se usan para marcar un ticket como &quot;vencido&quot;. Los cambios no afectan
        tickets ya creados, solo los nuevos.
      </p>

      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">Prioridad</th>
              <th className="px-3 py-2 font-medium">Primera respuesta (horas)</th>
              <th className="px-3 py-2 font-medium">Resolución (horas)</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.priority} className="border-b border-border last:border-0">
                <td className="px-3 py-2">
                  <Badge tone={PRIORITY_TONE[p.priority] ?? "neutral"}>{p.label}</Badge>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={1}
                    value={p.response_hours}
                    onChange={(e) =>
                      updateField(p.priority, "response_hours", Number(e.target.value))
                    }
                    className="h-8 w-24 rounded-md border border-border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-accent"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={1}
                    value={p.resolution_hours}
                    onChange={(e) =>
                      updateField(p.priority, "resolution_hours", Number(e.target.value))
                    }
                    className="h-8 w-24 rounded-md border border-border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-accent"
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  {savedAt[p.priority] ? (
                    <span className="text-xs text-success">Guardado</span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!dirty[p.priority] || saving === p.priority}
                      onClick={() => handleSave(p.priority)}
                    >
                      <Save className="h-3.5 w-3.5" />
                      {saving === p.priority ? "Guardando…" : "Guardar"}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
