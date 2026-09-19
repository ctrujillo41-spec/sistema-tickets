import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flame,
  Inbox,
  Monitor,
  FolderKanban,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { withJwtSkewRetry } from "@/lib/supabase/retry";
import { slaCountFilter } from "@/lib/sla";
import {
  STATUS_LABELS,
  STATUS_TONE,
  STATUS_ORDER,
  PRIORITY_LABELS,
  PRIORITY_TONE,
  PRIORITY_ORDER,
} from "@/lib/tickets";
import { DonutCard, type DonutSlice } from "@/components/dashboard/donut-card";
import { CHART_COLORS, BRAND_NAVY, BRAND_NAVY_DARK } from "@/lib/chart-colors";
import { BarListCard, type BarRow } from "@/components/dashboard/bar-list-card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { SectionTitle } from "@/components/dashboard/section-title";
import { TreemapCard } from "@/components/dashboard/treemap-card";
import { ModuleSummaryCard } from "@/components/dashboard/module-summary-card";
import { DashboardTable } from "@/components/dashboard/dashboard-table";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  agent: "Agente",
  user: "Usuario final",
};

const MONTH_LABEL = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(new Date());

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  const roleLabel = ROLE_LABEL[profile?.role ?? "user"] ?? "Usuario";
  const isStaff = profile?.role === "admin" || profile?.role === "agent";
  const supabase = createClient();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Cada count() respeta las políticas RLS: cada rol ve solo lo que
  // le corresponde (sección 4.4 del documento de arquitectura).
  const nowIso = new Date().toISOString();

  const [abiertos, cerradosMes, pendientes, vencidos, criticos, recientes] = await Promise.all([
    withJwtSkewRetry(() =>
      supabase.from("tickets").select("id", { count: "exact", head: true }).not("status", "in", "(cerrado)")
    ),
    withJwtSkewRetry(() =>
      supabase
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("status", "cerrado")
        .gte("closed_at", startOfMonth.toISOString())
    ),
    withJwtSkewRetry(() =>
      supabase.from("tickets").select("id", { count: "exact", head: true }).eq("status", "pendiente_info")
    ),
    withJwtSkewRetry(() =>
      supabase
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .not("status", "in", "(resuelto,cerrado)")
        .or(slaCountFilter(nowIso))
    ),
    withJwtSkewRetry(() =>
      supabase
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("priority", "critica")
        .not("status", "in", "(cerrado)")
    ),
    withJwtSkewRetry(() =>
      supabase
        .from("tickets")
        .select("id, ticket_number, subject, status")
        .order("created_at", { ascending: false })
        .limit(5)
    ),
  ]);

  // Datos para las gráficas: solo tickets abiertos (no cerrados), traemos
  // los campos mínimos y agregamos aquí mismo en el servidor — el volumen
  // de un helpdesk interno de PyME no justifica una vista/RPC aparte.
  const { data: openForCharts } = await withJwtSkewRetry(() =>
    supabase
      .from("tickets")
      .select("priority, status, department:departments(name), company:companies(name)")
      .not("status", "in", "(cerrado)")
      .limit(2000)
  );

  const priorityCounts = new Map<string, number>();
  const statusCounts = new Map<string, number>();
  const deptCounts = new Map<string, number>();
  const ticketsByCompany = new Map<string, number>();

  for (const t of (openForCharts as unknown as {
    priority: string;
    status: string;
    department: { name: string } | null;
    company: { name: string } | null;
  }[]) ?? []) {
    priorityCounts.set(t.priority, (priorityCounts.get(t.priority) ?? 0) + 1);
    statusCounts.set(t.status, (statusCounts.get(t.status) ?? 0) + 1);
    const deptName = t.department?.name ?? "Sin departamento";
    deptCounts.set(deptName, (deptCounts.get(deptName) ?? 0) + 1);
    if (t.company?.name) {
      ticketsByCompany.set(t.company.name, (ticketsByCompany.get(t.company.name) ?? 0) + 1);
    }
  }

  const priorityChart: DonutSlice[] = PRIORITY_ORDER.filter((p) => (priorityCounts.get(p) ?? 0) > 0)
    .reverse()
    .map((p) => ({
      label: PRIORITY_LABELS[p],
      value: priorityCounts.get(p) ?? 0,
      color: CHART_COLORS[PRIORITY_TONE[p] as keyof typeof CHART_COLORS] ?? CHART_COLORS.neutral,
    }));

  const statusChart: DonutSlice[] = STATUS_ORDER.filter((s) => (statusCounts.get(s) ?? 0) > 0).map((s) => ({
    label: STATUS_LABELS[s],
    value: statusCounts.get(s) ?? 0,
    color: CHART_COLORS[STATUS_TONE[s] as keyof typeof CHART_COLORS] ?? CHART_COLORS.neutral,
  }));

  const deptBars: BarRow[] = Array.from(deptCounts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // --- Solo para staff: datos cruzados con Equipos y Proyectos, y el
  // treemap/tabla por empresa. Un usuario final solo ve sus propios
  // tickets por RLS, así que estas secciones no le aportan nada.
  const [equiposSummary, equiposForTable, proyectosSummary, proyectosForTable, horasMesRaw] = isStaff
    ? await Promise.all([
        withJwtSkewRetry(() => supabase.from("equipos").select("status, diagnostico")),
        withJwtSkewRetry(() => supabase.from("equipos").select("company:companies(name)")),
        withJwtSkewRetry(() =>
          supabase.from("proyectos").select("status", { count: "exact", head: true }).not("status", "in", "(completado,cancelado)")
        ),
        withJwtSkewRetry(() =>
          supabase
            .from("proyectos")
            .select("company:companies(name), status")
            .not("status", "in", "(completado,cancelado)")
        ),
        withJwtSkewRetry(() =>
          supabase.from("proyecto_tiempos").select("horas").gte("fecha", startOfMonth.toISOString().slice(0, 10))
        ),
      ])
    : [
        { data: [] as { status: string; diagnostico: string | null }[] },
        { data: [] as { company: { name: string } | null }[] },
        { count: 0 },
        { data: [] as { company: { name: string } | null; status: string }[] },
        { data: [] as { horas: number }[] },
      ];

  const equiposRows = (equiposSummary.data as { status: string; diagnostico: string | null }[] | null) ?? [];
  const equiposTotal = equiposRows.length;
  const equiposEnReparacion = equiposRows.filter((e) => e.status === "en_reparacion").length;
  const equiposConAlertas = equiposRows.filter((e) => e.diagnostico && e.diagnostico.trim() !== "").length;

  const equiposByCompany = new Map<string, number>();
  for (const e of (equiposForTable.data as { company: { name: string } | null }[] | null) ?? []) {
    if (e.company?.name) equiposByCompany.set(e.company.name, (equiposByCompany.get(e.company.name) ?? 0) + 1);
  }

  const proyectosActivosTotal = proyectosSummary.count ?? 0;
  const horasMes = ((horasMesRaw.data as { horas: number }[] | null) ?? []).reduce(
    (sum, t) => sum + Number(t.horas),
    0
  );

  const proyectosByCompany = new Map<string, number>();
  for (const p of (proyectosForTable.data as { company: { name: string } | null; status: string }[] | null) ?? []) {
    if (p.company?.name) proyectosByCompany.set(p.company.name, (proyectosByCompany.get(p.company.name) ?? 0) + 1);
  }

  const empresaNames = new Set<string>([
    ...ticketsByCompany.keys(),
    ...equiposByCompany.keys(),
    ...proyectosByCompany.keys(),
  ]);

  interface EmpresaRow {
    id: string;
    name: string;
    tickets: number;
    equipos: number;
    proyectos: number;
  }

  const empresaRows: EmpresaRow[] = Array.from(empresaNames)
    .map((name) => ({
      id: name,
      name,
      tickets: ticketsByCompany.get(name) ?? 0,
      equipos: equiposByCompany.get(name) ?? 0,
      proyectos: proyectosByCompany.get(name) ?? 0,
    }))
    .sort((a, b) => b.tickets - a.tickets || b.equipos - a.equipos)
    .slice(0, 10);

  const treemapData = Array.from(ticketsByCompany.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const KPIS: {
    label: string;
    value: number;
    icon: typeof Inbox;
    tone: "neutral" | "warning" | "danger" | "accent";
  }[] = [
    { label: "Abiertos", value: abiertos.count ?? 0, icon: Inbox, tone: "accent" },
    { label: "Cerrados este mes", value: cerradosMes.count ?? 0, icon: CheckCircle2, tone: "neutral" },
    { label: "Pendientes", value: pendientes.count ?? 0, icon: Clock, tone: "warning" },
    { label: "Vencidos", value: vencidos.count ?? 0, icon: AlertTriangle, tone: "danger" },
    { label: "Críticos", value: criticos.count ?? 0, icon: Flame, tone: "danger" },
  ];

  return (
    <div className="space-y-6">
      {/* Banner ejecutivo — color fijo de marca, igual en claro y oscuro */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-6 py-5 text-white shadow-md"
        style={{ background: `linear-gradient(120deg, ${BRAND_NAVY} 0%, ${BRAND_NAVY_DARK} 100%)` }}
      >
        <div>
          <h1 className="text-xl font-bold tracking-tight">Hola, {profile?.full_name || profile?.email}</h1>
          <p className="mt-1 text-sm text-white/70">Conectado como {roleLabel}</p>
        </div>
        <span className="rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-xs font-semibold capitalize">
          {MONTH_LABEL}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {KPIS.map(({ label, value, icon, tone }) => (
          <KpiCard key={label} label={label} value={value} icon={icon} tone={tone} />
        ))}
      </div>

      <SectionTitle title="Tickets" sub="Distribución de los tickets abiertos por prioridad, estado y departamento" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DonutCard title="Tickets abiertos por prioridad" data={priorityChart} />
        <DonutCard title="Tickets abiertos por estado" data={statusChart} />
        <BarListCard title="Tickets abiertos por departamento" rows={deptBars} />
      </div>

      {isStaff && (
        <>
          <SectionTitle
            title="Tickets por empresa"
            sub="Mapa de árbol — el tamaño de cada bloque es proporcional a la cantidad de tickets abiertos"
          />
          <TreemapCard title="Tickets abiertos por empresa" data={treemapData} />

          <SectionTitle title="Otros módulos" sub="Resumen de Equipos y Proyectos, sin salir del panel principal" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ModuleSummaryCard
              title="Equipos"
              icon={Monitor}
              href="/dashboard/equipos"
              stats={[
                { label: "Total en inventario", value: equiposTotal },
                { label: "En reparación", value: equiposEnReparacion, tone: equiposEnReparacion > 0 ? "warning" : "neutral" },
                { label: "Con alertas de diagnóstico", value: equiposConAlertas, tone: equiposConAlertas > 0 ? "danger" : "neutral" },
              ]}
            />
            <ModuleSummaryCard
              title="Proyectos"
              icon={FolderKanban}
              href="/dashboard/proyectos"
              stats={[
                { label: "Activos", value: proyectosActivosTotal },
                { label: "Horas registradas este mes", value: horasMes.toFixed(1) },
              ]}
            />
          </div>

          <SectionTitle
            title="Detalle por empresa"
            sub="Cruce de tickets abiertos, equipos y proyectos activos por empresa"
          />
          <DashboardTable<EmpresaRow>
            emptyLabel="Aún no hay tickets, equipos ni proyectos ligados a una empresa."
            columns={[
              { header: "Empresa", render: (r) => r.name },
              { header: "Tickets abiertos", align: "right", render: (r) => r.tickets },
              { header: "Equipos", align: "right", render: (r) => r.equipos },
              { header: "Proyectos activos", align: "right", render: (r) => r.proyectos },
            ]}
            rows={empresaRows}
          />
        </>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium text-foreground">Tickets recientes</CardTitle>
          <Link href="/dashboard/tickets" className="text-xs font-medium text-accent hover:underline">
            Ver todos
          </Link>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {recientes.data?.map((t) => (
            <Link
              key={t.id}
              href={`/dashboard/tickets/${t.id}`}
              className="flex items-center justify-between rounded-md px-2 py-2 transition-colors hover:bg-muted"
            >
              <span className="truncate">
                <span className="text-muted-foreground">#{t.ticket_number}</span> · {t.subject}
              </span>
              <Badge tone={STATUS_TONE[t.status] ?? "neutral"} className="ml-3 shrink-0">
                {STATUS_LABELS[t.status] ?? t.status}
              </Badge>
            </Link>
          ))}
          {(!recientes.data || recientes.data.length === 0) && (
            <p className="py-6 text-center text-muted-foreground">
              No hay tickets todavía.{" "}
              <Link href="/dashboard/tickets/new" className="text-accent hover:underline">
                Crea el primero
              </Link>
              .
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
