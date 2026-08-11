"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Tables } from "@/types/database";

type Category = Tables<"categories">;
type Company = Tables<"companies">;

interface ArticleFormProps {
  mode: "create" | "edit";
  articleId?: string;
  categories: Category[];
  companies: Company[];
  initial?: {
    title: string;
    body: string;
    category_id: string | null;
    company_id: string | null;
    is_published: boolean;
  };
}

export function ArticleForm({ mode, articleId, categories, companies, initial }: ArticleFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? "");
  const [companyId, setCompanyId] = useState(initial?.company_id ?? "");
  const [isPublished, setIsPublished] = useState(initial?.is_published ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      title: title.trim(),
      body: body.trim(),
      category_id: categoryId || null,
      company_id: companyId || null,
      is_published: isPublished,
    };

    if (mode === "create") {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Tu sesión expiró. Vuelve a iniciar sesión.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("kb_articles")
        .insert({ ...payload, created_by: user.id })
        .select("id")
        .single();

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      router.push(`/dashboard/knowledge-base/${data.id}`);
      return;
    }

    const { error } = await supabase.from("kb_articles").update(payload).eq("id", articleId!);

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push(`/dashboard/knowledge-base/${articleId}`);
  }

  async function handleDelete() {
    if (!articleId) return;
    if (!confirm("¿Eliminar este artículo? Esta acción no se puede deshacer.")) return;

    setLoading(true);
    const { error } = await supabase.from("kb_articles").delete().eq("id", articleId);

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard/knowledge-base");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Título</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Cómo restablecer tu contraseña" required />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Categoría</label>
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full">
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Empresa / cliente</label>
          <Select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="w-full">
            <option value="">General (todas las empresas)</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Contenido</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={12}
          placeholder="Escribe el artículo con el mayor detalle posible…"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isPublished}
          onChange={(e) => setIsPublished(e.target.checked)}
          className="h-4 w-4 accent-accent"
        />
        Publicado (visible para todos los usuarios)
      </label>

      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Guardando…" : mode === "create" ? "Publicar artículo" : "Guardar cambios"}
        </Button>
        {mode === "edit" && (
          <Button type="button" variant="outline" disabled={loading} onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
            Eliminar
          </Button>
        )}
      </div>
    </form>
  );
}
