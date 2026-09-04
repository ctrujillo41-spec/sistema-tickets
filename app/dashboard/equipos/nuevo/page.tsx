import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { withJwtSkewRetry } from "@/lib/supabase/retry";
import { NewEquipoForm } from "@/components/equipos/new-equipo-form";

export default async function NuevoEquipoPage() {
  await requireRole(["admin", "agent"]);
  const supabase = createClient();

  const [{ data: companies }, { data: departments }, { data: categorias }, { data: staff }] =
    await Promise.all([
      withJwtSkewRetry(() => supabase.from("companies").select("*").eq("is_active", true).order("name")),
      withJwtSkewRetry(() => supabase.from("departments").select("*").eq("is_active", true).order("name")),
      withJwtSkewRetry(() =>
        supabase.from("equipo_categorias").select("*").eq("is_active", true).order("name")
      ),
      withJwtSkewRetry(() =>
        supabase.from("profiles").select("id, full_name").eq("is_active", true).order("full_name")
      ),
    ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Nuevo equipo</h1>
        <p className="text-sm text-muted-foreground">
          Da de alta un equipo en el inventario. Podrás llevar su bitácora de daños, consumibles y
          mejoras desde su ficha.
        </p>
      </div>

      <NewEquipoForm
        companies={companies ?? []}
        departments={departments ?? []}
        categorias={categorias ?? []}
        staff={(staff as { id: string; full_name: string | null }[]) ?? []}
      />
    </div>
  );
}
