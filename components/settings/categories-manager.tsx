"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Trash2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database";

type Category = Tables<"categories">;
type Subcategory = Tables<"subcategories">;
type Company = Tables<"companies">;

export function CategoriesManager({
  initialCategories,
  initialSubcategories,
  companies,
}: {
  initialCategories: Category[];
  initialSubcategories: Subcategory[];
  companies: Company[];
}) {
  const supabase = createClient();
  const [categories, setCategories] = useState(initialCategories);
  const [subcategories, setSubcategories] = useState(initialSubcategories);
  const [selectedId, setSelectedId] = useState<string | null>(initialCategories[0]?.id ?? null);

  const [catName, setCatName] = useState("");
  const [catCompany, setCatCompany] = useState("");
  const [subName, setSubName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const companyName = (id: string | null) =>
    id ? companies.find((c) => c.id === id)?.name ?? "—" : "General (todas las empresas)";

  const subsForSelected = useMemo(
    () => subcategories.filter((s) => s.category_id === selectedId),
    [subcategories, selectedId]
  );

  async function handleAddCategory(e: FormEvent) {
    e.preventDefault();
    if (!catName.trim()) return;
    setError(null);

    const { data, error } = await supabase
      .from("categories")
      .insert({ name: catName.trim(), company_id: catCompany || null })
      .select()
      .single();

    if (error) {
      setError(error.message);
    } else if (data) {
      setCategories((prev) => [...prev, data]);
      setSelectedId(data.id);
      setCatName("");
      setCatCompany("");
    }
  }

  async function handleDeleteCategory(id: string) {
    const prev = categories;
    setCategories((cur) => cur.filter((c) => c.id !== id));
    if (selectedId === id) setSelectedId(null);
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      setError(error.message);
      setCategories(prev);
    }
  }

  async function handleAddSub(e: FormEvent) {
    e.preventDefault();
    if (!subName.trim() || !selectedId) return;
    setError(null);

    const { data, error } = await supabase
      .from("subcategories")
      .insert({ name: subName.trim(), category_id: selectedId })
      .select()
      .single();

    if (error) {
      setError(error.message);
    } else if (data) {
      setSubcategories((prev) => [...prev, data]);
      setSubName("");
    }
  }

  async function handleDeleteSub(id: string) {
    const prev = subcategories;
    setSubcategories((cur) => cur.filter((s) => s.id !== id));
    const { error } = await supabase.from("subcategories").delete().eq("id", id);
    if (error) {
      setError(error.message);
      setSubcategories(prev);
    }
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <form onSubmit={handleAddCategory} className="flex flex-wrap gap-2">
            <Input
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="Nueva categoría"
              className="max-w-[160px]"
            />
            <Select value={catCompany} onChange={(e) => setCatCompany(e.target.value)}>
              <option value="">General</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Button type="submit">
              <Plus className="h-4 w-4" />
              Agregar
            </Button>
          </form>

          <div className="divide-y divide-border rounded-lg border border-border">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2 text-left text-sm",
                  selectedId === c.id ? "bg-accent/15 text-accent" : "hover:bg-muted"
                )}
              >
                <span>
                  {c.name}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {companyName(c.company_id)}
                  </span>
                </span>
                <Trash2
                  className="h-4 w-4 text-muted-foreground hover:text-danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCategory(c.id);
                  }}
                />
              </button>
            ))}
            {categories.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No hay categorías todavía.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">
            Subcategorías {selectedId ? `de "${categories.find((c) => c.id === selectedId)?.name}"` : ""}
          </p>

          <form onSubmit={handleAddSub} className="flex gap-2">
            <Input
              value={subName}
              onChange={(e) => setSubName(e.target.value)}
              placeholder="Nueva subcategoría"
              disabled={!selectedId}
              className="max-w-xs"
            />
            <Button type="submit" disabled={!selectedId}>
              <Plus className="h-4 w-4" />
              Agregar
            </Button>
          </form>

          <div className="divide-y divide-border rounded-lg border border-border">
            {subsForSelected.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-3 py-2 text-sm">
                {s.name}
                <button
                  type="button"
                  onClick={() => handleDeleteSub(s.id)}
                  aria-label={`Eliminar ${s.name}`}
                  className="text-muted-foreground hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {selectedId && subsForSelected.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Sin subcategorías.
              </p>
            )}
            {!selectedId && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Selecciona una categoría a la izquierda.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
