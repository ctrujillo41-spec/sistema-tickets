import { requireRole } from "@/lib/auth";
import { ImportInventarioForm } from "@/components/equipos/import-inventario-form";

export default async function ImportarEquiposPage() {
  await requireRole(["admin", "agent"]);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Importar inventario</h1>
        <p className="text-sm text-muted-foreground">
          Sube el CSV del escaneo técnico (una fila por equipo). Si la etiqueta (columna &quot;ID&quot;)
          ya existe, se actualizan sus datos técnicos; si no existe, se da de alta como equipo nuevo. Los
          datos que administras a mano (categoría, empresa, departamento, usuario asignado, ubicación,
          estado, notas, compra) no se tocan al importar. Puedes repetir esta importación las veces que
          necesites, según vayas escaneando más equipos o actualizando los existentes.
        </p>
      </div>
      <ImportInventarioForm />
    </div>
  );
}
