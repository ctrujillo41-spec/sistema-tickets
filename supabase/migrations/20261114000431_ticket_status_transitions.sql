-- Tarea 3.7 (Q-06): transiciones de estado permitidas para ediciones manuales desde la app.
-- No limita a las automatizaciones (escalamiento, cierre diario, reapertura por comentario) ni a los
-- botones del solicitante (close_ticket, reopen_ticket, rate_ticket): corren como el propietario.
-- Reversion: drop trigger trg_0b_guard_ticket_status_transition on public.tickets;
--            drop function public.guard_ticket_status_transition();

create or replace function public.guard_ticket_status_transition()
returns trigger language plpgsql set search_path = '' as $f$
declare
  v_ok boolean;
  v_admin boolean;
  v_label jsonb := '{"nuevo":"Nuevo","asignado":"Asignado","en_proceso":"En proceso","pendiente_info":"Pendiente de información","escalado":"Escalado","resuelto":"Resuelto","cerrado":"Cerrado","reabierto":"Reabierto"}';
begin
  if new.status is not distinct from old.status or current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  v_admin := exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin' and is_active)
             and coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2';

  v_ok := case old.status
    when 'nuevo'          then new.status in ('asignado', 'en_proceso', 'pendiente_info', 'escalado', 'resuelto')
    when 'asignado'       then new.status in ('en_proceso', 'pendiente_info', 'escalado', 'resuelto')
    when 'en_proceso'     then new.status in ('pendiente_info', 'escalado', 'resuelto')
    when 'pendiente_info' then new.status in ('en_proceso', 'escalado', 'resuelto')
    when 'escalado'       then new.status in ('en_proceso', 'pendiente_info', 'resuelto')
    when 'reabierto'      then new.status in ('en_proceso', 'pendiente_info', 'escalado', 'resuelto')
    when 'resuelto'       then new.status in ('cerrado', 'reabierto', 'en_proceso')
    when 'cerrado'        then new.status = 'reabierto' and v_admin
    else false
  end;

  if not v_ok then
    raise exception '%', case
      when new.status = 'cerrado' then
        format('No se puede pasar de %s a Cerrado. Primero marca el ticket como Resuelto.', v_label ->> old.status)
      when old.status = 'cerrado' and new.status = 'reabierto' then
        'Solo un administrador puede reabrir un ticket cerrado.'
      when old.status = 'cerrado' then
        'Un ticket cerrado solo puede reabrirse.'
      else
        format('No se puede pasar de %s a %s.',
               coalesce(v_label ->> old.status, old.status), coalesce(v_label ->> new.status, new.status))
    end using errcode = '42501';
  end if;

  return new;
end
$f$;

revoke execute on function public.guard_ticket_status_transition() from public, anon, authenticated;

create trigger trg_0b_guard_ticket_status_transition
  before update of status on public.tickets
  for each row execute function public.guard_ticket_status_transition();;
