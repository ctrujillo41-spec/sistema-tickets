import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface BarRow {
  label: string;
  value: number;
}

// Barras horizontales simples (sin librería): cada una a escala del
// valor más alto, para comparar la carga entre departamentos, agentes, etc.
export function BarListCard({ title, rows }: { title: string; rows: BarRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">
            Sin datos todavía.
          </p>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li key={row.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-semibold">{row.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${(row.value / max) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
