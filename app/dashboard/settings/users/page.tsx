import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { UsersTable } from "@/components/settings/users-table";

export default async function UsersSettingsPage() {
  await requireRole(["admin"]);
  const supabase = createClient();

  const [{ data: profiles }, { data: departments }, { data: companies }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("departments").select("*").eq("is_active", true).order("name"),
    supabase.from("companies").select("*").eq("is_active", true).order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Usuarios y agentes</h1>
        <p className="text-sm text-muted-foreground">
          Cambia el rol, departamento o empresa de cada persona. Las nuevas cuentas se crean
          desde la pantalla de registro (/signup) con rol &quot;usuario final&quot; por
          defecto.
        </p>
      </div>

      <UsersTable
        initialProfiles={profiles ?? []}
        departments={departments ?? []}
        companies={companies ?? []}
      />
    </div>
  );
}
