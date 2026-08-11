"use client";

import { useState, type FormEvent } from "react";
import { Trash2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Tables } from "@/types/database";

type Department = Tables<"departments">;

export function DepartmentsManager({ initial }: { initial: Department[] }) {
  const supabase = createClient();
  const [items, setItems] = useState(initial);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);

    const { data, error } = await supabase
      .from("departments")
      .insert({ name: name.trim() })
      .select()
      .single();

    if (error) {
      setError(error.message);
    } else if (data) {
      setItems((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
    }
    setSaving(false);
  }

  async function handleToggle(id: string, is_active: boolean) {
    setItems((prev) => prev.map((d) => (d.id === id ? { ...d, is_active } : d)));
    const { error } = await supabase.from("departments").update({ is_active }).eq("id", id);
    if (error) setError(error.message);
  }

  async function handleDelete(id: string) {
    const prev = items;
    setItems((cur) => cur.filter((d) => d.id !== id));
    const { error } = await supabase.from("departments").delete().eq("id", id);
    if (error) {
      setError(error.message);
      setItems(prev);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del departamento"
          className="max-w-xs"
        />
        <Button type="submit" disabled={saving}>
          <Plus className="h-4 w-4" />
          Agregar
        </Button>
      </form>

      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="divide-y divide-border rounded-lg border border-border">
        {items.map((d) => (
          <div key={d.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
            <span className={d.is_active ? "" : "text-muted-foreground line-through"}>
              {d.name}
            </span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={d.is_active}
                  onChange={(e) => handleToggle(d.id, e.target.checked)}
                  className="h-4 w-4 accent-accent"
                />
                Activo
              </label>
              <button
                type="button"
                onClick={() => handleDelete(d.id)}
                aria-label={`Eliminar ${d.name}`}
                className="text-muted-foreground hover:text-danger"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            No hay departamentos todavía.
          </p>
        )}
      </div>
    </div>
  );
}
