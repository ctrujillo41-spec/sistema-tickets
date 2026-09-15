import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { withJwtSkewRetry } from "@/lib/supabase/retry";
import { EQUIPO_STATUS_LABELS, EQUIPO_STATUS_TONE } from "@/lib/equipos";
import { diagnosticoToList } from "@/lib/equipos-import";
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
  hostname: string | null;
  usuario_windows: string | null;
  ultimo_usuario_windows: string | null;
  mac_address: string | null;
  adaptador_red: string | null;
  gpu: string | null;
  ram_total_gb: number | null;
  ram_libre_gb: number | null;
  ram_libre_pct: number | null;
  disco_modelo: string | null;
  disco_total_gb: number | null;
  disco_libre_gb: number | null;
  disco_libre_pct: number | null;
  salud_disco: string | null;
  monitores: string | null;
  bateria: string | null;
  build_os: string | null;
  windows_activado: string | null;
  uptime_dias: number | null;
  identidad_red: string | null;
  office_version: string | null;
  office_activado: string | null;
  antivirus: string | null;
  firewall: string | null;
  bitlocker: string | null;
  tpm: string | null;
  secure_boot: string | null;
  administradores_locales: string | null;
  programas_instalados_count: number | null;
  top_programas: string | null;
  diagnostico: string | null;
  ultimo_escaneo_at: string | null;
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
         hostname, usuario_windows, ultimo_usuario_windows, mac_address, adaptador_red, gpu,
         ram_total_gb, ram_libre_gb, ram_libre_pct,
         disco_modelo, disco_total_gb, disco_libre_gb, disco_libre_pct, salud_disco,
         monitores, bateria, build_os, windows_activado, uptime_dias, identidad_red,
         office_version, office_activado, antivirus, firewall, bitlocker, tpm, secure_boot,
         administradores_locales, programas_instalados_count, top_programas, diagnostico, ultimo_escaneo_at,
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

        {equipo.ultimo_escaneo_at && (
          <Card>
            <CardContent className="space-y-3 pt-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">Diagnóstico técnico</p>
                <p className="text-xs text-muted-foreground">
                  Último escaneo:{" "}
                  {new Date(equipo.ultimo_escaneo_at).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>

              {diagnosticoToList(equipo.diagnostico).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {diagnosticoToList(equipo.diagnostico).map((alerta, i) => (
                    <Badge key={i} tone="warning">
                      {alerta}
                    </Badge>
                  ))}
                </div>
              )}

              <dl className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                {equipo.hostname && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Hostname</dt>
                    <dd>{equipo.hostname}</dd>
                  </div>
                )}
                {equipo.usuario_windows && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Usuario</dt>
                    <dd>{equipo.usuario_windows}</dd>
                  </div>
                )}
                {equipo.mac_address && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">MAC</dt>
                    <dd className="font-mono">{equipo.mac_address}</dd>
                  </div>
                )}
                {equipo.adaptador_red && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Adaptador</dt>
                    <dd>{equipo.adaptador_red}</dd>
                  </div>
                )}
                {equipo.gpu && (
                  <div className="flex justify-between gap-2 sm:col-span-2">
                    <dt className="text-muted-foreground">GPU</dt>
                    <dd className="text-right">{equipo.gpu}</dd>
                  </div>
                )}
                {equipo.ram_total_gb != null && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">RAM</dt>
                    <dd>
                      {equipo.ram_total_gb} GB total
                      {equipo.ram_libre_pct != null && ` · ${equipo.ram_libre_pct}% libre`}
                    </dd>
                  </div>
                )}
                {equipo.disco_total_gb != null && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Disco</dt>
                    <dd>
                      {equipo.disco_total_gb} GB
                      {equipo.disco_libre_pct != null && ` · ${equipo.disco_libre_pct}% libre`}
                      {equipo.salud_disco && ` · ${equipo.salud_disco}`}
                    </dd>
                  </div>
                )}
                {equipo.disco_modelo && (
                  <div className="flex justify-between gap-2 sm:col-span-2">
                    <dt className="text-muted-foreground">Modelo de disco</dt>
                    <dd className="text-right">{equipo.disco_modelo}</dd>
                  </div>
                )}
                {equipo.monitores && (
                  <div className="flex justify-between gap-2 sm:col-span-2">
                    <dt className="text-muted-foreground">Monitores</dt>
                    <dd className="text-right">{equipo.monitores}</dd>
                  </div>
                )}
                {equipo.bateria && (
                  <div className="flex justify-between gap-2 sm:col-span-2">
                    <dt className="text-muted-foreground">Batería</dt>
                    <dd className="text-right">{equipo.bateria}</dd>
                  </div>
                )}
                {equipo.build_os && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Build</dt>
                    <dd>{equipo.build_os}</dd>
                  </div>
                )}
                {equipo.windows_activado && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Windows activado</dt>
                    <dd>{equipo.windows_activado}</dd>
                  </div>
                )}
                {equipo.uptime_dias != null && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Uptime</dt>
                    <dd>{equipo.uptime_dias} día{equipo.uptime_dias === 1 ? "" : "s"}</dd>
                  </div>
                )}
                {equipo.identidad_red && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Identidad de red</dt>
                    <dd>{equipo.identidad_red}</dd>
                  </div>
                )}
                {equipo.office_version && (
                  <div className="flex justify-between gap-2 sm:col-span-2">
                    <dt className="text-muted-foreground">Office</dt>
                    <dd className="text-right">
                      {equipo.office_version}
                      {equipo.office_activado && ` (${equipo.office_activado})`}
                    </dd>
                  </div>
                )}
                {equipo.antivirus && (
                  <div className="flex justify-between gap-2 sm:col-span-2">
                    <dt className="text-muted-foreground">Antivirus</dt>
                    <dd className="text-right">{equipo.antivirus}</dd>
                  </div>
                )}
                {equipo.firewall && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Firewall</dt>
                    <dd>{equipo.firewall}</dd>
                  </div>
                )}
                {equipo.bitlocker && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">BitLocker</dt>
                    <dd>{equipo.bitlocker}</dd>
                  </div>
                )}
                {equipo.tpm && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">TPM</dt>
                    <dd>{equipo.tpm}</dd>
                  </div>
                )}
                {equipo.secure_boot && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Secure Boot</dt>
                    <dd>{equipo.secure_boot}</dd>
                  </div>
                )}
                {equipo.administradores_locales && (
                  <div className="flex justify-between gap-2 sm:col-span-2">
                    <dt className="text-muted-foreground">Administradores locales</dt>
                    <dd className="text-right">{equipo.administradores_locales}</dd>
                  </div>
                )}
                {equipo.programas_instalados_count != null && (
                  <div className="flex justify-between gap-2 sm:col-span-2">
                    <dt className="text-muted-foreground">Programas instalados</dt>
                    <dd className="text-right">
                      {equipo.programas_instalados_count}
                      {equipo.top_programas && ` — ${equipo.top_programas}`}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
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
