"use client";

import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TREEMAP_PALETTE } from "@/lib/chart-colors";

export interface TreemapDatum {
  name: string;
  value: number;
}

// Contenido personalizado de cada bloque: recharts inyecta x/y/width/height
// calculados por el algoritmo de treemap: aquí solo dibujamos el rectángulo
// coloreado y, si hay espacio, la etiqueta y el valor encima.
function CustomContent(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
  name?: string;
  value?: number;
}) {
  const { x = 0, y = 0, width = 0, height = 0, index = 0, name, value } = props;
  const color = TREEMAP_PALETTE[index % TREEMAP_PALETTE.length];
  const showLabel = width > 55 && height > 28;

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} style={{ fill: color, stroke: "#fff", strokeWidth: 1.5 }} />
      {showLabel && (
        <text x={x + 8} y={y + 18} fill="#fff" fontSize={12} fontWeight={700}>
          {name}
        </text>
      )}
      {showLabel && (
        <text x={x + 8} y={y + 34} fill="#fff" fontSize={11} opacity={0.9}>
          {value} ticket{value === 1 ? "" : "s"}
        </text>
      )}
    </g>
  );
}

export function TreemapCard({
  title,
  note,
  data,
}: {
  title: string;
  note?: string;
  data: TreemapDatum[];
}) {
  return (
    <Card>
      <CardHeader className="gap-0.5">
        <CardTitle className="text-sm font-medium text-foreground">{title}</CardTitle>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
            Sin datos todavía.
          </p>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap data={data} dataKey="value" nameKey="name" stroke="#fff" content={<CustomContent />}>
                <Tooltip
                  formatter={(value: number, name: string) => [`${value} ticket${value === 1 ? "" : "s"}`, name]}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
              </Treemap>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
