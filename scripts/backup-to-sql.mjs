#!/usr/bin/env node
// Convierte un respaldo JSON de la Edge Function backup-export en un script
// SQL de restauracion (todo o nada) para un proyecto de Supabase con las
// migraciones ya aplicadas.
//
// Uso: node scripts/backup-to-sql.mjs <respaldo.json> <salida.sql>
//
// Formato esperado del respaldo (ver supabase/functions/backup-export):
//   { "generated_at": "<ISO>", "tables": { "<tabla>": [ {fila}, ... ], ... } }
//
// El script solo imprime conteos de filas y el tamano del SQL; nunca imprime
// el contenido de las filas (contiene datos personales).

import { readFileSync, writeFileSync, statSync } from "node:fs";

// Las 22 tablas en orden de insercion (respeta las llaves foraneas).
const INSERT_ORDER = [
  "companies",
  "departments",
  "equipo_categorias",
  "proyecto_categorias",
  "sla_policies",
  "business_hours",
  "business_hours_settings",
  "profiles",
  "categories",
  "subcategories",
  "equipos",
  "dominios",
  "proyectos",
  "proyecto_tiempos",
  "tickets",
  "ticket_comments",
  "ticket_attachments",
  "ticket_history",
  "equipo_bitacora",
  "kb_articles",
  "notifications",
  "audit_log",
];

// Columnas "generated always as (...) stored": Postgres no permite
// insertarlas, se recalculan solas. El respaldo si las trae.
const GENERATED_COLUMNS = {
  tickets: ["search_vector"],
  kb_articles: ["search_vector"],
};

// Columnas identity (generated always as identity) cuyo consecutivo se ajusta
// al final. Se insertan con OVERRIDING SYSTEM VALUE para conservar el folio.
const IDENTITY_COLUMNS = [
  ["tickets", "ticket_number"],
  ["proyectos", "folio"],
  ["equipos", "folio"],
];

const IDENT_RE = /^[a-z_][a-z0-9_]*$/;

function fail(msg) {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

// Etiqueta de dollar-quoting que no aparezca dentro del texto.
function dollarQuote(text, base = "json") {
  let tag = `$${base}$`;
  for (let i = 1; text.includes(tag); i++) tag = `$${base}${i}$`;
  return `${tag}${text}${tag}`;
}

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  fail("uso: node scripts/backup-to-sql.mjs <respaldo.json> <salida.sql>");
}

let backup;
try {
  backup = JSON.parse(readFileSync(inputPath, "utf8"));
} catch (err) {
  fail(`no se pudo leer o interpretar ${inputPath} (${err.message})`);
}
if (!backup || typeof backup.tables !== "object" || backup.tables === null) {
  fail('el archivo no tiene la clave "tables"; no parece un respaldo de backup-export');
}

const tables = backup.tables;
for (const name of Object.keys(tables)) {
  if (!INSERT_ORDER.includes(name)) {
    console.warn(`Aviso: la tabla "${name}" del respaldo no esta en la lista de 22 y se ignora.`);
  }
}

const rowsByTable = {};
for (const t of INSERT_ORDER) {
  const rows = tables[t];
  if (rows === undefined) {
    console.warn(`Aviso: la tabla "${t}" no viene en el respaldo; se restaurara vacia.`);
    rowsByTable[t] = [];
  } else if (!Array.isArray(rows)) {
    fail(`la tabla "${t}" no es una lista de filas`);
  } else {
    rowsByTable[t] = rows;
  }
}

const sql = [];
const push = (...lines) => sql.push(...lines);

push(
  `-- Restauracion generada por scripts/backup-to-sql.mjs`,
  `-- Respaldo generado: ${typeof backup.generated_at === "string" ? backup.generated_at : "desconocido"}`,
  `-- Ejecutar sobre un proyecto con TODAS las migraciones aplicadas.`,
  `-- Contiene datos personales: no versionar ni compartir.`,
  ``,
  `BEGIN;`,
  ``,
  `-- 1. Desactivar triggers de usuario (auditoria, guardas, updated_at, etc.).`
);
for (const t of INSERT_ORDER) push(`ALTER TABLE public.${t} DISABLE TRIGGER USER;`);

