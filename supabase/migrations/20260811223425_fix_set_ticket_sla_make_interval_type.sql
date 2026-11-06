-- Bug preexistente (Fase 4, automatizaciones de SLA), nunca disparado hasta
-- ahora porque no se había creado un ticket real desde entonces: las horas
-- se declaraban como "numeric" pero make_interval(hours => ...) requiere
-- "integer". Como todos los valores asignados son enteros de por sí
-- (1,2,4,8,24,48,72), el fix correcto es declarar las variables como
-- integer en vez de castear en cada llamada.

create or replace function private.set_ticket_sla()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_response_hours integer;
  v_resolution_hours integer;
begin
  case new.priority
    when 'critica' then v_response_hours := 1; v_resolution_hours := 4;
    when 'alta' then v_response_hours := 2; v_resolution_hours := 8;
    when 'media' then v_response_hours := 4; v_resolution_hours := 24;
    when 'baja' then v_response_hours := 8; v_resolution_hours := 48;
    else v_response_hours := 24; v_resolution_hours := 72; -- muy_baja
  end case;

  if new.sla_response_due is null then
    new.sla_response_due := new.created_at + make_interval(hours => v_response_hours);
  end if;
  if new.sla_resolution_due is null then
    new.sla_resolution_due := new.created_at + make_interval(hours => v_resolution_hours);
  end if;

  return new;
end;
$function$;;
