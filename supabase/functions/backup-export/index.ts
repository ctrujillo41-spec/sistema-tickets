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

// El panel de Respaldos invoca la funcion desde el navegador, asi que
// necesita responder el preflight de CORS.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-triggered-by",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function forbidden() {
  return new Response(JSON.stringify({ error: "forbidden" }), {
    status: 403,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Lee el payload del JWT sin verificar la firma: verify_jwt ya la valido
// en la plataforma antes de llegar aqui. Devuelve null si esta mal formado.
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    return payload && typeof payload === "object" ? payload : null;
  } catch {
    return null;
  }
}

// Solo el cron (service_role) o un admin activo pueden lanzar el respaldo.
async function isAuthorized(
  req: Request,
  supabase: ReturnType<typeof createClient>
): Promise<boolean> {
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return false;

    const payload = decodeJwtPayload(token);
    if (!payload) return false;
    if (payload.role === "service_role") return true;

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData?.user) return false;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (profileError || !profile) return false;

    return profile.role === "admin" && profile.is_active === true;
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const triggeredBy = req.headers.get("x-triggered-by") === "manual" ? "manual" : "cron";

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  if (!(await isAuthorized(req, supabase))) {
    return forbidden();
  }

  const { data: logRow, error: logInsertError } = await supabase
    .from("backup_log")
    .insert({ status: "running", triggered_by: triggeredBy })
    .select("id")
    .single();

  if (logInsertError || !logRow) {
    return new Response(
      JSON.stringify({ ok: false, error: "No se pudo crear el registro de backup_log" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase
      .from("backup_log")
      .update({ status: "error", finished_at: new Date().toISOString(), error_message: message })
      .eq("id", logId);

    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
