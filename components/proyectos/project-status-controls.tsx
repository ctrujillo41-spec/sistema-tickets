"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Select } from "@/components/ui/select";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_ORDER } from "@/lib/proyectos";
import { PRIORITY_LABELS, PRIORITY_ORDER } from "@/lib/tickets";
import type { TablesUpdate } from "@/types/database";

type ProjectPatch = TablesUpdate<"proyectos">;

interface StaffOption {
  id: string;
  full_name: string | null;
}

export function ProjectStatusControls({
  proyectoId,
  initialStatus,
  initialPriority,
  initialResponsableId,
  staff,
}: {
  proyectoId: string;
  initialStatus: string;
  initialPriority: string;
  initialResponsableId: string | null;
  staff: StaffOption[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [status, setStatus] = useState(initialStatus);
  const [priority, setPriority] = useState(initialPriority);
  const [responsableId, setResponsableId] = useState(initialResponsableId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function persist(patch: ProjectPatch) {
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("proyectos").update(patch).eq("id", proyectoId);
    if (error) {
      setError(error.message);
    } else {
      router.refresh();
    }
    setSaving(false);
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Estado</label>
        <Select
          value={status}
          disabled={saving}
          onChange={(e) => {
            setStatus(e.target.value);
            const patch: ProjectPatch = { status: e.target.value };
            if (e.target.value === "completado") patch.fecha_cierre = new Date().toISOString().slice(0, 10);
            persist(patch);
          }}
          className="w-full"
        >
          {PROJECT_STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {PROJECT_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Prioridad</label>
        <Select
          value={priority}
          disabled={saving}
          onChange={(e) => {
            setPriority(e.target.value);
            persist({ priority: e.target.value });
          }}
          className="w-full"
        >
          {PRIORITY_ORDER.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Responsable</label>
        <Select
          value={responsableId}
          disabled={saving}
          onChange={(e) => {
            setResponsableId(e.target.value);
            persist({ responsable_id: e.target.value || null });
          }}
          className="w-full"
        >
          <option value="">Sin asignar</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name ?? "—"}
            </option>
          ))}
        </Select>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
