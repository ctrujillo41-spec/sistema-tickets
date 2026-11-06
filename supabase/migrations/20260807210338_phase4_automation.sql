-- 0) Fix: private.log_ticket_changes() estaba enlazada dos veces a tickets
-- (trg_log_ticket_changes BEFORE UPDATE y trg_ticket_history AFTER UPDATE),
-- generando filas duplicadas en ticket_history en cada cambio de estado/
-- prioridad/agente. Solo la versión BEFORE es necesaria (además muta NEW
-- para first_response_at/resolved_at/closed_at, algo que una trigger AFTER
-- no puede hacer).
drop trigger if exists trg_ticket_history on public.tickets;

-- 1) SLA automático según prioridad, al crear el ticket
create or replace function private.set_ticket_sla()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_response_hours numeric;
  v_resolution_hours numeric;
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
$$;

revoke execute on function private.set_ticket_sla() from public, anon, authenticated;

create trigger trg_set_ticket_sla
before insert on public.tickets
for each row execute function private.set_ticket_sla();

-- 2) Auto-asignación al agente activo con menos tickets abiertos
-- (preferir el mismo departamento del ticket si hay agentes ahí)
create or replace function private.auto_assign_ticket()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agent_id uuid;
begin
  if new.assigned_agent_id is not null then
    return new;
  end if;

  select p.id into v_agent_id
  from public.profiles p
  where p.role = 'agent' and p.is_active = true
    and (new.department_id is null or p.department_id = new.department_id)
  order by (
    select count(*) from public.tickets t
    where t.assigned_agent_id = p.id and t.status <> 'cerrado'
  ) asc, p.created_at asc
  limit 1;

  if v_agent_id is null then
    select p.id into v_agent_id
    from public.profiles p
    where p.role = 'agent' and p.is_active = true
    order by (
      select count(*) from public.tickets t
      where t.assigned_agent_id = p.id and t.status <> 'cerrado'
    ) asc, p.created_at asc
    limit 1;
  end if;

  if v_agent_id is not null then
    new.assigned_agent_id := v_agent_id;
    if new.status = 'nuevo' then
      new.status := 'asignado';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function private.auto_assign_ticket() from public, anon, authenticated;

create trigger trg_auto_assign_ticket
before insert on public.tickets
for each row execute function private.auto_assign_ticket();

-- 3) Auto-reapertura: si el solicitante comenta un ticket ya "resuelto"
-- (antes de que lo confirme como cerrado), vuelve a "reabierto".
create or replace function private.auto_reopen_ticket()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket record;
begin
  select status, requester_id into v_ticket
  from public.tickets where id = new.ticket_id;

  if v_ticket.status = 'resuelto' and v_ticket.requester_id = new.author_id and not new.is_internal then
    update public.tickets set status = 'reabierto' where id = new.ticket_id;
  end if;

  return new;
end;
$$;

revoke execute on function private.auto_reopen_ticket() from public, anon, authenticated;

create trigger trg_auto_reopen_ticket
after insert on public.ticket_comments
for each row execute function private.auto_reopen_ticket();

-- 4) Escalamiento automático por incumplimiento de SLA (job programado)
create extension if not exists pg_cron;

create or replace function private.escalate_overdue_tickets()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.tickets
  set status = 'escalado'
  where status not in ('resuelto', 'cerrado', 'escalado')
    and (
      (sla_response_due is not null and sla_response_due < now() and first_response_at is null)
      or (sla_resolution_due is not null and sla_resolution_due < now() and resolved_at is null)
    );
end;
$$;

revoke execute on function private.escalate_overdue_tickets() from public, anon, authenticated;

select cron.schedule(
  'escalate-overdue-tickets',
  '*/10 * * * *',
  $$select private.escalate_overdue_tickets();$$
);;
