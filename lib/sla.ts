export interface SlaTicket {
  status: string;
  sla_response_due: string | null;
  sla_resolution_due: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
}

/**
 * Un ticket está "vencido" si está abierto (no resuelto/cerrado) y pasó
 * su fecha límite de primera respuesta (sin haberla dado) o de
 * resolución (sin haberse resuelto). El job programado en Supabase
 * (pg_cron, cada 10 min) escala automáticamente estos tickets a
 * "escalado", pero esta función permite mostrar la alerta en la UI
 * incluso antes de que corra ese job.
 */
export function isOverdue(ticket: SlaTicket): boolean {
  if (ticket.status === "resuelto" || ticket.status === "cerrado") return false;

  const now = Date.now();

  const responseOverdue =
    !ticket.first_response_at &&
    !!ticket.sla_response_due &&
    new Date(ticket.sla_response_due).getTime() < now;

  const resolutionOverdue =
    !ticket.resolved_at &&
    !!ticket.sla_resolution_due &&
    new Date(ticket.sla_resolution_due).getTime() < now;

  return responseOverdue || resolutionOverdue;
}

export function slaCountFilter(nowIso: string) {
  return `and(sla_response_due.lt.${nowIso},first_response_at.is.null),and(sla_resolution_due.lt.${nowIso},resolved_at.is.null)`;
}
