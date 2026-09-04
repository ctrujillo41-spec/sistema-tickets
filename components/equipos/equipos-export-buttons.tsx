"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { rowsToCsv, type EquipoExportRow } from "@/lib/equipos-export";
import { EQUIPO_STATUS_LABELS } from "@/lib/equipos";

// Mismo patrón que components/reports/export-buttons.tsx: librerías de Excel
// y PDF se cargan solo al pulsar el botón, para no pesar el bundle inicial.
// Exporta siempre lo que el usuario tiene filtrado en pantalla, no todo el
// inventario — así el archivo coincide con lo que está viendo.
export function EquiposExportButtons({ rows }: { rows: EquipoExportRow[] }) {
  const [loading, setLoading] = useState<"excel" | "pdf" | null>(null);

  function downloadBlob(content: BlobPart, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportCsv() {
    downloadBlob(rowsToCsv(rows), `inventario-equipos-${Date.now()}.csv`, "text/csv;charset=utf-8;");
  }

  async function exportExcel() {
    setLoading("excel");
    try {
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(
        rows.map((r) => ({
          Folio: r.folio,
          Etiqueta: r.etiqueta,
          Categoria: r.categoria,
          Marca: r.marca,
          Modelo: r.modelo,
          Serie: r.numero_serie,
          IP: r.ip_address,
          Estado: EQUIPO_STATUS_LABELS[r.status] ?? r.status,
          Empresa: r.company,
          Departamento: r.department,
          "Asignado a": r.asignado,
          Ubicacion: r.ubicacion,
        }))
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Equipos");
      XLSX.writeFile(wb, `inventario-equipos-${Date.now()}.xlsx`);
    } finally {
      setLoading(null);
    }
  }

  async function exportPdf() {
    setLoading("pdf");
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(12);
      doc.text("Inventario de equipos", 14, 12);
      autoTable(doc, {
        startY: 18,
        head: [["#", "Etiqueta", "Categoría", "Marca/Modelo", "IP", "Empresa", "Asignado a", "Estado"]],
        body: rows.map((r) => [
          r.folio,
          r.etiqueta,
          r.categoria,
          [r.marca, r.modelo].filter(Boolean).join(" "),
          r.ip_address,
          r.company,
          r.asignado,
          EQUIPO_STATUS_LABELS[r.status] ?? r.status,
        ]),
        styles: { fontSize: 7 },
      });
      doc.save(`inventario-equipos-${Date.now()}.pdf`);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={exportCsv} disabled={rows.length === 0}>
        <Download className="h-4 w-4" />
        CSV
      </Button>
      <Button variant="outline" size="sm" onClick={exportExcel} disabled={loading !== null || rows.length === 0}>
        <FileSpreadsheet className="h-4 w-4" />
        {loading === "excel" ? "Generando…" : "Excel"}
      </Button>
      <Button variant="outline" size="sm" onClick={exportPdf} disabled={loading !== null || rows.length === 0}>
        <FileText className="h-4 w-4" />
        {loading === "pdf" ? "Generando…" : "PDF"}
      </Button>
    </div>
  );
}
