// Fase 9 (Endurecimiento): respaldo propio de las tablas principales, ya
// que el proyecto esta en el plan free de Supabase (sin respaldos
// automaticos). Exporta cada tabla a JSON y lo sube al bucket privado
// "backups". Registra cada corrida en backup_log para poder verificar
// que si ocurrio y con cuantas filas.
//
// Se invoca de dos formas:
//  - pg_cron (diario), via net.http_post con el service_role key guardado
//    en Vault como Authorization header (ver migracion phase9_backup_cron).
//  - manualmente desde la pantalla de admin (Configuracion > Respaldos),
//    con la sesion del propio admin (tambien pasa la verificacion de JWT
//    por defecto de la funcion).
// En ambos casos, dentro de la funcion se usa el service_role key
// (inyectado automaticamente por el runtime de Supabase) para leer todas
// las tablas sin restriccion de RLS y para escribir en el bucket privado.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORE_TABLES = [
  "profiles",
  "companies",
  "departments",
  "categories",
  "subcategories",
  "tickets",
  "ticket_comments",
  "ticket_history",
  "ticket_attachments",
  "notifications",
  "kb_articles",
  "audit_log",
];

Deno.serve(async (req: Request) => {
  const triggeredBy = req.headers.get("x-triggered-by") === "manual" ? "manual" : "cron";

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: logRow, error: logInsertError } = await supabase
    .from("backup_log")
    .insert({ status: "running", triggered_by: triggeredBy })
    .select("id")
    .single();

  if (logInsertError || !logRow) {
    return new Response(
      JSON.stringify({ ok: false, error: "No se pudo crear el registro de backup_log" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const logId = logRow.id as string;

  try {
    const bundle: Record<string, unknown[]> = {};
    const rowCounts: Record<string, number> = {};

    for (const table of CORE_TABLES) {
      const { data, error } = await supabase.from(table).select("*");
      if (error) throw new Error(`Error leyendo ${table}: ${error.message}`);
      bundle[table] = data ?? [];
      rowCounts[table] = data?.length ?? 0;
    }

    const generatedAt = new Date();
    const isoDate = generatedAt.toISOString().slice(0, 10);
    const isoTime = generatedAt.toISOString().slice(11, 19).replace(/:/g, "");
    const path = `${isoDate}/${isoDate}T${isoTime}.json`;

    const payload = JSON.stringify(
      { generated_at: generatedAt.toISOString(), tables: bundle },
      null,
      0
    );
    const fileBytes = new TextEncoder().encode(payload);

    const { error: uploadError } = await supabase.storage
      .from("backups")
      .upload(path, fileBytes, { contentType: "application/json", upsert: false });

    if (uploadError) throw new Error(`Error subiendo a Storage: ${uploadError.message}`);

    // Verificacion: confirmar que el archivo quedo en Storage con el
    // tamano esperado antes de marcar el respaldo como exitoso.
    const dir = path.split("/")[0];
    const fileName = path.split("/")[1];
    const { data: listing, error: listError } = await supabase.storage
      .from("backups")
      .list(dir);

    const uploaded = listing?.find((f) => f.name === fileName);
    if (listError || !uploaded) {
      throw new Error("No se pudo verificar el archivo subido (no aparece en el listado)");
    }

    await supabase
      .from("backup_log")
      .update({
        status: "success",
        finished_at: new Date().toISOString(),
        storage_path: path,
        tables_backed_up: rowCounts,
        file_size_bytes: fileBytes.byteLength,
      })
      .eq("id", logId);

    return new Response(
      JSON.stringify({ ok: true, path, rowCounts, bytes: fileBytes.byteLength }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase
      .from("backup_log")
      .update({ status: "error", finished_at: new Date().toISOString(), error_message: message })
      .eq("id", logId);

    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
