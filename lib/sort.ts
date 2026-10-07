export type SortDir = "asc" | "desc";

export function parseSort(
  sp: { sort?: string; dir?: string },
  allowed: string[],
  defaultSort: string,
  defaultDir: SortDir
): { sort: string; dir: SortDir } {
  const sort = sp.sort && allowed.includes(sp.sort) ? sp.sort : defaultSort;
  const dir: SortDir = sp.dir === "asc" || sp.dir === "desc" ? sp.dir : defaultDir;
  return { sort, dir };
}

// Link para un encabezado ordenable: si ya está ordenado por esa columna
// invierte la dirección; si no, empieza en ascendente. Conserva el resto de
// parámetros (p. ej. pageSize) y regresa a la página 1.
export function sortHref(
  basePath: string,
  params: Record<string, string | undefined>,
  field: string,
  current: { sort: string; dir: SortDir }
): string {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && k !== "sort" && k !== "dir" && k !== "page") next.set(k, v);
  }
  next.set("sort", field);
  next.set("dir", current.sort === field && current.dir === "asc" ? "desc" : "asc");
  return `${basePath}?${next.toString()}`;
}

type Sortable = string | number | boolean | null | undefined;

export function sortRows<T>(rows: T[], getValue: (row: T) => Sortable, dir: SortDir): T[] {
  const mult = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = getValue(a);
    const vb = getValue(b);
    const aEmpty = va === null || va === undefined || va === "";
    const bEmpty = vb === null || vb === undefined || vb === "";
    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return 1; // vacíos siempre al final
    if (bEmpty) return -1;
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * mult;
    return String(va).localeCompare(String(vb), "es", { numeric: true, sensitivity: "base" }) * mult;
  });
}
