import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AuditLogTable } from "@/components/settings/audit-log-table";

export const dynamic = "force-dynamic";

// Fase 9 (Endurecimiento): bitácora de cambios administrativos. Cada
// INSERT/UPDATE/DELETE en profiles, categories, subcategories, companies,
// departments y kb_articles queda registrado por un trigger en la base de
// datos (ver migración phase9_audit_log). Esta pantalla es solo de lectura,
// exclusiva para administradores.
export default async function AuditLogPage() {
  await requireRole(["admin"]);
  const supabase = createClient();

  const { data: rows } = await supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Bitácora de auditoría</h1>
        <p className="text-sm text-muted-foreground">
          Registro de altas, bajas y cambios en usuarios, catálogos y base de conocimiento.
          Muestra los últimos 500 eventos.
        </p>
      </div>

      <AuditLogTable initialRows={rows ?? []} />
    </div>
  );
}