push(
  ``,
  `-- 2. Vaciar las 22 tablas.`,
  `TRUNCATE ${INSERT_ORDER.map((t) => `public.${t}`).join(", ")} RESTART IDENTITY CASCADE;`,
  ``
);

// 3. Cuentas minimas en auth.users (sin contrasena).
const authRows = rowsByTable.profiles.map((p) => ({
  id: p.id,
  email: p.email ?? null,
  created_at: p.created_at ?? null,
  updated_at: p.updated_at ?? null,
}));
push(`-- 3. Cuentas minimas en auth.users a partir de profiles (sin contrasena).`);
if (authRows.length > 0) {
  push(
    `INSERT INTO auth.users (`,
    `  instance_id, id, aud, role, email, email_confirmed_at, created_at, updated_at,`,
    `  raw_app_meta_data, raw_user_meta_data,`,
    `  confirmation_token, recovery_token, email_change_token_new, email_change`,
    `)`,
    `SELECT`,
    `  '00000000-0000-0000-0000-000000000000'::uuid, p.id, 'authenticated', 'authenticated', p.email,`,
    `  coalesce(p.created_at, now()), coalesce(p.created_at, now()), coalesce(p.updated_at, now()),`,
    `  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,`,
    `  '', '', '', ''`,
    `FROM jsonb_to_recordset(${dollarQuote(JSON.stringify(authRows))}::jsonb)`,
    `  AS p(id uuid, email text, created_at timestamptz, updated_at timestamptz)`,
    `ON CONFLICT (id) DO NOTHING;`
  );
}
push(
  ``,
  `-- El trigger on_auth_user_created crea perfiles automaticos; se reemplazan`,
  `-- con los del respaldo.`,
  `DELETE FROM public.profiles;`,
  ``,
  `-- 4. Datos del respaldo.`
);

for (const t of INSERT_ORDER) {
  const rows = rowsByTable[t];
  if (rows.length === 0) {
    push(`-- ${t}: sin filas en el respaldo.`);
    continue;
  }
  const generated = GENERATED_COLUMNS[t] ?? [];
  const columns = [...new Set(rows.flatMap((r) => Object.keys(r)))].filter(
    (c) => !generated.includes(c)
  );
  for (const c of columns) {
    if (!IDENT_RE.test(c)) fail(`nombre de columna no valido en ${t}: ${JSON.stringify(c)}`);
  }
  const cols = columns.join(", ");
  push(
    `-- ${t}: ${rows.length} fila(s)`,
    `INSERT INTO public.${t} (${cols}) OVERRIDING SYSTEM VALUE`,
    `SELECT ${cols} FROM jsonb_populate_recordset(NULL::public.${t}, ${dollarQuote(JSON.stringify(rows))}::jsonb);`
  );
}

push(``, `-- 5. Ajustar consecutivos.`);
for (const [t, c] of IDENTITY_COLUMNS) {
  push(
    `SELECT setval(pg_get_serial_sequence('public.${t}', '${c}'), coalesce(max(${c}), 1), max(${c}) IS NOT NULL) FROM public.${t};`
  );
}

push(``, `-- 6. Reactivar triggers de usuario.`);
for (const t of INSERT_ORDER) push(`ALTER TABLE public.${t} ENABLE TRIGGER USER;`);

push(
  ``,
  `-- 7. Conteo final (compararlo con los conteos del respaldo).`,
  INSERT_ORDER.map((t) => `SELECT '${t}' AS tabla, count(*) AS filas FROM public.${t}`).join("\nUNION ALL\n") + ";",
  ``,
  `COMMIT;`,
  ``
);

writeFileSync(outputPath, sql.join("\n"), "utf8");

console.log(`Respaldo: ${inputPath}`);
console.log(`Filas leidas por tabla:`);
let total = 0;
for (const t of INSERT_ORDER) {
  console.log(`  ${t.padEnd(24)} ${String(rowsByTable[t].length).padStart(6)}`);
  total += rowsByTable[t].length;
}
console.log(`  ${"TOTAL".padEnd(24)} ${String(total).padStart(6)}`);
console.log(`SQL generado: ${outputPath} (${statSync(outputPath).size.toLocaleString("es-MX")} bytes)`);
