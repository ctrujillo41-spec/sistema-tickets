"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EQUIPO_STATUS_LABELS, EQUIPO_STATUS_ORDER } from "@/lib/equipos";
import type { Tables } from "@/types/database";

type Company = Tables<"companies">;
type Department = Tables<"departments">;
type Categoria = Tables<"equipo_categorias">;

interface StaffOption {
  id: string;
  full_name: string | null;
}

export function NewEquipoForm({
  companies,
  departments,
  categorias,
  staff,
}: {
  companies: Company[];
  departments: Department[];
  categorias: Categoria[];
  staff: StaffOption[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [etiqueta, setEtiqueta] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [numeroSerie, setNumeroSerie] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [asignadoA, setAsignadoA] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [status, setStatus] = useState("activo");
  const [cpu, setCpu] = useState("");
  const [ram, setRam] = useState("");
  const [almacenamiento, setAlmacenamiento] = useState("");
  const [sistemaOperativo, setSistemaOperativo] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [fechaCompra, setFechaCompra] = useState("");
  const [costoCompra, setCostoCompra] = useState("");
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Tu sesión expiró. Vuelve a iniciar sesión.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("equipos")
      .insert({
        etiqueta: etiqueta.trim(),
        categoria_id: categoriaId || null,
        marca: marca.trim() || null,
        modelo: modelo.trim() || null,
        numero_serie: numeroSerie.trim() || null,
        ip_address: ipAddress.trim() || null,
        company_id: companyId || null,
        department_id: departmentId || null,
        asignado_a: asignadoA || null,
        ubicacion: ubicacion.trim() || null,
        status,
        cpu: cpu.trim() || null,
        ram: ram.trim() || null,
        almacenamiento: almacenamiento.trim() || null,
        sistema_operativo: sistemaOperativo.trim() || null,
        proveedor: proveedor.trim() || null,
        fecha_compra: fechaCompra || null,
        costo_compra: costoCompra ? Number(costoCompra) : null,
        notas: notas.trim() || null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push(`/dashboard/equipos/${data.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Etiqueta / número de inventario</label>
          <Input
            value={etiqueta}
            onChange={(e) => setEtiqueta(e.target.value)}
            placeholder="Ej. PC-TI-014"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Categoría</label>
          <Select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="w-full">
            <option value="">Sin especificar</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Marca</label>
          <Input value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Ej. Dell, HP, Lenovo…" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Modelo</label>
          <Input value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="Ej. OptiPlex 3080" />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Número de serie</label>
          <Input value={numeroSerie} onChange={(e) => setNumeroSerie(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Dirección IP</label>
          <Input value={ipAddress} onChange={(e) => setIpAddress(e.target.value)} placeholder="Ej. 192.168.1.50" />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Estado</label>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full">
            {EQUIPO_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {EQUIPO_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Empresa</label>
          <Select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="w-full">
            <option value="">Interno / sin especificar</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Departamento</label>
          <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="w-full">
            <option value="">Sin especificar</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Usuario asignado</label>
          <Select value={asignadoA} onChange={(e) => setAsignadoA(e.target.value)} className="w-full">
            <option value="">Sin asignar</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name ?? "—"}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Ubicación</label>
          <Input value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} placeholder="Ej. Oficina Aguascalientes, piso 2" />
        </div>
      </div>

      <div className="space-y-1 border-t border-border pt-4">
        <p className="text-xs font-medium text-muted-foreground">Especificaciones (opcional)</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">CPU</label>
          <Input value={cpu} onChange={(e) => setCpu(e.target.value)} placeholder="Ej. Intel Core i5-10500" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">RAM</label>
          <Input value={ram} onChange={(e) => setRam(e.target.value)} placeholder="Ej. 8 GB" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Almacenamiento</label>
          <Input value={almacenamiento} onChange={(e) => setAlmacenamiento(e.target.value)} placeholder="Ej. SSD 256 GB" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Sistema operativo</label>
          <Input value={sistemaOperativo} onChange={(e) => setSistemaOperativo(e.target.value)} placeholder="Ej. Windows 11 Pro" />
        </div>
      </div>

      <div className="space-y-1 border-t border-border pt-4">
        <p className="text-xs font-medium text-muted-foreground">Compra (opcional)</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Proveedor</label>
          <Input value={proveedor} onChange={(e) => setProveedor(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Fecha de compra</label>
          <Input type="date" value={fechaCompra} onChange={(e) => setFechaCompra(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Costo</label>
          <Input type="number" min="0" step="0.01" value={costoCompra} onChange={(e) => setCostoCompra(e.target.value)} placeholder="MXN" />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Notas</label>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={3}
          placeholder="Cualquier detalle adicional…"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      <Button type="submit" disabled={loading || !etiqueta.trim()}>
        {loading ? "Creando…" : "Registrar equipo"}
      </Button>
    </form>
  );
}
