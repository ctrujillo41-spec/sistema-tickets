"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PRIORITY_LABELS, PRIORITY_ORDER } from "@/lib/tickets";
import type { Tables } from "@/types/database";

type Company = Tables<"companies">;
type Department = Tables<"departments">;
type Categoria = Tables<"proyecto_categorias">;

interface StaffOption {
  id: string;
  full_name: string | null;
}

export function NewProjectForm({
  companies,
  departments,
  categorias,
  staff,
  defaultResponsableId,
}: {
  companies: Company[];
  departments: Department[];
  categorias: Categoria[];
  staff: StaffOption[];
  defaultResponsableId: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [departmentId, setDepartmentId] = useState(
    departments.find((d) => d.name.trim() === "TI")?.id ?? ""
  );
  const [priority, setPriority] = useState("media");
  const [responsableId, setResponsableId] = useState(defaultResponsableId ?? "");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaObjetivo, setFechaObjetivo] = useState("");
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
      .from("proyectos")
      .insert({
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        categoria_id: categoriaId || null,
        company_id: companyId || null,
        department_id: departmentId || null,
        priority,
        responsable_id: responsableId || null,
        created_by: user.id,
        fecha_inicio: fechaInicio || null,
        fecha_objetivo: fechaObjetivo || null,
      })
      .select("id")
      .single();

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push(`/dashboard/proyectos/${data.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Nombre del proyecto</label>
        <Input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej. Automatizar alta de usuarios en Humand"
          required
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Descripción</label>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={4}
          placeholder="Qué se busca lograr, alcance, contexto…"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Tipo</label>
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
          <label className="text-xs font-medium text-muted-foreground">Empresa / cliente</label>
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
          <label className="text-xs font-medium text-muted-foreground">Prioridad</label>
          <Select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full">
            {PRIORITY_ORDER.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Responsable</label>
          <Select value={responsableId} onChange={(e) => setResponsableId(e.target.value)} className="w-full">
            <option value="">Sin asignar</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name ?? "—"}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Inicio</label>
            <Input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Fecha objetivo</label>
            <Input type="date" value={fechaObjetivo} onChange={(e) => setFechaObjetivo(e.target.value)} />
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      <Button type="submit" disabled={loading || !nombre.trim()}>
        {loading ? "Creando…" : "Crear proyecto"}
      </Button>
    </form>
  );
}
