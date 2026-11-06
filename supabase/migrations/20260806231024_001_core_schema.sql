
-- Extensions
create extension if not exists pgcrypto;

-- =========================================================
-- CATALOGS
-- =========================================================

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rfc text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null, -- null = categoría general
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- =========================================================
-- PROFILES (extiende auth.users)
-- =========================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  role text not null default 'user' check (role in ('admin','agent','user')),
  department_id uuid references public.departments(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  avatar_url text,
  entra_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_role on public.profiles(role);
create index idx_profiles_department on public.profiles(department_id);

-- Crea automáticamente el perfil cuando se registra un usuario en auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- TICKETS
-- =========================================================

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number bigint generated always as identity,
  company_id uuid references public.companies(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  subcategory_id uuid references public.subcategories(id) on delete set null,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  assigned_agent_id uuid references public.profiles(id) on delete set null,
  priority text not null default 'media' check (priority in ('muy_baja','baja','media','alta','critica')),
  status text not null default 'nuevo' check (status in
    ('nuevo','asignado','en_proceso','pendiente_info','escalado','resuelto','cerrado','reabierto')),
  subject text not null,
  description text not null,
  first_response_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  sla_response_due timestamptz,
  sla_resolution_due timestamptz,
  csat_rating smallint check (csat_rating between 1 and 5),
  csat_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tickets_requester on public.tickets(requester_id);
create index idx_tickets_agent on public.tickets(assigned_agent_id);
create index idx_tickets_department on public.tickets(department_id);
create index idx_tickets_company on public.tickets(company_id);
create index idx_tickets_status on public.tickets(status);
create index idx_tickets_priority on public.tickets(priority);
create index idx_tickets_search on public.tickets using gin (to_tsvector('spanish', subject || ' ' || description));

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_tickets_updated_at
  before update on public.tickets
  for each row execute function public.set_updated_at();

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- =========================================================
-- COMENTARIOS Y ADJUNTOS
-- =========================================================

create table public.ticket_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_comments_ticket on public.ticket_comments(ticket_id);

create table public.ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  comment_id uuid references public.ticket_comments(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index idx_attachments_ticket on public.ticket_attachments(ticket_id);

-- =========================================================
-- HISTORIAL / AUDITORÍA DE TICKETS
-- =========================================================

create table public.ticket_history (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  changed_by uuid references public.profiles(id) on delete set null,
  field_name text not null,
  old_value text,
  new_value text,
  created_at timestamptz not null default now()
);

create index idx_history_ticket on public.ticket_history(ticket_id);

create or replace function public.log_ticket_changes()
returns trigger language plpgsql security definer set search_path = public as $$
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
  return new;
end;
$$;

create trigger trg_ticket_history
  after update on public.tickets
  for each row execute function public.log_ticket_changes();
;
