import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EquipoCategoriasManager } from "@/components/settings/equipo-categorias-manager";

export default async function EquipoCategoriasSettingsPage() {
  await requireRole(["admin"]);
  const supabase = createClient();
  const { data } = await supabase.from("equipo_categorias").select("*").order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Categorías de equipo</h1>
        <p className="text-sm text-muted-foreground">
          Tipos de equipo (PC de escritorio, laptop, monitor, impresora…) usados en el inventario.
        </p>
      </div>
      <EquipoCategoriasManager initial={data ?? []} />
    </div>
  );
}
