-- Tabla de notificaciones in-app
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  ticket_id uuid references public.tickets(id) on delete cascade,
  type text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_recipient_unread_idx
  on public.notifications (recipient_id, is_read, created_at desc);

alter table public.notifications enable row level security;

create policy notifications_select_own on public.notifications
  for select to authenticated
  using (recipient_id = (select auth.uid()));

create policy notifications_update_own on public.notifications
  for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

-- Sin política de insert/delete para authenticated: solo se insertan vía
-- funciones SECURITY DEFINER en el esquema private (triggers de abajo).

-- 1) Nuevo ticket -> notificar a todo el staff activo (admin + agente)
create or replace function private.notify_new_ticket()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (recipient_id, ticket_id, type, message)
  select p.id, new.id, 'new_ticket',
    'Nuevo ticket #' || new.ticket_number || ': ' || new.subject
  from public.profiles p
  where p.role in ('admin', 'agent') and p.is_active = true;
  return new;
end;
$$;

revoke execute on function private.notify_new_ticket() from public, anon, authenticated;

create trigger trg_notify_new_ticket
after insert on public.tickets
for each row execute function private.notify_new_ticket();

-- 2) Cambios en ticket -> asignación y cambio de estado
create or replace function private.notify_ticket_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assigned_agent_id is distinct from old.assigned_agent_id and new.assigned_agent_id is not null then
    insert into public.notifications (recipient_id, ticket_id, type, message)
    values (new.assigned_agent_id, new.id, 'assigned',
      'Se te asignó el ticket #' || new.ticket_number || ': ' || new.subject);
  end if;

  if new.status is distinct from old.status then
    insert into public.notifications (recipient_id, ticket_id, type, message)
    values (new.requester_id, new.id, 'status_change',
      'Tu ticket #' || new.ticket_number || ' cambió a "' || new.status || '"');

    if new.status = 'escalado' then
      insert into public.notifications (recipient_id, ticket_id, type, message)
      select p.id, new.id, 'escalated',
        'Ticket #' || new.ticket_number || ' fue escalado: ' || new.subject
      from public.profiles p
      where p.role = 'admin' and p.is_active = true;
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function private.notify_ticket_update() from public, anon, authenticated;

create trigger trg_notify_ticket_update
after update on public.tickets
for each row execute function private.notify_ticket_update();

-- 3) Nuevo comentario -> notificar a solicitante (si es público) y agente asignado
create or replace function private.notify_new_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket record;
begin
  select requester_id, assigned_agent_id, ticket_number, subject into v_ticket
  from public.tickets where id = new.ticket_id;

  if not new.is_internal and v_ticket.requester_id is distinct from new.author_id then
    insert into public.notifications (recipient_id, ticket_id, type, message)
    values (v_ticket.requester_id, new.ticket_id, 'comment',
      'Nuevo comentario en tu ticket #' || v_ticket.ticket_number);
  end if;

  if v_ticket.assigned_agent_id is not null and v_ticket.assigned_agent_id is distinct from new.author_id then
    insert into public.notifications (recipient_id, ticket_id, type, message)
    values (v_ticket.assigned_agent_id, new.ticket_id, 'comment',
      'Nuevo comentario en el ticket #' || v_ticket.ticket_number);
  end if;

  return new;
end;
$$;

revoke execute on function private.notify_new_comment() from public, anon, authenticated;

create trigger trg_notify_new_comment
after insert on public.ticket_comments
for each row execute function private.notify_new_comment();

-- Realtime para que la campana de notificaciones se actualice en vivo
alter publication supabase_realtime add table public.notifications;;
