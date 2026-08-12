import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock, Flame, Inbox } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { slaCountFilter } from "@/lib/sla";
import {
  STATUS_LABELS,
  STATUS_TONE,
  STATUS_ORDER,
  PRIORITY_LABELS,
  PRIORITY_TONE,
  PRIORITY_ORDER,
} from "@/lib/tickets";
import { cn } from "@/lib/utils";
import { DonutCard, CHART_COLORS, type DonutSlice } from "@/components/dashboard/donut-card";
import { BarListCard, type BarRow } from "@/components/dashboard/bar-list-card";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  agent: "Agente",
  user: "Usuario final",
};

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  const roleLabel = ROLE_LABEL[profile?.role ?? "user"] ?? "Usuario";
  const supabase = createClient();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Cada count() respeta las políticas RLS: cada rol ve solo lo que
  // le corresponde (sección 4.4 del documento de arquitectura).
  const nowIso = new Date().toISOString();

  const [abiertos, cerradosMes, pendientes, vencidos, criticos, recientes] = await Promise.all([
    supabase.from("tickets").select("id", { count: "exact", head: true }).not("status", "in", "(cerrado)"),
    supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "cerrado")
      .gte("closed_at", startOfMonth.toISOString()),
    supabase.from("tickets").select("id", { count: "exact", head: true }).eq("status", "pendiente_info"),
    supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .not("status", "in", "(resuelto,cerrado)")
      .or(slaCountFilter(nowIso)),
    supabase.from("tickets").select("id", { count: "exact", head: true }).eq("priority", "critica").not("status", "in", "(cerrado)"),
    supabase
      .from("tickets")
      .select("id, ticket_number, subject, status")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  // Datos para las gráficas: solo tickets abiertos (no cerrados), traemos
  // los campos mínimos y agregamos aquí mismo en el servidor — el volumen
  // de un helpdesk interno de PyME no justifica una vista/RPC aparte.
  const { data: openForCharts } = await supabase
    .from("tickets")
    .select("priority, status, department:departments(name)")
    .not("status", "in", "(cerrado)")
    .limit(2000);

  const priorityCounts = new Map<string, number>();
  const statusCounts = new Map<string, number>();
  const deptCounts = new Map<string, number>();

  for (const t of (openForCharts as unknown as { priority: string; status: string; department: { name: string } | null }[]) ?? []) {
    priorityCounts.set(t.priority, (priorityCounts.get(t.priority) ?? 0) + 1);
    statusCounts.set(t.status, (statusCounts.get(t.status) ?? 0) + 1);
    const deptName = t.department?.name ?? "Sin departamento";
    deptCounts.set(deptName, (deptCounts.get(deptName) ?? 0) + 1);
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

  const KPIS: {
    label: string;
    value: number;
    icon: typeof Inbox;
    tinted: "warning" | "danger" | null;
  }[] = [
    { label: "Abiertos", value: abiertos.count ?? 0, icon: Inbox, tinted: null },
    { label: "Cerrados este mes", value: cerradosMes.count ?? 0, icon: CheckCircle2, tinted: null },
    { label: "Pendientes", value: pendientes.count ?? 0, icon: Clock, tinted: "warning" },
    { label: "Vencidos", value: vencidos.count ?? 0, icon: AlertTriangle, tinted: "danger" },
    { label: "Críticos", value: criticos.count ?? 0, icon: Flame, tinted: "danger" },
  ];

  const TINT_CARD: Record<string, string> = {
    warning: "bg-warning/15 border-warning/30",
    danger: "bg-danger/15 border-danger/30",
  };
  const TINT_TEXT: Record<string, string> = {
    warning: "text-warning",
    danger: "text-danger",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Hola, {profile?.full_name || profile?.email}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conectado como <Badge tone="accent">{roleLabel}</Badge>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {KPIS.map(({ label, value, icon: Icon, tinted }) => (
          <div
            key={label}
            className={cn(
              "rounded-xl border p-4",
              tinted ? TINT_CARD[tinted] : "border-border bg-card"
            )}
          >
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Icon className={cn("h-3.5 w-3.5", tinted && TINT_TEXT[tinted])} />
              {label}
            </div>
            <div className={cn("mt-1.5 text-3xl font-bold tabular-nums", tinted && TINT_TEXT[tinted])}>
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DonutCard title="Tickets abiertos por prioridad" data={priorityChart} />
        <DonutCard title="Tickets abiertos por estado" data={statusChart} />
        <BarListCard title="Tickets abiertos por departamento" rows={deptBars} />
      </div>

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
