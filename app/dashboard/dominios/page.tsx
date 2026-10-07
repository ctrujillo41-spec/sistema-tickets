import Link from "next/link";
import { Plus, Globe, AlertTriangle, CircleX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { withJwtSkewRetry } from "@/lib/supabase/retry";
import { SortableTh } from "@/components/ui/sortable-th";
import { parseSort, sortHref, sortRows } from "@/lib/sort";
import { DOMINIO_ESTADO_LABELS, DOMINIO_ESTADO_TONE, computeDominioEstado, diasParaVencer } from "@/lib/dominios";

export const dynamic = "force-dynamic";

interface DominioListRow {
  id: string;
  nombre_dominio: string;
  registrador: string | null;
  proveedor_hosting: string | null;
  tiene_sitio_web: boolean;
  fecha_vencimiento: string | null;
  costo_renovacion: number | null;
  moneda: string;
  estado: string;
  company: { name: string } | null;
  responsable: { full_name: string | null } | null;
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("es-MX", { dateStyle: "medium" });
}

const SORT_FIELDS = [
  "nombre_dominio", "company", "registrador", "proveedor_hosting", "tiene_sitio_web",
  "fecha_vencimiento", "costo_renovacion", "estado", "responsable",
];

export default async function DominiosPage({
  searchParams,
}: {
  searchParams: { sort?: string; dir?: string };
}) {
  // Este módulo guarda credenciales (registrador, hosting), así que
  // a diferencia de Equipos/Proyectos solo lo ve el admin.
  await requireRole(["admin"]);
  const supabase = createClient();

  const { data, error } = await withJwtSkewRetry(() =>
    supabase
      .from("dominios")
      .select(
        `id, nombre_dominio, registrador, proveedor_hosting, tiene_sitio_web,
         fecha_vencimiento, costo_renovacion, moneda, estado,
         company:companies(name),
         responsable:profiles!dominios_responsable_id_fkey(full_name)`
      )
      .order("fecha_vencimiento", { ascending: true, nullsFirst: false })
  );

  const dominiosRaw = (data as unknown as DominioListRow[] | null) ?? [];

  const total = dominiosRaw.length;
  const porVencer = dominiosRaw.filter((d) => computeDominioEstado(d.fecha_vencimiento, d.estado) === "por_vencer").length;
  const vencidos = dominiosRaw.filter((d) => computeDominioEstado(d.fecha_vencimiento, d.estado) === "vencido").length;

  const currentSort = parseSort(searchParams, SORT_FIELDS, "fecha_vencimiento", "asc");
  const th = (field: string, label: string) => (
    <SortableTh
      label={label}
      active={currentSort.sort === field}
      dir={currentSort.dir}
      href={sortHref("/dashboard/dominios", searchParams, field, currentSort)}
    />
  );
  const dominios = sortRows(
    dominiosRaw,
    (d) => {
      switch (currentSort.sort) {
        case "nombre_dominio": return d.nombre_dominio;
        case "company": return d.company?.name;
        case "registrador": return d.registrador;
        case "proveedor_hosting": return d.proveedor_hosting;
        case "tiene_sitio_web": return d.tiene_sitio_web ? 1 : 0;
        case "costo_renovacion": return d.costo_renovacion;
        case "estado": return computeDominioEstado(d.fecha_vencimiento, d.estado);
        case "responsable": return d.responsable?.full_name;
        default: return d.fecha_vencimiento;
      }
    },
    currentSort.dir
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Dominios</h1>
          <p className="text-sm text-muted-foreground">
            Vencimientos, costos, hosting y credenciales de los dominios administrados.
          </p>
        </div>
        <Link href="/dashboard/dominios/nuevo">
          <Button>
            <Plus className="h-4 w-4" />
            Nuevo dominio
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <div className="rounded-full bg-accent/15 p-2 text-accent">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold tabular-nums">{total}</p>
              <p className="text-xs text-muted-foreground">Dominios registrados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <div className="rounded-full bg-warning/15 p-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold tabular-nums">{porVencer}</p>
              <p className="text-xs text-muted-foreground">Por vencer (30 días)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <div className="rounded-full bg-danger/15 p-2 text-danger">
              <CircleX className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold tabular-nums">{vencidos}</p>
              <p className="text-xs text-muted-foreground">Vencidos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && <p className="text-sm text-danger">No se pudieron cargar los dominios: {error.message}</p>}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted text-left text-xs text-muted-foreground">
              {th("nombre_dominio", "Dominio")}
              {th("company", "Empresa")}
              {th("registrador", "Registrador")}
              {th("proveedor_hosting", "Hosting")}
              {th("tiene_sitio_web", "Sitio web")}
              {th("fecha_vencimiento", "Vencimiento")}
              {th("costo_renovacion", "Costo")}
              {th("estado", "Estado")}
              {th("responsable", "Responsable")}
            </tr>
          </thead>
          <tbody>
            {dominios.map((d) => {
              const estado = computeDominioEstado(d.fecha_vencimiento, d.estado);
              const dias = diasParaVencer(d.fecha_vencimiento);
              return (
                <tr key={d.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-3 py-2">
                    <Link href={`/dashboard/dominios/${d.id}`} className="font-medium text-accent hover:underline">
                      {d.nombre_dominio}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{d.company?.name ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{d.registrador ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{d.proveedor_hosting ?? "—"}</td>
                  <td className="px-3 py-2">
                    <Badge tone={d.tiene_sitio_web ? "success" : "neutral"}>
                      {d.tiene_sitio_web ? "Sí" : "No"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {fmtDate(d.fecha_vencimiento)}
                    {dias != null && estado !== "cancelado" && (
                      <span className="ml-1 text-xs">
                        ({dias < 0 ? `hace ${Math.abs(dias)} días` : `en ${dias} días`})
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {d.costo_renovacion != null
                      ? `$${Number(d.costo_renovacion).toLocaleString("es-MX", { minimumFractionDigits: 2 })} ${d.moneda}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <Badge tone={DOMINIO_ESTADO_TONE[estado] ?? "neutral"}>
                      {DOMINIO_ESTADO_LABELS[estado] ?? estado}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{d.responsable?.full_name ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {dominios.length === 0 && (
          <Card className="rounded-none border-0">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No hay dominios todavía. Registra el primero con el botón de arriba.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
