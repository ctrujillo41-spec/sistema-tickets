// Constantes compartidas del ciclo de vida del ticket (sección 5 del
// documento de arquitectura) y de prioridades (sección "Prioridades").

export const STATUS_LABELS: Record<string, string> = {
  nuevo: "Nuevo",
  asignado: "Asignado",
  en_proceso: "En proceso",
  pendiente_info: "Pendiente de información",
  escalado: "Escalado",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
  reabierto: "Reabierto",
};

export const STATUS_TONE: Record<string, "neutral" | "accent" | "warning" | "danger" | "success"> = {
  nuevo: "accent",
  asignado: "accent",
  en_proceso: "warning",
  pendiente_info: "warning",
  escalado: "danger",
  resuelto: "success",
  cerrado: "neutral",
  reabierto: "danger",
};

export const STATUS_ORDER = [
  "nuevo",
  "asignado",
  "en_proceso",
  "pendiente_info",
  "escalado",
  "resuelto",
  "cerrado",
  "reabierto",
];

export const PRIORITY_LABELS: Record<string, string> = {
  muy_baja: "Muy baja",
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  critica: "Crítica",
};

export const PRIORITY_TONE: Record<string, "neutral" | "accent" | "warning" | "danger" | "success"> = {
  muy_baja: "neutral",
  baja: "success",
  media: "accent",
  alta: "warning",
  critica: "danger",
};

export const PRIORITY_ORDER = ["muy_baja", "baja", "media", "alta", "critica"];
