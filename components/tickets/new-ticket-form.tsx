"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PRIORITY_LABELS, PRIORITY_ORDER } from "@/lib/tickets";
import { TicketSuggestions } from "@/components/kb/ticket-suggestions";
import type { Tables } from "@/types/database";

type Company = Tables<"companies">;
type Department = Tables<"departments">;
type Category = Tables<"categories">;
type Subcategory = Tables<"subcategories">;

export function NewTicketForm({
  companies,
  departments,
  categories,
  subcategories,
  defaultCompanyId,
  defaultDepartmentId,
}: {
  companies: Company[];
  departments: Department[];
  categories: Category[];
  subcategories: Subcategory[];
  defaultCompanyId: string | null;
  defaultDepartmentId: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [companyId, setCompanyId] = useState(defaultCompanyId ?? "");
  const [departmentId, setDepartmentId] = useState(defaultDepartmentId ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [priority, setPriority] = useState("media");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Categorías generales (sin empresa) + las específicas de la empresa elegida.
  const availableCategories = useMemo(
    () => categories.filter((c) => !c.company_id || c.company_id === companyId),
    [categories, companyId]
  );
  const availableSubcategories = useMemo(
    () => subcategories.filter((s) => s.category_id === categoryId),
    [subcategories, categoryId]
  );

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
      .from("tickets")
      .insert({
        requester_id: user.id,
        company_id: companyId || null,
        department_id: departmentId || null,
        category_id: categoryId || null,
        subcategory_id: subcategoryId || null,
        priority,
        subject: subject.trim(),
        description: description.trim(),
      })
      .select("id")
      .single();

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push(`/dashboard/tickets/${data.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Empresa / cliente</label>
          <Select
            value={companyId}
            onChange={(e) => {
              setCompanyId(e.target.value);
              setCategoryId("");
              setSubcategoryId("");
            }}
            className="w-full"
          >
            <option value="">Sin especificar</option>
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
          <label className="text-xs font-medium text-muted-foreground">Categoría</label>
          <Select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setSubcategoryId("");
            }}
            className="w-full"
          >
            <option value="">Sin especificar</option>
            {availableCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Subcategoría</label>
          <Select
            value={subcategoryId}
            onChange={(e) => setSubcategoryId(e.target.value)}
            disabled={!categoryId}
            className="w-full"
          >
            <option value="">Sin especificar</option>
            {availableSubcategories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
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
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Asunto</label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Resumen breve del problema o solicitud"
          required
        />
      </div>

      <TicketSuggestions query={`${subject} ${description}`} />

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Descripción</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={5}
          placeholder="Describe el problema con el mayor detalle posible…"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      <Button type="submit" disabled={loading}>
        {loading ? "Creando…" : "Crear ticket"}
      </Button>
    </form>
  );
}
