
-- =========================================================
-- FASE 0: Funciones auxiliares para RLS
-- =========================================================
create or replace function public.current_role()
returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_company_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select company_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_department_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select department_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_agent_or_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role in ('admin','agent'));
$$;

-- =========================================================
-- Trigger: crear perfil automáticamente al registrarse
-- =========================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- =========================================================
-- Trigger: bitácora automática de cambios en tickets
-- =========================================================
create or replace function public.log_ticket_changes()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.status is distinct from new.status then
    insert into public.ticket_history(ticket_id, changed_by, field_name, old_value, new_value)
    values (new.id, auth.uid(), 'status', old.status, new.status);
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
end;
$$;

drop trigger if exists trg_log_ticket_changes on public.tickets;
create trigger trg_log_ticket_changes
before update on public.tickets
for each row execute function public.log_ticket_changes();

-- =========================================================
-- Búsqueda global (sección 7 del documento de arquitectura)
-- =========================================================
alter table public.tickets
  add column if not exists search_vector tsvector
  generated always as (
    to_tsvector('spanish', coalesce(subject,'') || ' ' || coalesce(description,''))
  ) stored;

create index if not exists tickets_search_idx on public.tickets using gin(search_vector);
;
