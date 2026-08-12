import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABELS, STATUS_TONE, PRIORITY_LABELS, PRIORITY_TONE } from "@/lib/tickets";
import { isOverdue } from "@/lib/sla";
import { TicketStatusControls } from "@/components/tickets/ticket-status-controls";
import { RequesterActions } from "@/components/tickets/requester-actions";
import { CommentsSection } from "@/components/tickets/comments-section";
import { AttachmentsSection } from "@/components/tickets/attachments-section";

export const dynamic = "force-dynamic";

interface TicketDetail {
  id: string;
  ticket_number: number;
  subject: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  requester_id: string;
  assigned_agent_id: string | null;
  company_id: string | null;
  csat_rating: number | null;
  sla_response_due: string | null;
  sla_resolution_due: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  company: { name: string } | null;
  department: { name: string } | null;
  category: { name: string } | null;
  subcategory: { name: string } | null;
  requester: { full_name: string | null; email: string | null } | null;
  agent: { full_name: string | null } | null;
}

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  const profile = await getCurrentProfile();
  const supabase = createClient();

  const { data: ticketRaw } = await supabase
    .from("tickets")
    .select(
      `id, ticket_number, subject, description, status, priority, created_at,
       requester_id, assigned_agent_id, company_id, csat_rating,
       sla_response_due, sla_resolution_due, first_response_at, resolved_at,
       company:companies(name),
       department:departments(name),
       category:categories(name),
       subcategory:subcategories(name),
       requester:profiles!tickets_requester_id_fkey(full_name, email),
       agent:profiles!tickets_assigned_agent_id_fkey(full_name)`
    )
    .eq("id", params.id)
    .single();

  if (!ticketRaw) notFound();
  const ticket = ticketRaw as unknown as TicketDetail;

  const isStaff = profile?.role === "admin" || profile?.role === "agent";
  const isAdmin = profile?.role === "admin";

  const [{ data: commentsRaw }, { data: attachmentsRaw }, { data: historyRaw }, { data: agentsRaw }, { data: companiesRaw }] =
    await Promise.all([
      supabase
        .from("ticket_comments")
        .select("id, body, is_internal, created_at, author:profiles!ticket_comments_author_id_fkey(full_name, role)")
        .eq("ticket_id", params.id)
        .order("created_at"),
      supabase
        .from("ticket_attachments")
        .select("id, file_name, file_path, created_at, uploader:profiles!ticket_attachments_uploaded_by_fkey(full_name)")
        .eq("ticket_id", params.id)
        .order("created_at"),
      supabase
        .from("ticket_history")
        .select("id, field_name, old_value, new_value, created_at, actor:profiles!ticket_history_changed_by_fkey(full_name)")
        .eq("ticket_id", params.id)
        .order("created_at", { ascending: false }),
      isStaff
        ? supabase.from("profiles").select("id, full_name").in("role", ["admin", "agent"]).eq("is_active", true).order("full_name")
        : Promise.resolve({ data: [] }),
      isAdmin
        ? supabase.from("companies").select("id, name").eq("is_active", true).order("name")
        : Promise.resolve({ data: [] }),
    ]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold">
              #{ticket.ticket_number} · {ticket.subject}
            </h1>
            <Badge tone={STATUS_TONE[ticket.status] ?? "neutral"}>{STATUS_LABELS[ticket.status] ?? ticket.status}</Badge>
            <Badge tone={PRIORITY_TONE[ticket.priority] ?? "neutral"}>{PRIORITY_LABELS[ticket.priority] ?? ticket.priority}</Badge>
            {isOverdue(ticket) && <Badge tone="danger">SLA vencido</Badge>}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Creado por {ticket.requester?.full_name ?? ticket.requester?.email} el{" "}
            {new Date(ticket.created_at).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>

        <Card>
          <CardContent className="whitespace-pre-wrap pt-4 text-sm">{ticket.description}</CardContent>
        </Card>

        <CommentsSection
          ticketId={ticket.id}
          initialComments={(commentsRaw as any) ?? []}
          canPostInternal={isStaff}
        />
      </div>

      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-2 pt-4 text-sm">
            <p className="text-xs font-medium text-muted-foreground">Detalles</p>
            <dl className="space-y-1">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Empresa</dt>
                <dd>{ticket.company?.name ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Departamento</dt>
                <dd>{ticket.department?.name ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Categoría</dt>
                <dd>{ticket.category?.name ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Subcategoría</dt>
                <dd>{ticket.subcategory?.name ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Agente</dt>
                <dd>{ticket.agent?.full_name ?? "Sin asignar"}</dd>
              </div>
              {ticket.sla_response_due && !ticket.first_response_at && (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Respuesta límite</dt>
                  <dd>{new Date(ticket.sla_response_due).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}</dd>
                </div>
              )}
              {ticket.sla_resolution_due && !ticket.resolved_at && (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Resolución límite</dt>
                  <dd>{new Date(ticket.sla_resolution_due).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {isStaff && (
          <Card>
            <CardContent className="pt-4">
              <TicketStatusControls
                ticketId={ticket.id}
                initialStatus={ticket.status}
                initialPriority={ticket.priority}
                initialAgentId={ticket.assigned_agent_id}
                agents={(agentsRaw as any) ?? []}
                initialCompanyId={ticket.company_id}
                companies={(companiesRaw as any) ?? []}
                canEditCompany={isAdmin}
              />
            </CardContent>
          </Card>
        )}

        {!isStaff && profile?.id === ticket.requester_id && (
          <RequesterActions ticketId={ticket.id} status={ticket.status} csatRating={ticket.csat_rating} />
        )}

        <Card>
          <CardContent className="pt-4">
            <AttachmentsSection ticketId={ticket.id} initialAttachments={(attachmentsRaw as any) ?? []} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 pt-4">
            <p className="text-xs font-medium text-muted-foreground">Historial</p>
            <ul className="space-y-2 text-xs">
              {((historyRaw as any) ?? []).map((h: any) => (
                <li key={h.id} className="border-b border-border pb-2 last:border-0">
                  <span className="font-medium">{h.actor?.full_name ?? "Sistema"}</span> cambió{" "}
                  <span className="text-muted-foreground">{h.field_name}</span> de{" "}
                  <span className="text-muted-foreground">{h.old_value ?? "—"}</span> a{" "}
                  <span className="text-foreground">{h.new_value ?? "—"}</span>
                  <div className="text-muted-foreground">
                    {new Date(h.created_at).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
                  </div>
                </li>
              ))}
              {((historyRaw as any) ?? []).length === 0 && (
                <p className="text-muted-foreground">Sin cambios registrados.</p>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
