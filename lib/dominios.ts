// Constantes compartidas del módulo de Dominios — mismo patrón que
// lib/equipos.ts y lib/proyectos.ts.

export const DOMINIO_ESTADO_LABELS: Record<string, string> = {
  activo: "Activo",
  por_vencer: "Por vencer",
  vencido: "Vencido",
  cancelado: "Cancelado",
};

export const DOMINIO_ESTADO_TONE: Record<string, "neutral" | "accent" | "warning" | "danger" | "success"> = {
  activo: "success",
  por_vencer: "warning",
  vencido: "danger",
  cancelado: "neutral",
};

export const DOMINIO_ESTADO_ORDER = ["activo", "por_vencer", "vencido", "cancelado"];

export const CICLO_RENOVACION_LABELS: Record<string, string> = {
  mensual: "Mensual",
  anual: "Anual",
  bianual: "Cada 2 años",
  trianual: "Cada 3 años",
};

export const CICLO_RENOVACION_ORDER = ["mensual", "anual", "bianual", "trianual"];

export const DIAS_ALERTA_VENCIMIENTO = 30;

/**
 * Calcula el estado "efectivo" de un dominio a partir de su fecha de
 * vencimiento, sin depender de que alguien lo haya actualizado a mano.
 * "cancelado" siempre se respeta tal cual está guardado (es una decisión
 * manual, no derivable de la fecha).
 */
export function computeDominioEstado(fechaVencimiento: string | null, estadoGuardado: string): string {
  if (estadoGuardado === "cancelado") return "cancelado";
  if (!fechaVencimiento) return estadoGuardado;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vencimiento = new Date(fechaVencimiento + "T00:00:00");
  const diffDias = Math.floor((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDias < 0) return "vencido";
  if (diffDias <= DIAS_ALERTA_VENCIMIENTO) return "por_vencer";
  return "activo";
}

export function diasParaVencer(fechaVencimiento: string | null): number | null {
  if (!fechaVencimiento) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vencimiento = new Date(fechaVencimiento + "T00:00:00");
  return Math.floor((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}
