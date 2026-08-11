"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Select } from "@/components/ui/select";
import { STATUS_LABELS, STATUS_ORDER, PRIORITY_LABELS, PRIORITY_ORDER } from "@/lib/tickets";
import type { TablesUpdate } from "@/types/database";

type TicketPatch = TablesUpdate<"tickets">;

interface Agent {
  id: string;
  full_name: string | null;
}

export function TicketStatusControls({
  ticketId,
  initialStatus,
  initialPriority,
  initialAgentId,
  agents,
}: {
  ticketId: string;
  initialStatus: string;
  initialPriority: string;
  initialAgentId: string | null;
  agents: Agent[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [status, setStatus] = useState(initialStatus);
  const [priority, setPriority] = useState(initialPriority);
  const [agentId, setAgentId] = useState(initialAgentId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function persist(patch: TicketPatch) {
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("tickets").update(patch).eq("id", ticketId);
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
            persist({ status: e.target.value });
          }}
          className="w-full"
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
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
        <label className="text-xs font-medium text-muted-foreground">Agente asignado</label>
        <Select
          value={agentId}
          disabled={saving}
          onChange={(e) => {
            setAgentId(e.target.value);
            persist({ assigned_agent_id: e.target.value || null });
          }}
          className="w-full"
        >
          <option value="">Sin asignar</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.full_name ?? "—"}
            </option>
          ))}
        </Select>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
