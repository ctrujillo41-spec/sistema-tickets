// Constantes compartidas del módulo de Equipos (inventario + bitácora) —
// mismo patrón que lib/tickets.ts y lib/proyectos.ts.

export const EQUIPO_STATUS_LABELS: Record<string, string> = {
  activo: "Activo",
  en_reparacion: "En reparación",
  resguardo: "En resguardo",
  baja: "Dado de baja",
};

export const EQUIPO_STATUS_TONE: Record<string, "neutral" | "accent" | "warning" | "danger" | "success"> = {
  activo: "success",
  en_reparacion: "warning",
  resguardo: "accent",
  baja: "neutral",
};

export const EQUIPO_STATUS_ORDER = ["activo", "en_reparacion", "resguardo", "baja"];

export const BITACORA_TIPO_LABELS: Record<string, string> = {
  daño: "Daño",
  consumible: "Consumible",
  mejora: "Mejora",
  mantenimiento: "Mantenimiento",
};

export const BITACORA_TIPO_TONE: Record<string, "neutral" | "accent" | "warning" | "danger" | "success"> = {
  daño: "danger",
  consumible: "accent",
  mejora: "success",
  mantenimiento: "warning",
};

export const BITACORA_TIPO_ORDER = ["daño", "consumible", "mejora", "mantenimiento"];

export const BITACORA_STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  resuelto: "Resuelto",
};

export const BITACORA_STATUS_TONE: Record<string, "neutral" | "accent" | "warning" | "danger" | "success"> = {
  pendiente: "warning",
  en_proceso: "accent",
  resuelto: "success",
};

export const BITACORA_STATUS_ORDER = ["pendiente", "en_proceso", "resuelto"];
