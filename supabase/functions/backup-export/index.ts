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
  "proyectos",
  "proyecto_tiempos",
  "proyecto_categorias",
  "equipos",
  "equipo_bitacora",
  "equipo_categorias",
  "dominios",
  "sla_policies",
  "business_hours",
  "business_hours_settings",
];

// Llave primaria para ordenar la paginacion. Por defecto es "id".
const PRIMARY_KEYS: Record<string, string> = {
  business_hours: "weekday",
  business_hours_settings: "singleton",
  sla_policies: "priority",
};

// Columnas a leer por tabla. Por defecto "*". En dominios se excluyen
// password_registrador y password_hosting para que las credenciales no
// queden en el respaldo.
const SELECT_COLUMNS: Record<string, string> = {
  dominios: [
    "id",
    "nombre_dominio",
    "company_id",
    "registrador",
    "proveedor_hosting",
    "tiene_sitio_web",
    "url_sitio",
    "fecha_registro",
    "fecha_vencimiento",
    "costo_renovacion",
    "moneda",
    "ciclo_renovacion",
    "auto_renovacion",
    "estado",
    "usuario_registrador",
    "usuario_hosting",
    "servidor_dns",
    "correo_notificaciones",
    "proveedor_ssl",
    "fecha_vencimiento_ssl",
    "responsable_id",
    "notas",
    "created_at",
    "updated_at",
  ].join(","),
};

const PAGE_SIZE = 1000;

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

// ---------------------------------------------------------------------------
// Copia a SharePoint y retencion.
// Los secretos MS_* solo se leen con Deno.env.get y nunca se imprimen ni se
// incluyen en mensajes de error: los errores solo llevan el codigo HTTP y,
// si existe, el codigo de error corto que devuelve Microsoft.
// ---------------------------------------------------------------------------

const GRAPH_URL = "https://graph.microsoft.com/v1.0";
const FETCH_TIMEOUT_MS = 30_000;
const SP_KEEP_RECENT = 30;
const SP_KEEP_MONTHS = 12;
const SP_MAX_DELETES = 20;
const STORAGE_KEEP_RECENT = 7;
const STORAGE_REMOVE_BATCH = 100;

// Solo se consideran para retencion los archivos con el nombre que genera
// esta funcion (AAAA-MM-DDTHHMMSS.json); cualquier otro archivo se respeta.
const BACKUP_FILE_RE = /^\d{4}-\d{2}-\d{2}T\d{6}\.json$/;

// Error cuyo mensaje ya es seguro para guardar en backup_log.
class SafeError extends Error {}

function safeMessage(err: unknown, fallback: string): string {
  return err instanceof SafeError ? err.message : fallback;
}

// Codigo de error corto de Microsoft (p. ej. "accessDenied", "invalid_client").
async function graphErrorCode(res: Response): Promise<string> {
  try {
    const body = await res.json();
    const code = typeof body?.error === "string" ? body.error : body?.error?.code;
    return typeof code === "string" && /^[A-Za-z0-9_.-]{1,60}$/.test(code) ? ` (${code})` : "";
  } catch {
    return "";
  }
}

function encodeDrivePath(path: string): string {
  return path.split("/").filter(Boolean).map(encodeURIComponent).join("/");
}

function sharePointConfig() {
  const tenantId = Deno.env.get("MS_TENANT_ID");
  const clientId = Deno.env.get("MS_CLIENT_ID");
  const clientSecret = Deno.env.get("MS_CLIENT_SECRET");
  const siteId = Deno.env.get("MS_SITE_ID");
  const folder = (Deno.env.get("MS_FOLDER") ?? "").replace(/^\/+|\/+$/g, "");
  if (!tenantId || !clientId || !clientSecret || !siteId || !folder) {
    throw new SafeError("SharePoint: faltan secretos de configuracion MS_* (sin codigo HTTP)");
  }
  return { tenantId, clientId, clientSecret, siteId, folder };
}

