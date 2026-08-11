// Agregaciones para el módulo de Reportes (Fase 6). Los tickets ya llegan
// filtrados por RLS (cada rol ve solo lo que le corresponde) y por los
// filtros de la UI (fecha, departamento, agente, empresa); aquí solo se
// calculan los resúmenes que se muestran en pantalla y se exportan.

export interface ReportTicketRow {
  id: string;
  ticket_number: number;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  resolved_at: string | null;
  closed_at: string | null;
  sla_resolution_due: string | null;
  company: string;
  department: string;
  category: string;
  agent: string;
  requester: string;
}

export interface ReportSummary {
  total: number;
  resueltos: number;
  cerrados: number;
  slaCumplido: number;
  slaVencido: number;
  slaCumplimientoPct: number;
  tiempoPromedioResolucionHoras: number | null;
}

export function computeSummary(rows: ReportTicketRow[]): ReportSummary {
  const total = rows.length;
  const resueltosRows = rows.filter((r) => r.resolved_at);
  const cerrados = rows.filter((r) => r.status === "cerrado").length;

  let slaCumplido = 0;
  let slaVencido = 0;
  resueltosRows.forEach((r) => {
    if (!r.sla_resolution_due) return;
    if (new Date(r.resolved_at!).getTime() <= new Date(r.sla_resolution_due).getTime()) {
      slaCumplido++;
    } else {
      slaVencido++;
    }
  });
  const slaTotal = slaCumplido + slaVencido;
  const slaCumplimientoPct = slaTotal > 0 ? Math.round((slaCumplido / slaTotal) * 100) : 0;

  const resolutionHours = resueltosRows.map(
    (r) => (new Date(r.resolved_at!).getTime() - new Date(r.created_at).getTime()) / 3600000
  );
  const tiempoPromedioResolucionHoras =
    resolutionHours.length > 0
      ? Math.round((resolutionHours.reduce((a, b) => a + b, 0) / resolutionHours.length) * 10) / 10
      : null;

  return {
    total,
    resueltos: resueltosRows.length,
    cerrados,
    slaCumplido,
    slaVencido,
    slaCumplimientoPct,
    tiempoPromedioResolucionHoras,
  };
}

export interface GroupRow {
  label: string;
  total: number;
  resueltos: number;
}

function groupBy(rows: ReportTicketRow[], keyFn: (r: ReportTicketRow) => string): GroupRow[] {
  const map = new Map<string, GroupRow>();
  rows.forEach((r) => {
    const key = keyFn(r) || "—";
    const entry = map.get(key) ?? { label: key, total: 0, resueltos: 0 };
    entry.total += 1;
    if (r.resolved_at) entry.resueltos += 1;
    map.set(key, entry);
  });
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export function groupByDepartment(rows: ReportTicketRow[]): GroupRow[] {
  return groupBy(rows, (r) => r.department);
}

export function groupByAgent(rows: ReportTicketRow[]): GroupRow[] {
  return groupBy(rows, (r) => r.agent);
}

export function groupByCompany(rows: ReportTicketRow[]): GroupRow[] {
  return groupBy(rows, (r) => r.company);
}

export function groupByMonth(rows: ReportTicketRow[]): GroupRow[] {
  const map = new Map<string, GroupRow>();
  rows.forEach((r) => {
    const d = new Date(r.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const entry = map.get(key) ?? { label: key, total: 0, resueltos: 0 };
    entry.total += 1;
    if (r.resolved_at) entry.resueltos += 1;
    map.set(key, entry);
  });
  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
}

export function rowsToCsv(rows: ReportTicketRow[]): string {
  const headers = [
    "Numero",
    "Asunto",
    "Estado",
    "Prioridad",
    "Creado",
    "Resuelto",
    "Cerrado",
    "Empresa",
    "Departamento",
    "Categoria",
    "Agente",
    "Solicitante",
  ];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [headers.join(",")];
  rows.forEach((r) => {
    lines.push(
      [
        r.ticket_number,
        escape(r.subject),
        r.status,
        r.priority,
        r.created_at,
        r.resolved_at ?? "",
        r.closed_at ?? "",
        escape(r.company),
        escape(r.department),
        escape(r.category),
        escape(r.agent),
        escape(r.requester),
      ].join(",")
    );
  });
  return lines.join("\n");
}
