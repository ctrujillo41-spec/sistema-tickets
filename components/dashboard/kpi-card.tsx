import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "warning" | "danger" | "success";

const BAR_TONE: Record<Tone, string> = {
  neutral: "bg-muted-foreground/40",
  accent: "bg-accent",
  warning: "bg-warning",
  danger: "bg-danger",
  success: "bg-success",
};

const TEXT_TONE: Record<Tone, string> = {
  neutral: "text-foreground",
  accent: "text-accent",
  warning: "text-warning",
  danger: "text-danger",
  success: "text-success",
};

// Tarjeta de indicador con barra de color a la izquierda, inspirada en el
// dashboard ejecutivo de referencia (.kpi-card / .kpi-bar).
export function KpiCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  tone?: Tone;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4 pl-5 shadow-sm transition-shadow hover:shadow-md">
      <span className={cn("absolute inset-y-0 left-0 w-1", BAR_TONE[tone])} />
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className={cn("h-3.5 w-3.5", TEXT_TONE[tone])} />}
        {label}
      </div>
      <div className={cn("mt-1.5 text-3xl font-extrabold tabular-nums", TEXT_TONE[tone])}>{value}</div>
    </div>
  );
}
