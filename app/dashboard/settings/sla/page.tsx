import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SlaManager } from "@/components/settings/sla-manager";
import { BusinessHoursManager } from "@/components/settings/business-hours-manager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

// Tiempos de SLA (primera respuesta / resolución) por prioridad, contados
// dentro del horario laboral configurado. Antes estaban fijos en el
// trigger private.set_ticket_sla(); ahora viven en sla_policies y
// business_hours (ver migraciones sla_policies_table y
// business_hours_and_sla_calc). El trigger calcula las fechas límite de
// cada ticket nuevo leyendo estas tablas.
export default async function SlaSettingsPage() {
  await requireRole(["admin"]);
  const supabase = createClient();

  const [{ data: policies }, { data: hours }, { data: settings }] = await Promise.all([
    supabase.from("sla_policies").select("*"),
    supabase.from("business_hours").select("*"),
    supabase.from("business_hours_settings").select("*").single(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">SLA y horario laboral</h1>
        <p className="text-sm text-muted-foreground">
          Tiempos de primera respuesta y resolución por prioridad, y el horario dentro del cual
          se cuentan.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>SLA por prioridad</CardTitle>
        </CardHeader>
        <CardContent>
          <SlaManager initial={policies ?? []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Horario laboral</CardTitle>
        </CardHeader>
        <CardContent>
          <BusinessHoursManager initial={hours ?? []} settings={settings ?? null} />
        </CardContent>
      </Card>
    </div>
  );
}
