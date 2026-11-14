-- Tarea 3.4 (Q-03): al cambiar la prioridad de un ticket abierto, los plazos se recalculan desde
-- la fecha de creacion con la nueva prioridad. Si ya hubo primera respuesta, solo cambia el plazo
-- de resolucion. Resueltos y cerrados no se tocan. Solo aplica a cambios futuros.
-- Reversion: restaurar log_ticket_changes de la migracion pending_info_pauses_sla; drop sla_policy_hours.

create or replace function private.sla_policy_hours(p_priority text, out response_hours integer, out resolution_hours integer)
language plpgsql stable security definer set search_path to 'public' as $f$
begin
  select sp.response_hours, sp.resolution_hours
    into response_hours, resolution_hours
  from public.sla_policies sp where sp.priority = p_priority;

  if response_hours is null then
    case p_priority
      when 'critica' then response_hours := 1; resolution_hours := 4;
      when 'alta' then response_hours := 2; resolution_hours := 8;
      when 'media' then response_hours := 4; resolution_hours := 24;
      when 'baja' then response_hours := 8; resolution_hours := 48;
      else response_hours := 24; resolution_hours := 72;
    end case;
  end if;
end
$f$;

revoke execute on function private.sla_policy_hours(text) from public, anon, authenticated;

create or replace function private.log_ticket_changes()
returns trigger language plpgsql security definer set search_path to 'public' as $f$
declare
  v_wait numeric;
  v_resp integer;
  v_res integer;
begin
  if old.status is distinct from new.status then
    insert into public.ticket_history(ticket_id, changed_by, field_name, old_value, new_value)
    values (new.id, auth.uid(), 'status', old.status, new.status);

    if old.status = 'pendiente_info' and new.sla_resolution_due is not null and new.resolved_at is null then
      v_wait := private.business_hours_between(private.pending_info_since(new.id), now());
      if v_wait > 0 then
        new.sla_resolution_due := private.add_business_hours(new.sla_resolution_due, v_wait);
      end if;
    end if;

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

    if new.status not in ('resuelto', 'cerrado') then
      select response_hours, resolution_hours into v_resp, v_res from private.sla_policy_hours(new.priority);
      if new.first_response_at is null then
        new.sla_response_due := private.add_business_hours(new.created_at, v_resp);
      end if;
      new.sla_resolution_due := private.add_business_hours(new.created_at, v_res);
    end if;
  end if;

  if old.assigned_agent_id is distinct from new.assigned_agent_id then
    insert into public.ticket_history(ticket_id, changed_by, field_name, old_value, new_value)
    values (new.id, auth.uid(), 'assigned_agent_id', old.assigned_agent_id::text, new.assigned_agent_id::text);
  end if;

  new.updated_at = now();
  return new;
end
$f$;;
