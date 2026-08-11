"use client";

import { useState } from "react";
import { RefreshCw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";

type BackupRow = Tables<"backup_log">;

const STATUS_TONE: Record<string, "success" | "danger" | "warning"> = {
  success: "success",
  error: "danger",
  running: "warning",
};

const STATUS_LABELS: Record<string, string> = {
  success: "Exitoso",
  error: "Con error",
  running: "En progreso",
};

function formatBytes(bytes: number | null) {
  if (!bytes) return "—";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

export function BackupsPanel({ initialRows }: { initialRows: BackupRow[] }) {
  const supabase = createClient();
  const [rows, setRows] = useState(initialRows);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function runBackupNow() {
    setRunning(true);
    setMessage(null);
    const { error } = await supabase.functions.invoke("backup-export", {
      headers: { "x-triggered-by": "manual" },
    });

    if (error) {
      setMessage(`No se pudo ejecutar el respaldo: ${error.message}`);
    } else {
      setMessage("Respaldo completado.");
    }

    const { data } = await supabase
      .from("backup_log")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(100);
    setRows(data ?? []);
    setRunning(false);
  }

  async function download(path: string) {
    const { data, error } = await supabase.storage.from("backups").createSignedUrl(path, 300);
    if (error || !data) {
      setMessage(`No se pudo generar el enlace de descarga: ${error?.message ?? ""}`);
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={runBackupNow} disabled={running}>
          <RefreshCw className={`h-4 w-4 ${running ? "animate-spin" : ""}`} />
          {running ? "Ejecutando…" : "Ejecutar respaldo ahora"}
        </Button>
        {message && <span className="text-sm text-muted-foreground">{message}</span>}
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">Inicio</th>
              <th className="px-3 py-2 font-medium">Estado</th>
              <th className="px-3 py-2 font-medium">Origen</th>
              <th className="px-3 py-2 font-medium">Filas por tabla</th>
              <th className="px-3 py-2 font-medium">Tamaño</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const counts =
                (r.tables_backed_up as Record<string, number> | null) ?? null;
              const totalRows = counts
                ? Object.values(counts).reduce((a, b) => a + b, 0)
                : null;
              return (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {new Date(r.started_at).toLocaleString("es-MX", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-3 py-2">
                    <Badge tone={STATUS_TONE[r.status] ?? "neutral"}>
                      {STATUS_LABELS[r.status] ?? r.status}
                    </Badge>
                    {r.status === "error" && r.error_message && (
                      <p className="mt-1 text-xs text-danger">{r.error_message}</p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {r.triggered_by === "manual" ? "Manual" : "Automático"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {totalRows !== null ? `${totalRows} filas totales` : "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatBytes(r.file_size_bytes)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {r.status === "success" && r.storage_path && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => download(r.storage_path!)}
                      >
                        <Download className="h-3.5 w-3.5" />
                        Descargar
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  Todavía no hay respaldos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
