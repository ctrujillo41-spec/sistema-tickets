"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Monitor } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { EQUIPO_STATUS_LABELS, EQUIPO_STATUS_ORDER, EQUIPO_STATUS_TONE } from "@/lib/equipos";

export interface EquipoListRow {
  id: string;
  folio: number;
  etiqueta: string;
  marca: string | null;
  modelo: string | null;
  numero_serie: string | null;
  status: string;
  ubicacion: string | null;
  categoria_id: string | null;
  company_id: string | null;
  categoria: { name: string } | null;
  company: { name: string } | null;
  department: { name: string } | null;
  asignado: { full_name: string | null } | null;
}

interface FilterOption {
  id: string;
  name: string;
}

export function EquiposTable({
  equipos,
  categorias,
  companies,
}: {
  equipos: EquipoListRow[];
  categorias: FilterOption[];
  companies: FilterOption[];
}) {
  const [search, setSearch] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [status, setStatus] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return equipos.filter((e) => {
      if (categoriaId && e.categoria_id !== categoriaId) return false;
      if (companyId && e.company_id !== companyId) return false;
      if (status && e.status !== status) return false;
      if (
        q &&
        !`${e.etiqueta} ${e.marca ?? ""} ${e.modelo ?? ""} ${e.numero_serie ?? ""} ${e.asignado?.full_name ?? ""}`
          .toLowerCase()
          .includes(q)
      )
        return false;
      return true;
    });
  }, [equipos, search, categoriaId, companyId, status]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por etiqueta, marca, serie, usuario…"
          className="sm:col-span-2"
        />
        <Select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
          <option value="">Todas las empresas</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          {EQUIPO_STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {EQUIPO_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">Etiqueta</th>
              <th className="px-3 py-2 font-medium">Categoría</th>
              <th className="px-3 py-2 font-medium">Marca / modelo</th>
              <th className="px-3 py-2 font-medium">Empresa</th>
              <th className="px-3 py-2 font-medium">Asignado a</th>
              <th className="px-3 py-2 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                <td className="px-3 py-2">
                  <Link href={`/dashboard/equipos/${e.id}`} className="font-medium text-accent hover:underline">
                    #{e.folio}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <Link href={`/dashboard/equipos/${e.id}`} className="hover:underline">
                    {e.etiqueta}
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{e.categoria?.name ?? "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {[e.marca, e.modelo].filter(Boolean).join(" ") || "—"}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{e.company?.name ?? "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{e.asignado?.full_name ?? "Sin asignar"}</td>
                <td className="px-3 py-2">
                  <Badge tone={EQUIPO_STATUS_TONE[e.status] ?? "neutral"}>
                    {EQUIPO_STATUS_LABELS[e.status] ?? e.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <Card className="rounded-none border-0">
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <Monitor className="h-8 w-8 text-muted-foreground/50" />
              {equipos.length === 0
                ? "No hay equipos registrados todavía."
                : "Ningún equipo coincide con el filtro."}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
