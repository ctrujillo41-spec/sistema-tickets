-- Tarea 3.3 (Q-02): los tickets en "pendiente_info" (esperando al solicitante) ya no se escalan
-- por plazo vencido, salvo que lleven mas de 5 dias habiles en espera. Al salir de ese estado,
-- el plazo de resolucion se recorre por las horas habiles que estuvo en espera.
-- Reversion: restaurar escalate_overdue_tickets y log_ticket_changes de la migracion first_response_tracking;
--            drop de business_hours_between, pending_info_limit_hours y pending_info_since.

create or replace function private.business_hours_between(p_start timestamptz, p_end timestamptz)
returns numeric language sql stable security definer set search_path to 'public' as $f$
  with s as (
    select coalesce((select timezone from public.business_hours_settings limit 1), 'America/Mexico_City') tz
  ),
  d as (
    select gs as day, s.tz
    from s, generate_series(date_trunc('day', p_start at time zone s.tz),
                            date_trunc('day', p_end at time zone s.tz), interval '1 day') gs
    where p_end > p_start
  )
  select coalesce(sum(greatest(0, extract(epoch from (
           least(d.day + bh.close_time, p_end at time zone d.tz)
           - greatest(d.day + bh.open_time, p_start at time zone d.tz)
         )) / 3600.0)), 0)
  from d
  join public.business_hours bh on bh.weekday = extract(dow from d.day)::int and bh.is_open
$f$;

create or replace function private.pending_info_limit_hours()
returns numeric language sql stable security definer set search_path to 'public' as $f$
  select 5 * coalesce((select max(extract(epoch from (close_time - open_time)) / 3600.0)
                       from public.business_hours where is_open), 9)
$f$;

create or replace function private.pending_info_since(p_ticket uuid)
returns timestamptz language sql stable security definer set search_path to 'public' as $f$
  select coalesce(
    (select max(h.created_at) from public.ticket_history h
     where h.ticket_id = p_ticket and h.field_name = 'status' and h.new_value = 'pendiente_info'),
    (select created_at from public.tickets where id = p_ticket))
$f$;

revoke execute on function private.business_hours_between(timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function private.pending_info_limit_hours() from public, anon, authenticated;
revoke execute on function private.pending_info_since(uuid) from public, anon, authenticated;

create or replace function private.escalate_overdue_tickets()
returns void language plpgsql security definer set search_path to 'public' as $f$
begin
  update public.tickets t
  set status = 'escalado'
  where t.status not in ('resuelto', 'cerrado', 'escalado')
    and (
      (t.status <> 'pendiente_info' and (
         (t.sla_response_due is not null and t.sla_response_due < now() and t.first_response_at is null)
         or (t.sla_resolution_due is not null and t.sla_resolution_due < now() and t.resolved_at is null)))
      or (t.status = 'pendiente_info'
          and private.business_hours_between(private.pending_info_since(t.id), now()) > private.pending_info_limit_hours())
    );
end
$f$;

create or replace function private.log_ticket_changes()
returns trigger language plpgsql security definer set search_path to 'public' as $f$
declare
  v_wait numeric;
begin
  if old.status is distinct from new.status then
    insert into public.ticket_history(ticket_id, changed_by, field_name, old_value, new_value)
    values (new.id, auth.uid(), 'status', old.status, new.status);

    -- Al salir de "pendiente_info", el plazo de resolucion se recorre por la espera.
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
  end if;

  if old.assigned_agent_id is distinct from new.assigned_agent_id then
    insert into public.ticket_history(ticket_id, changed_by, field_name, old_value, new_value)
    values (new.id, auth.uid(), 'assigned_agent_id', old.assigned_agent_id::text, new.assigned_agent_id::text);
  end if;

  new.updated_at = now();
  return new;
end
$f$;;
