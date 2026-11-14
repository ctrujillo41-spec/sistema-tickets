-- Tarea 3.1 (Q-01): la primera respuesta solo se registraba al salir del estado "nuevo",
-- pero la autoasignacion crea los tickets ya en "asignado", asi que casi nunca se llenaba.
-- Nueva regla: primera respuesta = primer cambio de estado hecho por staff, primer comentario
-- publico de staff, o al resolver/cerrar. El escalamiento automatico (sin usuario) no cuenta.
-- Reversion: restaurar la condicion "old.status = 'nuevo'" en log_ticket_changes y
--            drop trigger trg_mark_first_response_on_comment / drop function mark_first_response_on_comment.

create or replace function private.log_ticket_changes()
returns trigger language plpgsql security definer set search_path to 'public' as $f$
begin
  if old.status is distinct from new.status then
    insert into public.ticket_history(ticket_id, changed_by, field_name, old_value, new_value)
    values (new.id, auth.uid(), 'status', old.status, new.status);

    if new.first_response_at is null
       and (private.is_agent_or_admin() or new.status in ('resuelto', 'cerrado')) then
      new.first_response_at = now();
    end if;
    if new.status = 'resuelto' and new.resolved_at is null then
      new.resolved_at = now();
    end if;
    if new.status = 'cerrado' and new.closed_at is null then
      new.closed_at = now();
    end if;
    if new.status = 'reabierto' then
      new.closed_at = null;
    end if;
  end if;

  if old.priority is distinct from new.priority then
    insert into public.ticket_history(ticket_id, changed_by, field_name, old_value, new_value)
    values (new.id, auth.uid(), 'priority', old.priority, new.priority);
  end if;

  if old.assigned_agent_id is distinct from new.assigned_agent_id then
    insert into public.ticket_history(ticket_id, changed_by, field_name, old_value, new_value)
    values (new.id, auth.uid(), 'assigned_agent_id', old.assigned_agent_id::text, new.assigned_agent_id::text);
  end if;

  new.updated_at = now();
  return new;
end
$f$;

create or replace function private.mark_first_response_on_comment()
returns trigger language plpgsql security definer set search_path to 'public' as $f$
begin
  if not new.is_internal
     and exists (select 1 from public.profiles where id = new.author_id and role in ('agent', 'admin')) then
    update public.tickets
    set first_response_at = new.created_at
    where id = new.ticket_id and first_response_at is null;
  end if;
  return new;
end
$f$;

revoke execute on function private.mark_first_response_on_comment() from public, anon, authenticated;

create trigger trg_mark_first_response_on_comment
  after insert on public.ticket_comments
  for each row execute function private.mark_first_response_on_comment();;
