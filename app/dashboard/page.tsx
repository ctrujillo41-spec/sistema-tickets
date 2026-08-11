import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock, Flame, Inbox } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { slaCountFilter } from "@/lib/sla";

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

  const KPIS = [
    { label: "Abiertos", value: abiertos.count ?? 0, icon: Inbox, tone: "accent" as const },
    { label: "Cerrados (mes)", value: cerradosMes.count ?? 0, icon: CheckCircle2, tone: "success" as const },
    { label: "Pendientes", value: pendientes.count ?? 0, icon: Clock, tone: "warning" as const },
    { label: "Vencidos", value: vencidos.count ?? 0, icon: AlertTriangle, tone: "danger" as const },
    { label: "Críticos", value: criticos.count ?? 0, icon: Flame, tone: "danger" as const },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Hola, {profile?.full_name || profile?.email}</h1>
        <p className="text-sm text-muted-foreground">
          Conectado como <Badge tone="accent">{roleLabel}</Badge>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {KPIS.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-0">
              <CardTitle>{label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{value}</div>
              <Badge tone={tone} className="mt-2">
                Actualizado ahora
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tickets recientes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {recientes.data?.map((t) => (
            <Link
              key={t.id}
              href={`/dashboard/tickets/${t.id}`}
              className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted"
            >
              <span>
                #{t.ticket_number} · {t.subject}
              </span>
              <span className="text-xs text-muted-foreground">{t.status}</span>
            </Link>
          ))}
          {(!recientes.data || recientes.data.length === 0) && (
            <p className="text-muted-foreground">
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
