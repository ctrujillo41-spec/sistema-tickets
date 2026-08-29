import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProyectoTiposManager } from "@/components/settings/proyecto-tipos-manager";

export default async function ProyectoTiposSettingsPage() {
  await requireRole(["admin"]);
  const supabase = createClient();
  const { data } = await supabase.from("proyecto_categorias").select("*").order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Tipos de proyecto</h1>
        <p className="text-sm text-muted-foreground">
          El campo "Tipo" que se elige al crear un proyecto en el módulo de Proyectos.
        </p>
      </div>
      <ProyectoTiposManager initial={data ?? []} />
    </div>
  );
}