async function getGraphToken(cfg: ReturnType<typeof sharePointConfig>): Promise<string> {
  let res: Response;
  try {
    res = await fetch(
      `https://login.microsoftonline.com/${encodeURIComponent(cfg.tenantId)}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: cfg.clientId,
          client_secret: cfg.clientSecret,
          grant_type: "client_credentials",
          scope: "https://graph.microsoft.com/.default",
        }),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      }
    );
  } catch {
    throw new SafeError("SharePoint: sin respuesta al pedir el token (sin codigo HTTP)");
  }
  if (!res.ok) {
    throw new SafeError(`SharePoint: HTTP ${res.status} al pedir el token${await graphErrorCode(res)}`);
  }
  const body = await res.json().catch(() => null);
  if (typeof body?.access_token !== "string") {
    throw new SafeError(`SharePoint: HTTP ${res.status}, la respuesta no trae access_token`);
  }
  return body.access_token;
}

async function uploadToSharePoint(
  cfg: ReturnType<typeof sharePointConfig>,
  token: string,
  year: string,
  fileName: string,
  bytes: Uint8Array
): Promise<{ id: string | null; path: string; webUrl: string | null }> {
  const spPath = `${cfg.folder}/${year}/${fileName}`;
  const url =
    `${GRAPH_URL}/sites/${cfg.siteId}/drive/root:/${encodeDrivePath(spPath)}:/content` +
    `?@microsoft.graph.conflictBehavior=fail`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: bytes,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    throw new SafeError("SharePoint: sin respuesta al subir el archivo (sin codigo HTTP)");
  }
  if (!res.ok) {
    throw new SafeError(`SharePoint: HTTP ${res.status} al subir el archivo${await graphErrorCode(res)}`);
  }
  const item = await res.json().catch(() => null);
  return {
    id: typeof item?.id === "string" ? item.id : null,
    path: spPath,
    webUrl: typeof item?.webUrl === "string" ? item.webUrl : null,
  };
}

type DriveItem = { id: string; name: string; folder?: unknown; file?: unknown };

// Lista los hijos de una carpeta de Graph siguiendo @odata.nextLink.
async function listDriveChildren(token: string, firstUrl: string): Promise<DriveItem[]> {
  const items: DriveItem[] = [];
  let url: string | null = firstUrl;
  while (url) {
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch {
      throw new SafeError("sin respuesta al listar archivos (sin codigo HTTP)");
    }
    if (!res.ok) {
      throw new SafeError(`HTTP ${res.status} al listar archivos${await graphErrorCode(res)}`);
    }
    const body = await res.json();
    items.push(...((body?.value ?? []) as DriveItem[]));
    url = typeof body?.["@odata.nextLink"] === "string" ? body["@odata.nextLink"] : null;
  }
  return items;
}

// Conserva los 30 mas recientes + el mas antiguo de cada uno de los ultimos
// 12 meses; borra el resto (van a la papelera del sitio), maximo 20 por corrida.
async function sharePointRetention(
  cfg: ReturnType<typeof sharePointConfig>,
  token: string,
  uploaded: { id: string | null; fileName: string },
  now: Date
): Promise<{ deleted: number; failedStatuses: number[] }> {
  const site = `${GRAPH_URL}/sites/${cfg.siteId}/drive`;
  const rootChildren = await listDriveChildren(
    token,
    `${site}/root:/${encodeDrivePath(cfg.folder)}:/children?$select=id,name,folder&$top=200`
  );
  const yearFolders = rootChildren.filter((i) => i.folder && /^\d{4}$/.test(i.name));

  const files: DriveItem[] = [];
  for (const yf of yearFolders) {
    const children = await listDriveChildren(
      token,
      `${site}/items/${encodeURIComponent(yf.id)}/children?$select=id,name,file&$top=200`
    );
    files.push(...children.filter((i) => i.file && BACKUP_FILE_RE.test(i.name)));
  }

  if (files.length <= SP_KEEP_RECENT) return { deleted: 0, failedStatuses: [] };

  const byNameDesc = [...files].sort((a, b) => (a.name < b.name ? 1 : a.name > b.name ? -1 : 0));
  const keep = new Set<string>(byNameDesc.slice(0, SP_KEEP_RECENT).map((f) => f.id));

  for (let k = 0; k < SP_KEEP_MONTHS; k++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - k, 1));
    const monthKey = d.toISOString().slice(0, 7); // AAAA-MM
    const oldest = byNameDesc.filter((f) => f.name.startsWith(monthKey)).at(-1);
    if (oldest) keep.add(oldest.id);
  }

  const toDelete = byNameDesc
    .filter((f) => !keep.has(f.id) && f.id !== uploaded.id && f.name !== uploaded.fileName)
    .reverse() // los mas antiguos primero
    .slice(0, SP_MAX_DELETES);

  let deleted = 0;
  const failedStatuses: number[] = [];
  for (const f of toDelete) {
    try {
      const res = await fetch(`${site}/items/${encodeURIComponent(f.id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      await res.body?.cancel();
      if (res.ok) deleted++;
      else failedStatuses.push(res.status);
    } catch {
      failedStatuses.push(0);
    }
  }
  return { deleted, failedStatuses };
}

// Conserva los 7 respaldos mas recientes del bucket "backups" y borra el resto.
async function storageRetention(
  supabase: ReturnType<typeof createClient>,
  currentPath: string
): Promise<number> {
  const bucket = supabase.storage.from("backups");

  async function listAll(prefix: string) {
    const out: { name: string; id: string | null }[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await bucket.list(prefix, {
        limit: 1000,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) throw new SafeError(`no se pudo listar "${prefix || "/"}" en Storage`);
      out.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    return out;
  }

  const paths: string[] = [];
  for (const entry of await listAll("")) {
    if (entry.id === null) {
      // Carpeta por fecha
      for (const f of await listAll(entry.name)) {
        if (f.id !== null && BACKUP_FILE_RE.test(f.name)) paths.push(`${entry.name}/${f.name}`);
      }
    } else if (BACKUP_FILE_RE.test(entry.name)) {
      paths.push(entry.name);
    }
  }

  if (paths.length <= STORAGE_KEEP_RECENT) return 0;

  const byNameDesc = paths.sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
  const toDelete = byNameDesc.slice(STORAGE_KEEP_RECENT).filter((p) => p !== currentPath);

  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += STORAGE_REMOVE_BATCH) {
    const batch = toDelete.slice(i, i + STORAGE_REMOVE_BATCH);
    const { data, error } = await bucket.remove(batch);
    if (error) throw new SafeError(`fallo un lote de borrado en Storage (${deleted} borrados antes)`);
    deleted += data?.length ?? batch.length;
  }
  return deleted;
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

    // Lee cada tabla en bloques de PAGE_SIZE filas ordenadas por su llave
    // primaria. Cualquier error en un bloque hace fallar toda la corrida, asi
    // que nunca se guarda un respaldo parcial como exitoso.
    for (const table of CORE_TABLES) {
      const pk = PRIMARY_KEYS[table] ?? "id";
      const columns = SELECT_COLUMNS[table] ?? "*";
      const rows: unknown[] = [];
      let from = 0;

      while (true) {
        const { data, error } = await supabase
          .from(table)
          .select(columns)
          .order(pk, { ascending: true })
          .range(from, from + PAGE_SIZE - 1);
        if (error) {
          throw new Error(`Error leyendo ${table} (filas ${from}-${from + PAGE_SIZE - 1}): ${error.message}`);
        }
        const chunk = data ?? [];
        rows.push(...chunk);
        if (chunk.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      bundle[table] = rows;
      rowCounts[table] = rows.length;
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

    // Copia a SharePoint. Si falla, la corrida queda como error, el archivo
    // se conserva en Supabase Storage y no se ejecuta ninguna retencion.
    let spConfig: ReturnType<typeof sharePointConfig>;
    let graphToken: string;
    let sharepoint: { id: string | null; path: string; webUrl: string | null };
    try {
      spConfig = sharePointConfig();
      graphToken = await getGraphToken(spConfig);
      sharepoint = await uploadToSharePoint(spConfig, graphToken, isoDate.slice(0, 4), fileName, fileBytes);
    } catch (spErr) {
      const spMessage = safeMessage(spErr, "SharePoint: error inesperado (sin codigo HTTP)");
      await supabase
        .from("backup_log")
        .update({
          status: "error",
          finished_at: new Date().toISOString(),
          storage_path: path,
          tables_backed_up: rowCounts,
          file_size_bytes: fileBytes.byteLength,
          error_message: spMessage,
        })
        .eq("id", logId);

      return new Response(
        JSON.stringify({ ok: false, error: spMessage, path, rowCounts, bytes: fileBytes.byteLength }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Retenciones: si fallan, el respaldo si quedo, asi que solo se registra
    // un aviso (en error_message, con status "success").
    const warnings: string[] = [];
    let sharepointDeleted = 0;
    let supabaseDeleted = 0;

    try {
      const r = await sharePointRetention(
        spConfig,
        graphToken,
        { id: sharepoint.id, fileName },
        generatedAt
      );
      sharepointDeleted = r.deleted;
      if (r.failedStatuses.length > 0) {
        warnings.push(
          `retencion SharePoint: ${r.failedStatuses.length} borrado(s) fallaron (HTTP ${r.failedStatuses.join(", ")})`
        );
      }
    } catch (retErr) {
      warnings.push(`retencion SharePoint: ${safeMessage(retErr, "error inesperado")}`);
    }

    try {
      supabaseDeleted = await storageRetention(supabase, path);
    } catch (retErr) {
      warnings.push(`retencion Storage: ${safeMessage(retErr, "error inesperado")}`);
    }

    await supabase
      .from("backup_log")
      .update({
        status: "success",
        finished_at: new Date().toISOString(),
        storage_path: path,
        tables_backed_up: rowCounts,
        file_size_bytes: fileBytes.byteLength,
        error_message: warnings.length > 0 ? `Aviso: ${warnings.join("; ")}` : null,
      })
      .eq("id", logId);

    return new Response(
      JSON.stringify({
        ok: true,
        path,
        rowCounts,
        bytes: fileBytes.byteLength,
        sharepoint: { path: sharepoint.path, webUrl: sharepoint.webUrl },
        retention: { sharepointDeleted, supabaseDeleted },
      }),
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
