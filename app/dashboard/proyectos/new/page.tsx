import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { withJwtSkewRetry } from "@/lib/supabase/retry";
import { NewProjectForm } from "@/components/proyectos/new-project-form";

export default async function NewProyectoPage() {
  const profile = await requireRole(["admin", "agent"]);
  const supabase = createClient();

  const [{ data: companies }, { data: departments }, { data: categorias }, { data: staff }] =
    await Promise.all([
      withJwtSkewRetry(() => supabase.from("companies").select("*").eq("is_active", true).order("name")),
      withJwtSkewRetry(() => supabase.from("departments").select("*").eq("is_active", true).order("name")),
      withJwtSkewRetry(() =>
        supabase.from("proyecto_categorias").select("*").eq("is_active", true).order("name")
      ),
      withJwtSkewRetry(() =>
        supabase
          .from("profiles")
          .select("id, full_name")
          .in("role", ["admin", "agent"])
          .eq("is_active", true)
          .order("full_name")
      ),
    ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Nuevo proyecto</h1>
        <p className="text-sm text-muted-foreground">
          Para trabajo propio del área — automatizaciones, configuración de equipos, infraestructura,
          migraciones, capacitación. No reemplaza un ticket, es para lo que tú decides emprender.
        </p>
      </div>

      <NewProjectForm
        companies={companies ?? []}
        departments={departments ?? []}
        categorias={categorias ?? []}
        staff={(staff as { id: string; full_name: string | null }[]) ?? []}
        defaultResponsableId={profile.id}
      />
    </div>
  );
}
