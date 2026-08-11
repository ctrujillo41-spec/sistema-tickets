"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/types/database";

type Department = Tables<"departments">;
type Company = Tables<"companies">;

interface Agent {
  id: string;
  full_name: string | null;
}

export function ReportFilters({
  departments,
  companies,
  agents,
}: {
  departments: Department[];
  companies: Company[];
  agents: Agent[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const departmentId = searchParams.get("department_id") ?? "";
  const agentId = searchParams.get("agent_id") ?? "";
  const companyId = searchParams.get("company_id") ?? "";
  const hasFilters = Boolean(from || to || departmentId || agentId || companyId);

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-card p-3">
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Desde</label>
        <Input
          type="date"
          value={from}
          onChange={(e) => update("from", e.target.value)}
          className="w-[150px]"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Hasta</label>
        <Input
          type="date"
          value={to}
          onChange={(e) => update("to", e.target.value)}
          className="w-[150px]"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Departamento</label>
        <Select value={departmentId} onChange={(e) => update("department_id", e.target.value)}>
          <option value="">Todos</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Agente</label>
        <Select value={agentId} onChange={(e) => update("agent_id", e.target.value)}>
          <option value="">Todos</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.full_name ?? "—"}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Empresa</label>
        <Select value={companyId} onChange={(e) => update("company_id", e.target.value)}>
          <option value="">Todas</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      {hasFilters && (
        <Button variant="outline" size="sm" onClick={() => router.push(pathname)}>
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
