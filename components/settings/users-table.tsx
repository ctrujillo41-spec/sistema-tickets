"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/types/database";

type Profile = Tables<"profiles">;
type Department = Tables<"departments">;
type Company = Tables<"companies">;

const ROLE_TONE: Record<string, "accent" | "success" | "neutral"> = {
  admin: "accent",
  agent: "success",
  user: "neutral",
};

export function UsersTable({
  initialProfiles,
  departments,
  companies,
}: {
  initialProfiles: Profile[];
  departments: Department[];
  companies: Company[];
}) {
  const supabase = createClient();
  const [profiles, setProfiles] = useState(initialProfiles);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function updateLocal(id: string, patch: Partial<Profile>) {
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  async function persist(id: string, patch: Partial<Profile>) {
    setPendingId(id);
    setError(null);
    updateLocal(id, patch);

    const { error } = await supabase.from("profiles").update(patch).eq("id", id);

    if (error) setError(`No se pudo actualizar: ${error.message}`);
    setPendingId(null);
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      {error && <p className="border-b border-border bg-danger/10 p-2 text-xs text-danger">{error}</p>}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted text-left text-xs text-muted-foreground">
            <th className="px-3 py-2 font-medium">Nombre</th>
            <th className="px-3 py-2 font-medium">Correo</th>
            <th className="px-3 py-2 font-medium">Rol</th>
            <th className="px-3 py-2 font-medium">Departamento</th>
            <th className="px-3 py-2 font-medium">Empresa</th>
            <th className="px-3 py-2 font-medium">Activo</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((p) => (
            <tr key={p.id} className="border-b border-border last:border-0">
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  {p.full_name || "—"}
                  <Badge tone={ROLE_TONE[p.role] ?? "neutral"}>{p.role}</Badge>
                </div>
              </td>
              <td className="px-3 py-2 text-muted-foreground">{p.email}</td>
              <td className="px-3 py-2">
                <Select
                  value={p.role}
                  disabled={pendingId === p.id}
                  onChange={(e) =>
                    startTransition(() => persist(p.id, { role: e.target.value }))
                  }
                >
                  <option value="user">Usuario final</option>
                  <option value="agent">Agente</option>
                  <option value="admin">Administrador</option>
                </Select>
              </td>
              <td className="px-3 py-2">
                <Select
                  value={p.department_id ?? ""}
                  disabled={pendingId === p.id}
                  onChange={(e) =>
                    startTransition(() =>
                      persist(p.id, { department_id: e.target.value || null })
                    )
                  }
                >
                  <option value="">Sin asignar</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              </td>
              <td className="px-3 py-2">
                <Select
                  value={p.company_id ?? ""}
                  disabled={pendingId === p.id}
                  onChange={(e) =>
                    startTransition(() => persist(p.id, { company_id: e.target.value || null }))
                  }
                >
                  <option value="">Sin asignar</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </td>
              <td className="px-3 py-2">
                <input
                  type="checkbox"
                  checked={p.is_active}
                  disabled={pendingId === p.id}
                  onChange={(e) =>
                    startTransition(() => persist(p.id, { is_active: e.target.checked }))
                  }
                  className="h-4 w-4 accent-accent"
                />
              </td>
            </tr>
          ))}
          {profiles.length === 0 && (
            <tr>
              <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                Aún no hay usuarios registrados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
