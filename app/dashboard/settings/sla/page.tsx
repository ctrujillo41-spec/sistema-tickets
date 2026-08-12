import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SlaManager } from "@/components/settings/sla-manager";

export const dynamic = "force-dynamic";

// Tiempos de SLA (primera respuesta / resolución) por prioridad. Antes
// estaban fijos en el trigger private.set_ticket_sla(); ahora viven en la
// tabla sla_policies y se pueden editar aquí (ver migración
// sla_policies_table). El trigger sigue calculando las fechas límite de
// cada ticket nuevo leyendo esta tabla.
export default async function SlaSettingsPage() {
  await requireRole(["admin"]);
  const supabase = createClient();

  const { data: policies } = await supabase.from("sla_policies").select("*");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">SLA por prioridad</h1>
        <p className="text-sm text-muted-foreground">
          Tiempos de primera respuesta y resolución para cada nivel de prioridad de ticket.
        </p>
      </div>

      <SlaManager initial={policies ?? []} />
    </div>
  );
}
