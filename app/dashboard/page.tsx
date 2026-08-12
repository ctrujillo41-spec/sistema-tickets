import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock, Flame, Inbox } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { slaCountFilter } from "@/lib/sla";
import { STATUS_LABELS, STATUS_TONE } from "@/lib/tickets";
import { cn } from "@/lib/utils";

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
    warning: "bg-warning/10 border-warning/20",
    danger: "bg-danger/10 border-danger/20",
  };
  const TINT_TEXT: Record<string, string> = {
    warning: "text-warning",
    danger: "text-danger",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
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
            <div className={cn("mt-1.5 text-2xl font-semibold", tinted && TINT_TEXT[tinted])}>
              {value}
            </div>
          </div>
        ))}
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
