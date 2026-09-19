// Encabezado de sección con línea divisoria — mismo patrón visual que
// .section-title del dashboard ejecutivo de referencia.
export function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center gap-3">
        <h2 className="whitespace-nowrap text-base font-bold text-foreground">{title}</h2>
        <div className="h-px flex-1 bg-border" />
      </div>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
