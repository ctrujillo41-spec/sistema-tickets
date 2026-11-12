const FALLBACK = "/dashboard";
const INTERNAL_ORIGIN = "http://interno";

// Valida el destino "next" de una redireccion para que siempre sea una ruta
// dentro del propio sitio. Cualquier valor dudoso termina en /dashboard.
export function safeNext(raw: string | null): string {
  if (!raw) return FALLBACK;
  if (!raw.startsWith("/") || raw.startsWith("//")) return FALLBACK;
  if (raw.includes("\\") || raw.includes("@")) return FALLBACK;

  try {
    const url = new URL(raw, INTERNAL_ORIGIN);
    if (url.origin !== INTERNAL_ORIGIN) return FALLBACK;
    const path = url.pathname + url.search + url.hash;
    // Tras normalizar (p. ej. "/.//x") la ruta podria empezar con "//".
    return path.startsWith("//") ? FALLBACK : path;
  } catch {
    return FALLBACK;
  }
}
