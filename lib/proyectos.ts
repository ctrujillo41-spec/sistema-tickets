// Constantes compartidas del módulo de Proyectos — mismo patrón que
// lib/tickets.ts. Reutiliza la escala de prioridad de tickets (sección
// "Prioridades") para que los reportes combinen ambos sin duplicar catálogos.

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  planeacion: "Planeación",
  en_proceso: "En proceso",
  pausado: "Pausado",
  completado: "Completado",
  cancelado: "Cancelado",
};

export const PROJECT_STATUS_TONE: Record<string, "neutral" | "accent" | "warning" | "danger" | "success"> = {
  planeacion: "neutral",
  en_proceso: "accent",
  pausado: "warning",
  completado: "success",
  cancelado: "danger",
};

export const PROJECT_STATUS_ORDER = ["planeacion", "en_proceso", "pausado", "completado", "cancelado"];
