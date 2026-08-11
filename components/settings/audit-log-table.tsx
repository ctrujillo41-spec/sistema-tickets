"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import type { Tables } from "@/types/database";

type AuditRow = Tables<"audit_log">;

const TABLE_LABELS: Record<string, string> = {
  profiles: "Usuarios",
  categories: "Categorías",
  subcategories: "Subcategorías",
  companies: "Empresas",
  departments: "Departamentos",
  kb_articles: "Base de conocimiento",
};

const ACTION_TONE: Record<string, "success" | "accent" | "danger"> = {
  INSERT: "success",
  UPDATE: "accent",
  DELETE: "danger",
};

const ACTION_LABELS: Record<string, string> = {
  INSERT: "Creación",
  UPDATE: "Cambio",
  DELETE: "Eliminación",
};

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export function AuditLogTable({ initialRows }: { initialRows: AuditRow[] }) {
  const [tableFilter, setTableFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const tableOptions = useMemo(
    () => Array.from(new Set(initialRows.map((r) => r.table_name))).sort(),
    [initialRows]
  );

  const rows = useMemo(
    () =>
      initialRows.filter(
        (r) =>
          (!tableFilter || r.table_name === tableFilter) &&
          (!actionFilter || r.action === actionFilter)
      ),
    [initialRows, tableFilter, actionFilter]
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Select value={tableFilter} onChange={(e) => setTableFilter(e.target.value)}>
          <option value="">Todas las tablas</option>
          {tableOptions.map((t) => (
            <option key={t} value={t}>
              {TABLE_LABELS[t] ?? t}
            </option>
          ))}
        </Select>
        <Select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
          <option value="">Todas las acciones</option>
          <option value="INSERT">Creación</option>
          <option value="UPDATE">Cambio</option>
          <option value="DELETE">Eliminación</option>
        </Select>
        <span className="ml-auto self-center text-xs text-muted-foreground">
          {rows.length} evento{rows.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted text-left text-xs text-muted-foreground">
              <th className="w-8 px-2 py-2" />
              <th className="px-3 py-2 font-medium">Fecha</th>
              <th className="px-3 py-2 font-medium">Tabla</th>
              <th className="px-3 py-2 font-medium">Acción</th>
              <th className="px-3 py-2 font-medium">Quién</th>
              <th className="px-3 py-2 font-medium">Cambios</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isOpen = expanded === r.id;
              const changed =
                (r.changed_fields as Record<string, { old: unknown; new: unknown }> | null) ??
                null;
              const changedKeys = changed ? Object.keys(changed) : [];
              return (
                <>
                  <tr
                    key={r.id}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/60"
                    onClick={() => setExpanded(isOpen ? null : r.id)}
                  >
                    <td className="px-2 py-2 text-muted-foreground">
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("es-MX", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-3 py-2">{TABLE_LABELS[r.table_name] ?? r.table_name}</td>
                    <td className="px-3 py-2">
                      <Badge tone={ACTION_TONE[r.action] ?? "neutral"}>
                        {ACTION_LABELS[r.action] ?? r.action}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">{r.actor_name ?? "Sistema"}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {r.action === "UPDATE"
                        ? changedKeys.join(", ") || "—"
                        : r.action === "INSERT"
                          ? "Registro nuevo"
                          : "Registro eliminado"}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-b border-border bg-muted/40 last:border-0">
                      <td />
                      <td colSpan={5} className="px-3 py-3">
                        {r.action === "UPDATE" && changed && (
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-left text-muted-foreground">
                                <th className="py-1 pr-4 font-medium">Campo</th>
                                <th className="py-1 pr-4 font-medium">Antes</th>
                                <th className="py-1 font-medium">Después</th>
                              </tr>
                            </thead>
                            <tbody>
                              {changedKeys.map((k) => (
                                <tr key={k}>
                                  <td className="py-1 pr-4 font-medium">{k}</td>
                                  <td className="py-1 pr-4 text-danger">
                                    {formatValue(changed[k].old)}
                                  </td>
                                  <td className="py-1 text-success">
                                    {formatValue(changed[k].new)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                        {r.action === "INSERT" && (
                          <pre className="whitespace-pre-wrap break-all text-xs text-muted-foreground">
                            {JSON.stringify(r.new_data, null, 2)}
                          </pre>
                        )}
                        {r.action === "DELETE" && (
                          <pre className="whitespace-pre-wrap break-all text-xs text-muted-foreground">
                            {JSON.stringify(r.old_data, null, 2)}
                          </pre>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  Sin eventos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
