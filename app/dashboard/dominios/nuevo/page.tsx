import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { withJwtSkewRetry } from "@/lib/supabase/retry";
import { NewDominioForm } from "@/components/dominios/new-dominio-form";

export default async function NuevoDominioPage() {
  await requireRole(["admin"]);
  const supabase = createClient();

  const [{ data: companies }, { data: staff }] = await Promise.all([
    withJwtSkewRetry(() => supabase.from("companies").select("*").eq("is_active", true).order("name")),
    withJwtSkewRetry(() =>
      supabase.from("profiles").select("id, full_name").eq("is_active", true).order("full_name")
    ),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Nuevo dominio</h1>
        <p className="text-sm text-muted-foreground">
          Registra un dominio administrado: vencimiento, costo, hosting y credenciales asociadas.
        </p>
      </div>

      <NewDominioForm
        companies={companies ?? []}
        staff={(staff as { id: string; full_name: string | null }[]) ?? []}
      />
    </div>
  );
}
