"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { EQUIPO_STATUS_LABELS, EQUIPO_STATUS_ORDER } from "@/lib/equipos";
import type { TablesUpdate } from "@/types/database";

type EquipoPatch = TablesUpdate<"equipos">;

interface StaffOption {
  id: string;
  full_name: string | null;
}

interface NamedOption {
  id: string;
  name: string;
}

export function EquipoStatusControls({
  equipoId,
  initialStatus,
  initialAsignadoA,
  initialIpAddress,
  initialCategoriaId,
  initialCompanyId,
  initialDepartmentId,
  initialUbicacion,
  staff,
  categorias,
  companies,
  departments,
}: {
  equipoId: string;
  initialStatus: string;
  initialAsignadoA: string | null;
  initialIpAddress?: string | null;
  initialCategoriaId?: string | null;
  initialCompanyId?: string | null;
  initialDepartmentId?: string | null;
  initialUbicacion?: string | null;
  staff: StaffOption[];
  categorias?: NamedOption[];
  companies?: NamedOption[];
  departments?: NamedOption[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [status, setStatus] = useState(initialStatus);
  const [asignadoA, setAsignadoA] = useState(initialAsignadoA ?? "");
  const [ipAddress, setIpAddress] = useState(initialIpAddress ?? "");
  const [categoriaId, setCategoriaId] = useState(initialCategoriaId ?? "");
  const [companyId, setCompanyId] = useState(initialCompanyId ?? "");
  const [departmentId, setDepartmentId] = useState(initialDepartmentId ?? "");
  const [ubicacion, setUbicacion] = useState(initialUbicacion ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function persist(patch: EquipoPatch) {
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("equipos").update(patch).eq("id", equipoId);
    if (error) {
      setError(error.message);
    } else {
      router.refresh();
    }
    setSaving(false);
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Estado</label>
        <Select
          value={status}
          disabled={saving}
          onChange={(e) => {
            setStatus(e.target.value);
            persist({ status: e.target.value });
          }}
          className="w-full"
        >
          {EQUIPO_STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {EQUIPO_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>

      {categorias && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Categoría</label>
          <Select
            value={categoriaId}
            disabled={saving}
            onChange={(e) => {
              setCategoriaId(e.target.value);
              persist({ categoria_id: e.target.value || null });
            }}
            className="w-full"
          >
            <option value="">Sin especificar</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      {companies && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Empresa</label>
          <Select
            value={companyId}
            disabled={saving}
            onChange={(e) => {
              setCompanyId(e.target.value);
              persist({ company_id: e.target.value || null });
            }}
            className="w-full"
          >
            <option value="">Interno / sin especificar</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      {departments && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Departamento</label>
          <Select
            value={departmentId}
            disabled={saving}
            onChange={(e) => {
              setDepartmentId(e.target.value);
              persist({ department_id: e.target.value || null });
            }}
            className="w-full"
          >
            <option value="">Sin especificar</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Ubicación</label>
        <Input
          value={ubicacion}
          disabled={saving}
          onChange={(e) => setUbicacion(e.target.value)}
          onBlur={() => {
            if ((ubicacion || null) !== (initialUbicacion ?? null)) {
              persist({ ubicacion: ubicacion.trim() || null });
            }
          }}
          placeholder="Ej. Oficina Aguascalientes, piso 2"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Usuario asignado</label>
        <Select
          value={asignadoA}
          disabled={saving}
          onChange={(e) => {
            setAsignadoA(e.target.value);
            persist({ asignado_a: e.target.value || null });
          }}
          className="w-full"
        >
          <option value="">Sin asignar</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name ?? "—"}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Dirección IP</label>
        <Input
          value={ipAddress}
          disabled={saving}
          onChange={(e) => setIpAddress(e.target.value)}
          onBlur={() => {
            if ((ipAddress || null) !== (initialIpAddress ?? null)) {
              persist({ ip_address: ipAddress.trim() || null });
            }
          }}
          placeholder="Ej. 192.168.1.50"
        />
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
