"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/types/database";

type BusinessHourRow = Tables<"business_hours">;
type Settings = Tables<"business_hours_settings">;

// Orden de despliegue lunes→domingo aunque en la base weekday sigue la
// convención de Postgres (0=domingo … 6=sábado, la que usa extract(dow)).
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function toHm(t: string | null): string {
  if (!t) return "";
  return t.slice(0, 5);
}

export function BusinessHoursManager({
  initial,
  settings,
}: {
  initial: BusinessHourRow[];
  settings: Settings | null;
}) {
  const supabase = createClient();
  const [items, setItems] = useState(
    [...initial].sort((a, b) => DISPLAY_ORDER.indexOf(a.weekday) - DISPLAY_ORDER.indexOf(b.weekday))
  );
  const [timezone, setTimezone] = useState(settings?.timezone ?? "America/Mexico_City");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function updateRow(weekday: number, patch: Partial<BusinessHourRow>) {
    setItems((prev) => prev.map((r) => (r.weekday === weekday ? { ...r, ...patch } : r)));
    setSaved(false);
  }

  async function handleSaveAll() {
    setError(null);

    for (const row of items) {
      if (row.is_open && (!row.open_time || !row.close_time)) {
        setError(`Falta hora de apertura o cierre en ${row.label}.`);
        return;
      }
      if (row.is_open && row.open_time! >= row.close_time!) {
        setError(`En ${row.label}, la hora de cierre debe ser después de la de apertura.`);
        return;
      }
    }

    setSaving(true);

    const { error: hoursError } = await supabase.from("business_hours").upsert(
      items.map((r) => ({
        weekday: r.weekday,
        label: r.label,
        is_open: r.is_open,
        open_time: r.is_open ? r.open_time : null,
        close_time: r.is_open ? r.close_time : null,
      }))
    );

    if (!hoursError) {
      const { error: tzError } = await supabase
        .from("business_hours_settings")
        .update({ timezone })
        .eq("singleton", true);
      if (tzError) setError(tzError.message);
    } else {
      setError(hoursError.message);
    }

    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Los tiempos de SLA (primera respuesta y resolución) se cuentan solo dentro de este
        horario. Un ticket creado fuera de horario, o cuyo SLA vence fuera de horario, se recorre
        al siguiente periodo laboral.
      </p>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Zona horaria</label>
        <select
          value={timezone}
          onChange={(e) => {
            setTimezone(e.target.value);
            setSaved(false);
          }}
          className="h-9 rounded-md border border-border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="America/Mexico_City">Ciudad de México</option>
          <option value="America/Tijuana">Tijuana</option>
          <option value="America/Hermosillo">Hermosillo</option>
          <option value="America/Cancun">Cancún</option>
        </select>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">Día</th>
              <th className="px-3 py-2 font-medium">Abierto</th>
              <th className="px-3 py-2 font-medium">Apertura</th>
              <th className="px-3 py-2 font-medium">Cierre</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.weekday} className="border-b border-border last:border-0">
                <td className="px-3 py-2">{row.label}</td>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={row.is_open}
                    onChange={(e) => updateRow(row.weekday, { is_open: e.target.checked })}
                    className="h-4 w-4 accent-accent"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="time"
                    disabled={!row.is_open}
                    value={toHm(row.open_time)}
                    onChange={(e) => updateRow(row.weekday, { open_time: e.target.value })}
                    className="h-8 rounded-md border border-border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="time"
                    disabled={!row.is_open}
                    value={toHm(row.close_time)}
                    onChange={(e) => updateRow(row.weekday, { close_time: e.target.value })}
                    className="h-8 rounded-md border border-border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSaveAll} disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? "Guardando…" : "Guardar horario"}
        </Button>
        {saved && <span className="text-xs text-success">Guardado.</span>}
      </div>
    </div>
  );
}
