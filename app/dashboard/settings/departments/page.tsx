import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DepartmentsManager } from "@/components/settings/departments-manager";

export default async function DepartmentsSettingsPage() {
  await requireRole(["admin"]);
  const supabase = createClient();
  const { data } = await supabase.from("departments").select("*").order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Departamentos</h1>
        <p className="text-sm text-muted-foreground">
          Se usan al crear un ticket y para enrutar agentes por área.
        </p>
      </div>
      <DepartmentsManager initial={data ?? []} />
    </div>
  );
}
