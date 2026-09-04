import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { withJwtSkewRetry } from "@/lib/supabase/retry";
import { EQUIPO_STATUS_LABELS, EQUIPO_STATUS_TONE } from "@/lib/equipos";
import { EquipoStatusControls } from "@/components/equipos/equipo-status-controls";
import { BitacoraSection, type BitacoraEntry } from "@/components/equipos/bitacora-section";

export const dynamic = "force-dynamic";

interface EquipoDetail {
  id: string;
  folio: number;
  etiqueta: string;
  marca: string | null;
  modelo: string | null;
  numero_serie: string | null;
  ip_address: string | null;
  status: string;
  ubicacion: string | null;
  cpu: string | null;
  ram: string | null;
  almacenamiento: string | null;
  sistema_operativo: string | null;
  proveedor: string | null;
  fecha_compra: string | null;
  costo_compra: number | null;
  notas: string | null;
  asignado_a: string | null;
  created_at: string;
  categoria: { name: string } | null;
  company: { name: string } | null;
  department: { name: string } | null;
  asignado: { full_name: string | null } | null;
  creador: { full_name: string | null } | null;
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("es-MX", { dateStyle: "medium" });
}

export default async function EquipoDetailPage({ params }: { params: { id: string } }) {
  await requireRole(["admin", "agent"]);
  const supabase = createClient();

  const { data: equipoRaw } = await withJwtSkewRetry(() =>
    supabase
      .from("equipos")
      .select(
        `id, folio, etiqueta, marca, modelo, numero_serie, ip_address, status, ubicacion,
         cpu, ram, almacenamiento, sistema_operativo, proveedor, fecha_compra, costo_compra, notas,
         asignado_a, created_at,
         categoria:equipo_categorias(name),
         company:companies(name),
         department:departments(name),
         asignado:profiles!equipos_asignado_a_fkey(full_name),
         creador:profiles!equipos_created_by_fkey(full_name)`
      )
      .eq("id", params.id)
      .single()
  );

  if (!equipoRaw) notFound();
  const equipo = equipoRaw as unknown as EquipoDetail;

  const [{ data: bitacoraRaw }, { data: staffRaw }, { data: ticketsRaw }] = await Promise.all([
    withJwtSkewRetry(() =>
      supabase
        .from("equipo_bitacora")
        .select(
          `id, tipo, descripcion, status, costo, fecha,
           reportado_por:profiles!equipo_bitacora_reportado_por_fkey(full_name),
           resuelto_por:profiles!equipo_bitacora_resuelto_por_fkey(full_name)`
        )
        .eq("equipo_id", params.id)
        .order("fecha", { ascending: false })
    ),
    withJwtSkewRetry(() => supabase.from("profiles").select("id, full_name").eq("is_active", true).order("full_name")),
    withJwtSkewRetry(() =>
      supabase
        .from("tickets")
        .select("id, ticket_number, subject, status")
        .eq("equipo_id", params.id)
        .order("created_at", { ascending: false })
    ),
  ]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold">
              #{equipo.folio} · {equipo.etiqueta}
            </h1>
            <Badge tone={EQUIPO_STATUS_TONE[equipo.status] ?? "neutral"}>
              {EQUIPO_STATUS_LABELS[equipo.status] ?? equipo.status}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Registrado por {equipo.creador?.full_name ?? "—"} el{" "}
            {new Date(equipo.created_at).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>

        {equipo.notas && (
          <Card>
            <CardContent className="whitespace-pre-wrap pt-4 text-sm">{equipo.notas}</CardContent>
          </Card>
        )}

        {ticketsRaw && ticketsRaw.length > 0 && (
          <Card>
            <CardContent className="space-y-2 pt-4 text-sm">
              <p className="text-xs font-medium text-muted-foreground">Tickets relacionados</p>
              {(ticketsRaw as { id: string; ticket_number: number; subject: string; status: string }[]).map((t) => (
                <a
                  key={t.id}
                  href={`/dashboard/tickets/${t.id}`}
                  className="block rounded-md border border-border px-3 py-2 hover:bg-muted/50"
                >
                  <span className="font-medium text-accent">#{t.ticket_number}</span> {t.subject}
                </a>
              ))}
            </CardContent>
          </Card>
        )}

        <BitacoraSection equipoId={equipo.id} initialEntries={(bitacoraRaw as unknown as BitacoraEntry[]) ?? []} />
      </div>

      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-2 pt-4 text-sm">
            <p className="text-xs font-medium text-muted-foreground">Detalles</p>
            <dl className="space-y-1">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Categoría</dt>
                <dd>{equipo.categoria?.name ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Marca / modelo</dt>
                <dd>{[equipo.marca, equipo.modelo].filter(Boolean).join(" ") || "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Serie</dt>
                <dd>{equipo.numero_serie ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Empresa</dt>
                <dd>{equipo.company?.name ?? "Interno"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Departamento</dt>
                <dd>{equipo.department?.name ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Ubicación</dt>
                <dd>{equipo.ubicacion ?? "—"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {(equipo.cpu || equipo.ram || equipo.almacenamiento || equipo.sistema_operativo) && (
          <Card>
            <CardContent className="space-y-2 pt-4 text-sm">
              <p className="text-xs font-medium text-muted-foreground">Especificaciones</p>
              <dl className="space-y-1">
                {equipo.cpu && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">CPU</dt>
                    <dd>{equipo.cpu}</dd>
                  </div>
                )}
                {equipo.ram && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">RAM</dt>
                    <dd>{equipo.ram}</dd>
                  </div>
                )}
                {equipo.almacenamiento && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Almacenamiento</dt>
                    <dd>{equipo.almacenamiento}</dd>
                  </div>
                )}
                {equipo.sistema_operativo && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Sistema operativo</dt>
                    <dd>{equipo.sistema_operativo}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        )}

        {(equipo.proveedor || equipo.fecha_compra || equipo.costo_compra != null) && (
          <Card>
            <CardContent className="space-y-2 pt-4 text-sm">
              <p className="text-xs font-medium text-muted-foreground">Compra</p>
              <dl className="space-y-1">
                {equipo.proveedor && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Proveedor</dt>
                    <dd>{equipo.proveedor}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Fecha</dt>
                  <dd>{fmtDate(equipo.fecha_compra)}</dd>
                </div>
                {equipo.costo_compra != null && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Costo</dt>
                    <dd>${Number(equipo.costo_compra).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-4">
            <EquipoStatusControls
              equipoId={equipo.id}
              initialStatus={equipo.status}
              initialAsignadoA={equipo.asignado_a}
              initialIpAddress={equipo.ip_address}
              staff={(staffRaw as { id: string; full_name: string | null }[]) ?? []}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
