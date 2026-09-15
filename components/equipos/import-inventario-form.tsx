"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mapCsvRowToEquipoPatch, type EquipoCsvRow, type EquipoScanPatch } from "@/lib/equipos-import";

interface PreviewRow {
  patch: EquipoScanPatch;
  action: "nuevo" | "actualizar";
  existingId?: string;
  existingFolio?: number;
}

export function ImportInventarioForm() {
  const router = useRouter();
  const supabase = createClient();

  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ nuevos: number; actualizados: number; errores: number } | null>(null);

  const summary = useMemo(() => {
    const nuevos = rows.filter((r) => r.action === "nuevo").length;
    const actualizados = rows.filter((r) => r.action === "actualizar").length;
    return { nuevos, actualizados };
  }, [rows]);

  async function handleFile(file: File) {
    setParsing(true);
    setError(null);
    setResult(null);
    setFileName(file.name);
    setRows([]);
    setSkipped(0);

    try {
      const Papa = (await import("papaparse")).default;
      const text = await file.text();
      const parsed = Papa.parse<EquipoCsvRow>(text, { header: true, skipEmptyLines: true });

      if (parsed.errors.length > 0) {
        setError(`El archivo tiene ${parsed.errors.length} línea(s) con errores de formato. Revisa que sea el CSV exportado por el script de escaneo.`);
      }

      const patches: EquipoScanPatch[] = [];
      let skippedCount = 0;
      for (const row of parsed.data) {
        const patch = mapCsvRowToEquipoPatch(row);
        if (patch) {
          patches.push(patch);
        } else {
          skippedCount++;
        }
      }
      setSkipped(skippedCount);

      if (patches.length === 0) {
        setError((prev) => prev ?? "No se encontró ninguna fila con columna \"ID\" válida en el archivo.");
        setParsing(false);
        return;
      }

      // Consultar cuáles etiquetas ya existen para decidir alta vs actualización.
      const etiquetas = patches.map((p) => p.etiqueta);
      const { data: existentes, error: fetchError } = await supabase
        .from("equipos")
        .select("id, folio, etiqueta")
        .in("etiqueta", etiquetas);

      if (fetchError) {
        setError(fetchError.message);
        setParsing(false);
        return;
      }

      const existentesMap = new Map((existentes ?? []).map((e) => [e.etiqueta, e]));

      const preview: PreviewRow[] = patches.map((patch) => {
        const match = existentesMap.get(patch.etiqueta);
        return match
          ? { patch, action: "actualizar", existingId: match.id, existingFolio: match.folio }
          : { patch, action: "nuevo" };
      });

      setRows(preview);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo leer el archivo.");
    } finally {
      setParsing(false);
    }
  }

  async function handleImport() {
    setImporting(true);
    setError(null);
    setProgress(0);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let nuevos = 0;
    let actualizados = 0;
    let errores = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.action === "actualizar" && row.existingId) {
        const { error } = await supabase.from("equipos").update(row.patch).eq("id", row.existingId);
        if (error) errores++;
        else actualizados++;
      } else {
        const { error } = await supabase
          .from("equipos")
          .insert({ ...row.patch, status: "activo", created_by: user?.id ?? null });
        if (error) errores++;
        else nuevos++;
      }
      setProgress(i + 1);
    }

    setResult({ nuevos, actualizados, errores });
    setImporting(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-dashed border-border p-6 text-center">
        <UploadCloud className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
        <label className="cursor-pointer text-sm font-medium text-accent hover:underline">
          {fileName ? `Archivo: ${fileName}` : "Selecciona el CSV de inventario"}
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </label>
        <p className="mt-1 text-xs text-muted-foreground">
          Debe tener la columna &quot;ID&quot; (etiqueta del equipo) — se usa para saber si es un equipo nuevo
          o si hay que actualizar uno existente.
        </p>
      </div>

      {parsing && <p className="text-sm text-muted-foreground">Leyendo archivo…</p>}
      {error && <p className="text-sm text-danger">{error}</p>}

      {rows.length > 0 && !result && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge tone="success">{summary.nuevos} nuevo{summary.nuevos === 1 ? "" : "s"}</Badge>
            <Badge tone="accent">{summary.actualizados} a actualizar</Badge>
            {skipped > 0 && <Badge tone="warning">{skipped} fila(s) sin ID, omitidas</Badge>}
          </div>

          <div className="max-h-96 overflow-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted">
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Etiqueta</th>
                  <th className="px-3 py-2 font-medium">Hostname</th>
                  <th className="px-3 py-2 font-medium">Marca / modelo</th>
                  <th className="px-3 py-2 font-medium">IP</th>
                  <th className="px-3 py-2 font-medium">Acción</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.patch.etiqueta} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-medium">{r.patch.etiqueta}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.patch.hostname ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {[r.patch.marca, r.patch.modelo].filter(Boolean).join(" ") || "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{r.patch.ip_address ?? "—"}</td>
                    <td className="px-3 py-2">
                      {r.action === "nuevo" ? (
                        <Badge tone="success">Nuevo</Badge>
                      ) : (
                        <Badge tone="accent">Actualiza #{r.existingFolio}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button onClick={handleImport} disabled={importing}>
            {importing ? `Importando ${progress}/${rows.length}…` : `Importar ${rows.length} equipo${rows.length === 1 ? "" : "s"}`}
          </Button>
        </div>
      )}

      {result && (
        <div className="space-y-2 rounded-lg border border-border p-4 text-sm">
          <p className="font-medium">Importación terminada</p>
          <p className="text-muted-foreground">
            {result.nuevos} equipo{result.nuevos === 1 ? "" : "s"} nuevo{result.nuevos === 1 ? "" : "s"} ·{" "}
            {result.actualizados} actualizado{result.actualizados === 1 ? "" : "s"}
            {result.errores > 0 && <> · {result.errores} con error</>}
          </p>
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/equipos")}>
            Ver inventario
          </Button>
        </div>
      )}
    </div>
  );
}
