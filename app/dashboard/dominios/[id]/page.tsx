import { notFound } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { withJwtSkewRetry } from "@/lib/supabase/retry";
import { DOMINIO_ESTADO_LABELS, DOMINIO_ESTADO_TONE, CICLO_RENOVACION_LABELS, computeDominioEstado, diasParaVencer } from "@/lib/dominios";
import { DominioEditForm } from "@/components/dominios/dominio-edit-form";

export const dynamic = "force-dynamic";

interface DominioDetail {
  id: string;
  nombre_dominio: string;
  company_id: string | null;
  responsable_id: string | null;
  registrador: string | null;
  proveedor_hosting: string | null;
  fecha_registro: string | null;
  fecha_vencimiento: string | null;
  costo_renovacion: number | null;
  moneda: string;
  ciclo_renovacion: string;
  auto_renovacion: boolean;
  estado: string;
  tiene_sitio_web: boolean;
  url_sitio: string | null;
  proveedor_ssl: string | null;
  fecha_vencimiento_ssl: string | null;
  usuario_registrador: string | null;
  password_registrador: string | null;
  usuario_hosting: string | null;
  password_hosting: string | null;
  servidor_dns: string | null;
  correo_notificaciones: string | null;
  notas: string | null;
  created_at: string;
  company: { name: string } | null;
  responsable: { full_name: string | null } | null;
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("es-MX", { dateStyle: "medium" });
}

export default async function DominioDetailPage({ params }: { params: { id: string } }) {
  await requireRole(["admin"]);
  const supabase = createClient();

  const { data: dominioRaw } = await withJwtSkewRetry(() =>
    supabase
      .from("dominios")
      .select(
        `id, nombre_dominio, company_id, responsable_id, registrador, proveedor_hosting,
         fecha_registro, fecha_vencimiento, costo_renovacion, moneda, ciclo_renovacion,
         auto_renovacion, estado, tiene_sitio_web, url_sitio, proveedor_ssl, fecha_vencimiento_ssl,
         usuario_registrador, password_registrador, usuario_hosting, password_hosting,
         servidor_dns, correo_notificaciones, notas, created_at,
         company:companies(name),
         responsable:profiles!dominios_responsable_id_fkey(full_name)`
      )
      .eq("id", params.id)
      .single()
  );

  if (!dominioRaw) notFound();
  const dominio = dominioRaw as unknown as DominioDetail;

  const [{ data: companies }, { data: staff }] = await Promise.all([
    withJwtSkewRetry(() => supabase.from("companies").select("*").eq("is_active", true).order("name")),
    withJwtSkewRetry(() =>
      supabase.from("profiles").select("id, full_name").eq("is_active", true).order("full_name")
    ),
  ]);

  const estado = computeDominioEstado(dominio.fecha_vencimiento, dominio.estado);
  const dias = diasParaVencer(dominio.fecha_vencimiento);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold">{dominio.nombre_dominio}</h1>
            <Badge tone={DOMINIO_ESTADO_TONE[estado] ?? "neutral"}>
              {DOMINIO_ESTADO_LABELS[estado] ?? estado}
            </Badge>
            {dominio.tiene_sitio_web && dominio.url_sitio && (
              <a
                href={dominio.url_sitio}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
              >
                Ver sitio <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Registrado el {new Date(dominio.created_at).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>

        <Card>
          <CardContent className="space-y-2 pt-4 text-sm">
            <p className="text-xs font-medium text-muted-foreground">Resumen</p>
            <dl className="space-y-1">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Empresa</dt>
                <dd>{dominio.company?.name ?? "Interno"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Responsable</dt>
                <dd>{dominio.responsable?.full_name ?? "Sin asignar"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Registrador</dt>
                <dd>{dominio.registrador ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Hosting</dt>
                <dd>{dominio.proveedor_hosting ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Fecha de registro</dt>
                <dd>{fmtDate(dominio.fecha_registro)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Fecha de vencimiento</dt>
                <dd>
                  {fmtDate(dominio.fecha_vencimiento)}
                  {dias != null && estado !== "cancelado" && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({dias < 0 ? `hace ${Math.abs(dias)} días` : `en ${dias} días`})
                    </span>
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Costo de renovación</dt>
                <dd>
                  {dominio.costo_renovacion != null
                    ? `$${Number(dominio.costo_renovacion).toLocaleString("es-MX", { minimumFractionDigits: 2 })} ${dominio.moneda}`
                    : "—"}
                  {" · "}
                  {CICLO_RENOVACION_LABELS[dominio.ciclo_renovacion] ?? dominio.ciclo_renovacion}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Renovación automática</dt>
                <dd>{dominio.auto_renovacion ? "Sí" : "No"}</dd>
              </div>
              {dominio.servidor_dns && (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">DNS</dt>
                  <dd className="text-right">{dominio.servidor_dns}</dd>
                </div>
              )}
              {dominio.correo_notificaciones && (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Correo de avisos</dt>
                  <dd>{dominio.correo_notificaciones}</dd>
                </div>
              )}
              {dominio.proveedor_ssl && (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">SSL</dt>
                  <dd>
                    {dominio.proveedor_ssl}
                    {dominio.fecha_vencimiento_ssl && ` · vence ${fmtDate(dominio.fecha_vencimiento_ssl)}`}
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {dominio.notas && (
          <Card>
            <CardContent className="whitespace-pre-wrap pt-4 text-sm">{dominio.notas}</CardContent>
          </Card>
        )}

        <p className="text-xs text-muted-foreground">
          <Link href="/dashboard/dominios" className="text-accent hover:underline">
            ← Volver al listado de dominios
          </Link>
        </p>
      </div>

      <div>
        <DominioEditForm
          initial={dominio}
          companies={companies ?? []}
          staff={(staff as { id: string; full_name: string | null }[]) ?? []}
        />
      </div>
    </div>
  );
}
