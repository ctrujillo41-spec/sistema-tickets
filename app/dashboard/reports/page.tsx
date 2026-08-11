import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportFilters } from "@/components/reports/report-filters";
import { ExportButtons } from "@/components/reports/export-buttons";
import {
  computeSummary,
  groupByDepartment,
  groupByAgent,
  groupByCompany,
  groupByMonth,
  type ReportTicketRow,
  type GroupRow,
} from "@/lib/reports";

export const dynamic = "force-dynamic";

interface RawTicketRow {
  id: string;
  ticket_number: number;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  resolved_at: string | null;
  closed_at: string | null;
  sla_resolution_due: string | null;
  company: { name: string } | null;
  department: { name: string } | null;
  category: { name: string } | null;
  agent: { full_name: string | null } | null;
  requester: { full_name: string | null; email: string | null } | null;
}

function param(searchParams: { [key: string]: string | string[] | undefined }, key: string) {
  const v = searchParams[key];
  return typeof v === "string" ? v : "";
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  await requireRole(["admin", "agent"]);
  const supabase = createClient();

  const from = param(searchParams, "from");
  const to = param(searchParams, "to");
  const departmentId = param(searchParams, "department_id");
  const agentId = param(searchParams, "agent_id");
  const companyId = param(searchParams, "company_id");

  let query = supabase
    .from("tickets")
    .select(
      `id, ticket_number, subject, status, priority, created_at, resolved_at, closed_at, sla_resolution_due,
       company:companies(name),
       department:departments(name),
       category:categories(name),
       agent:profiles!tickets_assigned_agent_id_fkey(full_name),
       requester:profiles!tickets_requester_id_fkey(full_name, email)`
    )
    .order("created_at", { ascending: false })
    .limit(2000);

  if (from) query = query.gte("created_at", `${from}T00:00:00`);
  if (to) query = query.lte("created_at", `${to}T23:59:59`);
  if (departmentId) query = query.eq("department_id", departmentId);
  if (agentId) query = query.eq("assigned_agent_id", agentId);
  if (companyId) query = query.eq("company_id", companyId);

  const [{ data: ticketsRaw }, { data: departments }, { data: companies }, { data: agentsRaw }] =
    await Promise.all([
      query,
      supabase.from("departments").select("*").eq("is_active", true).order("name"),
      supabase.from("companies").select("*").eq("is_active", true).order("name"),
      supabase
        .from("profiles")
        .select("id, full_name")
        .in("role", ["admin", "agent"])
        .eq("is_active", true)
        .order("full_name"),
    ]);

  const rows: ReportTicketRow[] = ((ticketsRaw as unknown as RawTicketRow[]) ?? []).map((t) => ({
    id: t.id,
    ticket_number: t.ticket_number,
    subject: t.subject,
    status: t.status,
    priority: t.priority,
    created_at: t.created_at,
    resolved_at: t.resolved_at,
    closed_at: t.closed_at,
    sla_resolution_due: t.sla_resolution_due,
    company: t.company?.name ?? "—",
    department: t.department?.name ?? "—",
    category: t.category?.name ?? "—",
    agent: t.agent?.full_name ?? "Sin asignar",
    requester: t.requester?.full_name ?? t.requester?.email ?? "—",
  }));

  const summary = computeSummary(rows);
  const byDepartment = groupByDepartment(rows);
  const byAgent = groupByAgent(rows);
  const byCompany = groupByCompany(rows);
  const byMonth = groupByMonth(rows);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Reportes</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} ticket{rows.length === 1 ? "" : "s"} en el rango seleccionado.
          </p>
        </div>
        <ExportButtons rows={rows} />
      </div>

      <ReportFilters
        departments={departments ?? []}
        companies={companies ?? []}
        agents={(agentsRaw as { id: string; full_name: string | null }[] | null) ?? []}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-0">
            <CardTitle>Total</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{summary.total}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-0">
            <CardTitle>Resueltos</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{summary.resueltos}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-0">
            <CardTitle>Cerrados</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{summary.cerrados}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-0">
            <CardTitle>Cumplimiento SLA</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{summary.slaCumplimientoPct}%</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-0">
            <CardTitle>Tiempo prom. resolución</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {summary.tiempoPromedioResolucionHoras !== null
              ? `${summary.tiempoPromedioResolucionHoras} h`
              : "—"}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ReportTable title="Por departamento" rows={byDepartment} />
        <ReportTable title="Por agente" rows={byAgent} />
        <ReportTable title="Por empresa" rows={byCompany} />
        <ReportTable title="Por mes" rows={byMonth} />
      </div>
    </div>
  );
}

function ReportTable({ title, rows }: { title: string; rows: GroupRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">Nombre</th>
              <th className="px-3 py-2 font-medium">Total</th>
              <th className="px-3 py-2 font-medium">Resueltos</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-border last:border-0">
                <td className="px-3 py-2">{r.label}</td>
                <td className="px-3 py-2">{r.total}</td>
                <td className="px-3 py-2">{r.resueltos}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">
                  Sin datos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
