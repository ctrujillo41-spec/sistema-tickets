import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CompaniesManager } from "@/components/settings/companies-manager";

export default async function CompaniesSettingsPage() {
  await requireRole(["admin"]);
  const supabase = createClient();
  const { data } = await supabase.from("companies").select("*").order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Empresas / clientes</h1>
        <p className="text-sm text-muted-foreground">
          Al crear un ticket, primero se elige la empresa y luego la categoría, como se
          definió en el documento de arquitectura.
        </p>
      </div>
      <CompaniesManager initial={data ?? []} />
    </div>
  );
}
