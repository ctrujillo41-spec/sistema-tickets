import Link from "next/link";
import { Plus, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { withJwtSkewRetry } from "@/lib/supabase/retry";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_TONE } from "@/lib/proyectos";
import { PRIORITY_LABELS, PRIORITY_TONE } from "@/lib/tickets";

export const dynamic = "force-dynamic";

interface ProjectListRow {
  id: string;
  folio: number;
  nombre: string;
  status: string;
  priority: string;
  created_at: string;
  categoria: { name: string } | null;
  company: { name: string } | null;
  responsable: { full_name: string | null } | null;
}

export default async function ProyectosPage() {
  // Módulo interno del equipo de soporte (admin/agent): no lo ve el
  // usuario final, igual que lo aplica la RLS de la tabla proyectos.
  await requireRole(["admin", "agent"]);
  const supabase = createClient();

  const { data, error } = await withJwtSkewRetry(() =>
    supabase
      .from("proyectos")
      .select(
        `id, folio, nombre, status, priority, created_at,
         categoria:proyecto_categorias(name),
         company:companies(name),
         responsable:profiles!proyectos_responsable_id_fkey(full_name)`
      )
      .order("created_at", { ascending: false })
      .limit(200)
  );

  const proyectos = data as unknown as ProjectListRow[] | null;

  // Horas acumuladas por proyecto — consulta aparte y se agrega aquí mismo
  // en el servidor, mismo criterio que las gráficas del dashboard.
  const { data: tiempos } = await withJwtSkewRetry(() =>
    supabase.from("proyecto_tiempos").select("proyecto_id, horas")
  );

  const horasPorProyecto = new Map<string, number>();
  for (const t of (tiempos as { proyecto_id: string; horas: number }[]) ?? []) {
    horasPorProyecto.set(t.proyecto_id, (horasPorProyecto.get(t.proyecto_id) ?? 0) + Number(t.horas));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Proyectos</h1>
          <p className="text-sm text-muted-foreground">
            Trabajo de TI que no nace de una solicitud — automatizaciones, configuración de equipos,
            infraestructura y demás iniciativas propias del área.
          </p>
        </div>
        <Link href="/dashboard/proyectos/new">
          <Button>
            <Plus className="h-4 w-4" />
            Nuevo proyecto
          </Button>
        </Link>
      </div>

      {error && <p className="text-sm text-danger">No se pudieron cargar los proyectos: {error.message}</p>}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">Nombre</th>
              <th className="px-3 py-2 font-medium">Tipo</th>
              <th className="px-3 py-2 font-medium">Empresa</th>
              <th className="px-3 py-2 font-medium">Prioridad</th>
              <th className="px-3 py-2 font-medium">Estado</th>
              <th className="px-3 py-2 font-medium">Responsable</th>
              <th className="px-3 py-2 font-medium text-right">Horas</th>
            </tr>
          </thead>
          <tbody>
            {proyectos?.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                <td className="px-3 py-2">
                  <Link href={`/dashboard/proyectos/${p.id}`} className="font-medium text-accent hover:underline">
                    #{p.folio}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <Link href={`/dashboard/proyectos/${p.id}`} className="hover:underline">
                    {p.nombre}
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{p.categoria?.name ?? "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{p.company?.name ?? "—"}</td>
                <td className="px-3 py-2">
                  <Badge tone={PRIORITY_TONE[p.priority] ?? "neutral"}>
                    {PRIORITY_LABELS[p.priority] ?? p.priority}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <Badge tone={PROJECT_STATUS_TONE[p.status] ?? "neutral"}>
                    {PROJECT_STATUS_LABELS[p.status] ?? p.status}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{p.responsable?.full_name ?? "Sin asignar"}</td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                  {(horasPorProyecto.get(p.id) ?? 0).toFixed(1)} h
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {proyectos?.length === 0 && (
          <Card className="rounded-none border-0">
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <FolderKanban className="h-8 w-8 text-muted-foreground/50" />
              No hay proyectos todavía. Crea el primero con el botón de arriba.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
