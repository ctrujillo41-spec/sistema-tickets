// Mitigación para un bug conocido de la infraestructura de Supabase (PGRST303):
// a veces el token recién emitido por Auth llega a PostgREST con el reloj
// desincronizado unos segundos, y PostgREST lo rechaza con
// "JWT issued at future" aunque el token es válido. Reintentar una vez tras
// una pequeña espera resuelve el caso casi siempre, sin ocultar errores reales.
// Ver: https://github.com/orgs/supabase/discussions/48123

function isClockSkewError(error: { message?: string } | null): boolean {
  if (!error?.message) return false;
  return error.message.toLowerCase().includes("issued at future");
}

// Genérico sobre el shape completo de la respuesta (no solo data/error) para
// que también sirva con consultas .select(..., { count: "exact", head: true }),
// que además devuelven `count` y `status`.
export async function withJwtSkewRetry<R extends { error: { message?: string } | null }>(
  run: () => PromiseLike<R>,
  attempts = 2,
  delayMs = 800
): Promise<R> {
  let result = await run();
  let tries = 1;
  while (result.error && isClockSkewError(result.error) && tries < attempts) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    result = await run();
    tries += 1;
  }
  return result;
}
