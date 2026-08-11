"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { rowsToCsv, type ReportTicketRow } from "@/lib/reports";

// Las librerías de Excel y PDF se cargan con dynamic import solo cuando
// el usuario pulsa el botón correspondiente, para no aumentar el bundle
// inicial de la página de reportes.
export function ExportButtons({ rows }: { rows: ReportTicketRow[] }) {
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
    downloadBlob(rowsToCsv(rows), `reporte-tickets-${Date.now()}.csv`, "text/csv;charset=utf-8;");
  }

  async function exportExcel() {
    setLoading("excel");
    try {
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(
        rows.map((r) => ({
          Numero: r.ticket_number,
          Asunto: r.subject,
          Estado: r.status,
          Prioridad: r.priority,
          Creado: r.created_at,
          Resuelto: r.resolved_at ?? "",
          Cerrado: r.closed_at ?? "",
          Empresa: r.company,
          Departamento: r.department,
          Categoria: r.category,
          Agente: r.agent,
          Solicitante: r.requester,
        }))
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Tickets");
      XLSX.writeFile(wb, `reporte-tickets-${Date.now()}.xlsx`);
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
      doc.text("Reporte de tickets", 14, 12);
      autoTable(doc, {
        startY: 18,
        head: [["#", "Asunto", "Estado", "Prioridad", "Empresa", "Departamento", "Agente", "Creado"]],
        body: rows.map((r) => [
          r.ticket_number,
          r.subject,
          r.status,
          r.priority,
          r.company,
          r.department,
          r.agent,
          new Date(r.created_at).toLocaleDateString("es-MX"),
        ]),
        styles: { fontSize: 7 },
      });
      doc.save(`reporte-tickets-${Date.now()}.pdf`);
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
