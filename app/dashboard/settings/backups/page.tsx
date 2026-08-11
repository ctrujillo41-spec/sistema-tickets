import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BackupsPanel } from "@/components/settings/backups-panel";

export const dynamic = "force-dynamic";

// Fase 9 (Endurecimiento): respaldos verificados. El proyecto está en el
// plan free de Supabase (sin respaldos automáticos gestionados), así que
// la Edge Function backup-export exporta las tablas principales a un
// bucket privado todos los días (pg_cron, ver migración
// phase9_backup_cron) y deja constancia en backup_log. Esta pantalla
// muestra ese historial y permite disparar un respaldo manual o descargar
// uno anterior.
export default async function BackupsPage() {
  await requireRole(["admin"]);
  const supabase = createClient();

  const { data: rows } = await supabase
    .from("backup_log")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Respaldos</h1>
        <p className="text-sm text-muted-foreground">
          Exportación diaria automática (01:00 hora CDMX) de las tablas principales a un
          almacenamiento separado de la base de datos. Se puede ejecutar manualmente y
          descargar cualquier respaldo exitoso.
        </p>
      </div>

      <BackupsPanel initialRows={rows ?? []} />
    </div>
  );
}
