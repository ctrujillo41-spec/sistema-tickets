import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { withJwtSkewRetry } from "@/lib/supabase/retry";
import { STATUS_LABELS, STATUS_TONE, PRIORITY_LABELS, PRIORITY_TONE } from "@/lib/tickets";
import { isOverdue } from "@/lib/sla";
import { TicketsPagination } from "@/components/tickets/tickets-pagination";
import { SortableTh } from "@/components/ui/sortable-th";
import { parseSort, sortHref } from "@/lib/sort";

export const dynamic = "force-dynamic";

const PAGE_SIZES = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = 10;

interface TicketListRow {
  id: string;
  ticket_number: number;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  sla_response_due: string | null;
  sla_resolution_due: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  company: { name: string } | null;
  department: { name: string } | null;
  requester: { full_name: string | null } | null;
  agent: { full_name: string | null } | null;
}

// Columna de la UI -> expresión de orden de PostgREST. Las columnas de
// tablas relacionadas usan la sintaxis `relacion(columna)`.
const SORT_COLUMNS: Record<string, string> = {
  ticket_number: "ticket_number",
  subject: "subject",
  company: "company(name)",
  department: "department(name)",
  priority: "priority",
  status: "status",
  agent: "agent(full_name)",
  created_at: "created_at",
};

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: { page?: string; pageSize?: string; sort?: string; dir?: string };
}) {
  const supabase = createClient();
  const currentSort = parseSort(searchParams, Object.keys(SORT_COLUMNS), "created_at", "desc");
  const th = (field: string, label: string) => (
    <SortableTh
      label={label}
      active={currentSort.sort === field}
      dir={currentSort.dir}
      href={sortHref("/dashboard/tickets", searchParams, field, currentSort)}
    />
  );

  const pageSize = PAGE_SIZES.includes(Number(searchParams.pageSize))
    ? Number(searchParams.pageSize)
    : DEFAULT_PAGE_SIZE;
  const requestedPage = Math.max(1, Number(searchParams.page) || 1);

  const from = (requestedPage - 1) * pageSize;
  const to = from + pageSize - 1;

  // RLS decide qué filas ve cada quien (sección 4.4 del documento de
  // arquitectura): el usuario final solo las suyas, el agente las de
  // su departamento o asignadas, el admin todas.
  const fetchPage = (orderBy: string, ascending: boolean) =>
    withJwtSkewRetry(() =>
      supabase
        .from("tickets")
        .select(
          `id, ticket_number, subject, status, priority, created_at,
           sla_response_due, sla_resolution_due, first_response_at, resolved_at,
           company:companies(name),
           department:departments(name),
           requester:profiles!tickets_requester_id_fkey(full_name),
           agent:profiles!tickets_assigned_agent_id_fkey(full_name)`,
          { count: "exact" }
        )
        .order(orderBy, { ascending, nullsFirst: false })
        // Desempate estable para que la paginación no repita ni omita filas.
        .order("ticket_number", { ascending: false })
        .range(from, to)
    );

  let { data, error, count } = await fetchPage(SORT_COLUMNS[currentSort.sort], currentSort.dir === "asc");
  if (error && SORT_COLUMNS[currentSort.sort].includes("(")) {
    // Si el orden por columna relacionada falla, cae al orden por defecto.
    ({ data, error, count } = await fetchPage("created_at", false));
  }

  const tickets = data as unknown as TicketListRow[] | null;
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Tickets</h1>
          <p className="text-sm text-muted-foreground">
            {total} ticket{total === 1 ? "" : "s"} visibles para tu rol.
          </p>
        </div>
        <Link href="/dashboard/tickets/new">
          <Button>
            <Plus className="h-4 w-4" />
            Nuevo ticket
          </Button>
        </Link>
      </div>

      {error && <p className="text-sm text-danger">No se pudieron cargar los tickets: {error.message}</p>}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted text-left text-xs text-muted-foreground">
              {th("ticket_number", "#")}
              {th("subject", "Asunto")}
              {th("company", "Empresa")}
              {th("department", "Departamento")}
              {th("priority", "Prioridad")}
              {th("status", "Estado")}
              {th("agent", "Agente")}
              {th("created_at", "Creado")}
            </tr>
          </thead>
          <tbody>
            {tickets?.map((t) => (
              <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                <td className="px-3 py-2">
                  <Link href={`/dashboard/tickets/${t.id}`} className="font-medium text-accent hover:underline">
                    #{t.ticket_number}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <Link href={`/dashboard/tickets/${t.id}`} className="hover:underline">
                    {t.subject}
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{t.company?.name ?? "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{t.department?.name ?? "—"}</td>
                <td className="px-3 py-2">
                  <Badge tone={PRIORITY_TONE[t.priority] ?? "neutral"}>
                    {PRIORITY_LABELS[t.priority] ?? t.priority}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <Badge tone={STATUS_TONE[t.status] ?? "neutral"}>
                      {STATUS_LABELS[t.status] ?? t.status}
                    </Badge>
                    {isOverdue(t) && <Badge tone="danger">Vencido</Badge>}
                  </div>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{t.agent?.full_name ?? "Sin asignar"}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {new Date(t.created_at).toLocaleDateString("es-MX", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tickets?.length === 0 && (
          <Card className="rounded-none border-0">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No hay tickets todavía. Crea el primero con el botón de arriba.
            </CardContent>
          </Card>
        )}
        {total > 0 && <TicketsPagination total={total} page={page} pageSize={pageSize} />}
      </div>
    </div>
  );
}
