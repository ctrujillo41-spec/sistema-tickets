import { Loader2 } from "lucide-react";

// Indicador mientras carga una seccion del panel.
export default function DashboardLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-live="polite">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-accent" />
        Cargando…
      </div>
    </div>
  );
}
