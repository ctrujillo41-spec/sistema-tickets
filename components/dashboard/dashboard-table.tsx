import { BRAND_NAVY } from "@/lib/chart-colors";

export interface DashboardTableColumn<T> {
  header: string;
  align?: "left" | "right";
  render: (row: T) => React.ReactNode;
}

// Tabla con encabezado navy — elemento de marca fijo (no depende del tema
// claro/oscuro), igual que .dtable en el dashboard ejecutivo de referencia.
// Se usa para las tablas resumen del dashboard principal, no reemplaza las
// tablas normales del resto de la app.
export function DashboardTable<T extends { id: string }>({
  columns,
  rows,
  emptyLabel = "Sin datos todavía.",
}: {
  columns: DashboardTableColumn<T>[];
  rows: T[];
  emptyLabel?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ backgroundColor: BRAND_NAVY }}>
            {columns.map((c) => (
              <th
                key={c.header}
                className={`px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-white ${
                  c.align === "right" ? "text-right" : "text-left"
                }`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/50">
              {columns.map((c) => (
                <td key={c.header} className={`px-3 py-2 ${c.align === "right" ? "text-right tabular-nums" : ""}`}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <p className="px-3 py-8 text-center text-sm text-muted-foreground">{emptyLabel}</p>
      )}
    </div>
  );
}
