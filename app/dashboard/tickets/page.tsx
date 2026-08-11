import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABELS, STATUS_TONE, PRIORITY_LABELS, PRIORITY_TONE } from "@/lib/tickets";
import { isOverdue } from "@/lib/sla";

export const dynamic = "force-dynamic";

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

export default async function TicketsPage() {
  const supabase = createClient();

  // RLS decide qué filas ve cada quien (sección 4.4 del documento de
  // arquitectura): el usuario final solo las suyas, el agente las de
  // su departamento o asignadas, el admin todas.
  const { data, error } = await supabase
    .from("tickets")
    .select(
      `id, ticket_number, subject, status, priority, created_at,
       sla_response_due, sla_resolution_due, first_response_at, resolved_at,
       company:companies(name),
       department:departments(name),
       requester:profiles!tickets_requester_id_fkey(full_name),
       agent:profiles!tickets_assigned_agent_id_fkey(full_name)`
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const tickets = data as unknown as TicketListRow[] | null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Tickets</h1>
          <p className="text-sm text-muted-foreground">
            {tickets?.length ?? 0} ticket{tickets?.length === 1 ? "" : "s"} visibles para tu rol.
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
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">Asunto</th>
              <th className="px-3 py-2 font-medium">Empresa</th>
              <th className="px-3 py-2 font-medium">Departamento</th>
              <th className="px-3 py-2 font-medium">Prioridad</th>
              <th className="px-3 py-2 font-medium">Estado</th>
              <th className="px-3 py-2 font-medium">Agente</th>
              <th className="px-3 py-2 font-medium">Creado</th>
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
      </div>
    </div>
  );
}
