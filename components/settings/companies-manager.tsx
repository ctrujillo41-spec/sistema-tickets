"use client";

import { useState, type FormEvent } from "react";
import { Trash2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Tables } from "@/types/database";

type Company = Tables<"companies">;

export function CompaniesManager({ initial }: { initial: Company[] }) {
  const supabase = createClient();
  const [items, setItems] = useState(initial);
  const [name, setName] = useState("");
  const [rfc, setRfc] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);

    const { data, error } = await supabase
      .from("companies")
      .insert({ name: name.trim(), rfc: rfc.trim() || null })
      .select()
      .single();

    if (error) {
      setError(error.message);
    } else if (data) {
      setItems((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
      setRfc("");
    }
    setSaving(false);
  }

  async function handleToggle(id: string, is_active: boolean) {
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, is_active } : c)));
    const { error } = await supabase.from("companies").update({ is_active }).eq("id", id);
    if (error) setError(error.message);
  }

  async function handleDelete(id: string) {
    const prev = items;
    setItems((cur) => cur.filter((c) => c.id !== id));
    const { error } = await supabase.from("companies").delete().eq("id", id);
    if (error) {
      setError(error.message);
      setItems(prev);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="flex flex-wrap gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la empresa"
          className="max-w-xs"
        />
        <Input
          value={rfc}
          onChange={(e) => setRfc(e.target.value)}
          placeholder="RFC (opcional)"
          className="max-w-[160px]"
        />
        <Button type="submit" disabled={saving}>
          <Plus className="h-4 w-4" />
          Agregar
        </Button>
      </form>

      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="divide-y divide-border rounded-lg border border-border">
        {items.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
            <div className={c.is_active ? "" : "text-muted-foreground line-through"}>
              <span>{c.name}</span>
              {c.rfc && <span className="ml-2 text-xs text-muted-foreground">{c.rfc}</span>}
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={c.is_active}
                  onChange={(e) => handleToggle(c.id, e.target.checked)}
                  className="h-4 w-4 accent-accent"
                />
                Activa
              </label>
              <button
                type="button"
                onClick={() => handleDelete(c.id)}
                aria-label={`Eliminar ${c.name}`}
                className="text-muted-foreground hover:text-danger"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            No hay empresas registradas todavía.
          </p>
        )}
      </div>
    </div>
  );
}
