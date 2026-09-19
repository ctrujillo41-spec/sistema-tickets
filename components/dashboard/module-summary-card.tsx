import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

export interface ModuleStat {
  label: string;
  value: string | number;
  tone?: "neutral" | "warning" | "danger" | "success";
}

const STAT_TONE: Record<NonNullable<ModuleStat["tone"]>, string> = {
  neutral: "text-foreground",
  warning: "text-warning",
  danger: "text-danger",
  success: "text-success",
};

// Tarjeta resumen de otro módulo (Equipos, Proyectos) dentro del dashboard
// principal — mismo lenguaje visual que las tarjetas KPI, pero agrupando
// varias cifras y con un enlace directo al módulo completo.
export function ModuleSummaryCard({
  title,
  icon: Icon,
  stats,
  href,
  linkLabel = "Ver módulo",
}: {
  title: string;
  icon: LucideIcon;
  stats: ModuleStat[];
  href: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="h-4 w-4 text-accent" />
        {title}
      </div>
      <div className="mt-3 grid flex-1 grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label}>
            <div className={`text-xl font-bold tabular-nums ${STAT_TONE[s.tone ?? "neutral"]}`}>{s.value}</div>
            <div className="text-[11px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>
      <Link
        href={href}
        className="mt-3 flex items-center gap-1 text-xs font-medium text-accent hover:underline"
      >
        {linkLabel}
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
