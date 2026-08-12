"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_COLORS } from "@/lib/chart-colors";

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export function DonutCard({ title, data }: { title: string; data: DonutSlice[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">
            Sin tickets en esta categoría.
          </p>
        ) : (
          <div className="flex items-center gap-4">
            <div className="relative h-[160px] w-[160px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={data.length > 1 ? 3 : 0}
                    stroke="none"
                  >
                    {data.map((slice) => (
                      <Cell key={slice.label} fill={slice.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value} tickets`, name]}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold">{total}</span>
                <span className="text-[11px] text-muted-foreground">tickets</span>
              </div>
            </div>

            <ul className="flex-1 space-y-1.5 text-sm">
              {data.map((slice) => (
                <li key={slice.label} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: slice.color }}
                    />
                    {slice.label}
                  </span>
                  <span className="font-semibold">{slice.value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
