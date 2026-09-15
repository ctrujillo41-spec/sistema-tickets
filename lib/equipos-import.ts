// Importación del inventario de equipos desde el CSV de escaneo técnico
// (una fila por PC, generada por el script de diagnóstico de Christian).
// El mapeo de columnas es 1:1 con los encabezados reales del CSV — si el
// script que genera el CSV cambia una columna, hay que actualizar CSV_HEADERS.

import type { TablesInsert } from "@/types/database";

export type EquipoScanPatch = Omit<TablesInsert<"equipos">, "etiqueta"> & { etiqueta: string };

// Encabezados esperados, en el orden real del CSV. Solo se usan para avisar
// si faltan columnas — Papa Parse ya lee por nombre de encabezado, así que
// el orden de columnas en el archivo no importa.
export const CSV_HEADERS = [
  "ID",
  "Hostname",
  "Serie",
  "Marca",
  "Modelo",
  "Usuario",
  "Ultimo Usuario",
  "IP",
  "MAC",
  "Adaptador",
  "CPU",
  "GPU",
  "RAM Total (GB)",
  "RAM Libre (GB)",
  "RAM Libre (%)",
  "Disco Modelo",
  "Disco Total (GB)",
  "Disco Libre (GB)",
  "Disco Libre (%)",
  "Salud Disco",
  "Monitores",
  "Bateria",
  "Sistema Operativo",
  "Build",
  "Windows Activado",
  "Uptime (dias)",
  "Identidad",
  "Office Version",
  "Office Activado",
  "Antivirus",
  "Firewall",
  "BitLocker",
  "TPM",
  "Secure Boot",
  "Administradores Locales",
  "Programas Instalados",
  "Top Programas (espacio)",
  "Diagnostico",
  "Fecha Escaneo",
];

function clean(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function toNumber(v: unknown): number | null {
  const s = clean(v);
  if (s == null) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function toInt(v: unknown): number | null {
  const n = toNumber(v);
  return n == null ? null : Math.round(n);
}

// "15/09/2026 10:23" (dd/mm/yyyy hh:mm, como lo escribe el script en español)
// a ISO. Si el formato no calza, se descarta en vez de guardar una fecha mala.
function toTimestamp(v: unknown): string | null {
  const s = clean(v);
  if (s == null) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const [, d, mo, y, h, mi, se] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(se ?? "0"));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export interface EquipoCsvRow {
  [key: string]: string | undefined;
}

// Convierte una fila cruda del CSV (encabezados en español, valores string)
// en un patch listo para insert/update en la tabla equipos. No toca campos
// que administra el staff manualmente (categoria_id, company_id,
// department_id, asignado_a, status, ubicacion, notas, proveedor,
// fecha_compra, costo_compra) — el import solo trae datos técnicos del scan.
export function mapCsvRowToEquipoPatch(row: EquipoCsvRow): EquipoScanPatch | null {
  const etiqueta = clean(row["ID"]);
  if (!etiqueta) return null;

  return {
    etiqueta,
    hostname: clean(row["Hostname"]),
    numero_serie: clean(row["Serie"]),
    marca: clean(row["Marca"]),
    modelo: clean(row["Modelo"]),
    usuario_windows: clean(row["Usuario"]),
    ultimo_usuario_windows: clean(row["Ultimo Usuario"]),
    ip_address: clean(row["IP"]),
    mac_address: clean(row["MAC"]),
    adaptador_red: clean(row["Adaptador"]),
    cpu: clean(row["CPU"]),
    gpu: clean(row["GPU"]),
    ram_total_gb: toNumber(row["RAM Total (GB)"]),
    ram_libre_gb: toNumber(row["RAM Libre (GB)"]),
    ram_libre_pct: toInt(row["RAM Libre (%)"]),
    disco_modelo: clean(row["Disco Modelo"]),
    disco_total_gb: toNumber(row["Disco Total (GB)"]),
    disco_libre_gb: toNumber(row["Disco Libre (GB)"]),
    disco_libre_pct: toInt(row["Disco Libre (%)"]),
    salud_disco: clean(row["Salud Disco"]),
    monitores: clean(row["Monitores"]),
    bateria: clean(row["Bateria"]),
    sistema_operativo: clean(row["Sistema Operativo"]),
    build_os: clean(row["Build"]),
    windows_activado: clean(row["Windows Activado"]),
    uptime_dias: toNumber(row["Uptime (dias)"]),
    identidad_red: clean(row["Identidad"]),
    office_version: clean(row["Office Version"]),
    office_activado: clean(row["Office Activado"]),
    antivirus: clean(row["Antivirus"]),
    firewall: clean(row["Firewall"]),
    bitlocker: clean(row["BitLocker"]),
    tpm: clean(row["TPM"]),
    secure_boot: clean(row["Secure Boot"]),
    administradores_locales: clean(row["Administradores Locales"]),
    programas_instalados_count: toInt(row["Programas Instalados"]),
    top_programas: clean(row["Top Programas (espacio)"]),
    diagnostico: clean(row["Diagnostico"]),
    ultimo_escaneo_at: toTimestamp(row["Fecha Escaneo"]),
  };
}

export function diagnosticoToList(diagnostico: string | null): string[] {
  if (!diagnostico) return [];
  return diagnostico
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}
