// Exportación del inventario de equipos — mismo patrón que lib/reports.ts.
// Recibe filas ya aplanadas (nombres en vez de ids) para que CSV/Excel/PDF
// compartan la misma fuente sin repetir lógica de mapeo.

export interface EquipoExportRow {
  folio: number;
  etiqueta: string;
  categoria: string;
  marca: string;
  modelo: string;
  numero_serie: string;
  ip_address: string;
  status: string;
  company: string;
  department: string;
  asignado: string;
  ubicacion: string;
}

export function rowsToCsv(rows: EquipoExportRow[]): string {
  const headers = [
    "Folio",
    "Etiqueta",
    "Categoria",
    "Marca",
    "Modelo",
    "Serie",
    "IP",
    "Estado",
    "Empresa",
    "Departamento",
    "Asignado a",
    "Ubicacion",
  ];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [headers.join(",")];
  rows.forEach((r) => {
    lines.push(
      [
        r.folio,
        escape(r.etiqueta),
        escape(r.categoria),
        escape(r.marca),
        escape(r.modelo),
        escape(r.numero_serie),
        escape(r.ip_address),
        escape(r.status),
        escape(r.company),
        escape(r.department),
        escape(r.asignado),
        escape(r.ubicacion),
      ].join(",")
    );
  });
  return lines.join("\n");
}
