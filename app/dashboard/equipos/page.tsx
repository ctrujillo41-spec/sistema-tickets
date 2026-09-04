import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { withJwtSkewRetry } from "@/lib/supabase/retry";
import { EquiposTable, type EquipoListRow } from "@/components/equipos/equipos-table";

export const dynamic = "force-dynamic";

export default async function EquiposPage() {
  // Igual que Proyectos: módulo interno de soporte, no lo ve el usuario final.
  await requireRole(["admin", "agent"]);
  const supabase = createClient();

  const [{ data, error }, { data: categorias }, { data: companies }] = await Promise.all([
    withJwtSkewRetry(() =>
      supabase
        .from("equipos")
        .select(
          `id, folio, etiqueta, marca, modelo, numero_serie, ip_address, status, ubicacion,
           categoria_id, company_id,
           categoria:equipo_categorias(name),
           company:companies(name),
           department:departments(name),
           asignado:profiles!equipos_asignado_a_fkey(full_name)`
        )
        .order("created_at", { ascending: false })
        .limit(500)
    ),
    withJwtSkewRetry(() => supabase.from("equipo_categorias").select("id, name").eq("is_active", true).order("name")),
    withJwtSkewRetry(() => supabase.from("companies").select("id, name").eq("is_active", true).order("name")),
  ]);

  const equipos = data as unknown as EquipoListRow[] | null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Equipos</h1>
          <p className="text-sm text-muted-foreground">
            Inventario de equipos de cómputo y su bitácora de daños, consumibles y mejoras.
          </p>
        </div>
        <Link href="/dashboard/equipos/nuevo">
          <Button>
            <Plus className="h-4 w-4" />
            Nuevo equipo
          </Button>
        </Link>
      </div>

      {error && <p className="text-sm text-danger">No se pudieron cargar los equipos: {error.message}</p>}

      <EquiposTable
        equipos={equipos ?? []}
        categorias={categorias ?? []}
        companies={companies ?? []}
      />
    </div>
  );
}
