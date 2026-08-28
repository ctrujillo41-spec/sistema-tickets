import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { withJwtSkewRetry } from "@/lib/supabase/retry";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_TONE } from "@/lib/proyectos";
import { PRIORITY_LABELS, PRIORITY_TONE } from "@/lib/tickets";
import { ProjectStatusControls } from "@/components/proyectos/project-status-controls";
import { TimeLogSection } from "@/components/proyectos/time-log-section";

export const dynamic = "force-dynamic";

interface ProjectDetail {
  id: string;
  folio: number;
  nombre: string;
  descripcion: string | null;
  status: string;
  priority: string;
  responsable_id: string | null;
  fecha_inicio: string | null;
  fecha_objetivo: string | null;
  fecha_cierre: string | null;
  created_at: string;
  categoria: { name: string } | null;
  company: { name: string } | null;
  department: { name: string } | null;
  responsable: { full_name: string | null } | null;
  creador: { full_name: string | null } | null;
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("es-MX", { dateStyle: "medium" });
}

export default async function ProyectoDetailPage({ params }: { params: { id: string } }) {
  await requireRole(["admin", "agent"]);
  const supabase = createClient();

  const { data: proyectoRaw } = await withJwtSkewRetry(() =>
    supabase
      .from("proyectos")
      .select(
        `id, folio, nombre, descripcion, status, priority, responsable_id,
         fecha_inicio, fecha_objetivo, fecha_cierre, created_at,
         categoria:proyecto_categorias(name),
         company:companies(name),
         department:departments(name),
         responsable:profiles!proyectos_responsable_id_fkey(full_name),
         creador:profiles!proyectos_created_by_fkey(full_name)`
      )
      .eq("id", params.id)
      .single()
  );

  if (!proyectoRaw) notFound();
  const proyecto = proyectoRaw as unknown as ProjectDetail;

  const [{ data: tiemposRaw }, { data: staffRaw }] = await Promise.all([
    withJwtSkewRetry(() =>
      supabase
        .from("proyecto_tiempos")
        .select("id, fecha, horas, nota, user:profiles!proyecto_tiempos_user_id_fkey(full_name)")
        .eq("proyecto_id", params.id)
        .order("fecha", { ascending: false })
    ),
    withJwtSkewRetry(() =>
      supabase.from("profiles").select("id, full_name").in("role", ["admin", "agent"]).eq("is_active", true).order("full_name")
    ),
  ]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold">
              #{proyecto.folio} · {proyecto.nombre}
            </h1>
            <Badge tone={PROJECT_STATUS_TONE[proyecto.status] ?? "neutral"}>
              {PROJECT_STATUS_LABELS[proyecto.status] ?? proyecto.status}
            </Badge>
            <Badge tone={PRIORITY_TONE[proyecto.priority] ?? "neutral"}>
              {PRIORITY_LABELS[proyecto.priority] ?? proyecto.priority}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Creado por {proyecto.creador?.full_name ?? "—"} el{" "}
            {new Date(proyecto.created_at).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>

        {proyecto.descripcion && (
          <Card>
            <CardContent className="whitespace-pre-wrap pt-4 text-sm">{proyecto.descripcion}</CardContent>
          </Card>
        )}

        <TimeLogSection
          proyectoId={proyecto.id}
          initialEntries={(tiemposRaw as any) ?? []}
        />
      </div>

      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-2 pt-4 text-sm">
            <p className="text-xs font-medium text-muted-foreground">Detalles</p>
            <dl className="space-y-1">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Tipo</dt>
                <dd>{proyecto.categoria?.name ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Empresa</dt>
                <dd>{proyecto.company?.name ?? "Interno"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Departamento</dt>
                <dd>{proyecto.department?.name ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Inicio</dt>
                <dd>{fmtDate(proyecto.fecha_inicio)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Fecha objetivo</dt>
                <dd>{fmtDate(proyecto.fecha_objetivo)}</dd>
              </div>
              {proyecto.fecha_cierre && (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Cierre</dt>
                  <dd>{fmtDate(proyecto.fecha_cierre)}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <ProjectStatusControls
              proyectoId={proyecto.id}
              initialStatus={proyecto.status}
              initialPriority={proyecto.priority}
              initialResponsableId={proyecto.responsable_id}
              staff={(staffRaw as any) ?? []}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
