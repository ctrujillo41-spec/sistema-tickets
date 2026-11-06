
-- Catálogo de categorías de equipo (editable desde Configuración)
create table public.equipo_categorias (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.equipo_categorias enable row level security;

create policy equipo_categorias_select on public.equipo_categorias
  for select using (private.is_agent_or_admin());
create policy equipo_categorias_write on public.equipo_categorias
  for insert with check (private.is_admin());
create policy equipo_categorias_update on public.equipo_categorias
  for update using (private.is_admin());
create policy equipo_categorias_delete on public.equipo_categorias
  for delete using (private.is_admin());

-- Inventario de equipos
create table public.equipos (
  id uuid primary key default gen_random_uuid(),
  folio bigint generated always as identity,
  etiqueta text not null,
  categoria_id uuid references public.equipo_categorias(id) on delete set null,
  marca text,
  modelo text,
  numero_serie text,
  company_id uuid references public.companies(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  asignado_a uuid references public.profiles(id) on delete set null,
  ubicacion text,
  status text not null default 'activo' check (status in ('activo','en_reparacion','resguardo','baja')),
  cpu text,
  ram text,
  almacenamiento text,
  sistema_operativo text,
  proveedor text,
  fecha_compra date,
  costo_compra numeric(12,2),
  notas text,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.equipos enable row level security;

create policy equipos_select on public.equipos
  for select using (private.is_agent_or_admin());
create policy equipos_insert on public.equipos
  for insert with check (private.is_agent_or_admin());
create policy equipos_update on public.equipos
  for update using (private.is_agent_or_admin());
create policy equipos_delete on public.equipos
  for delete using (private.is_admin());

create trigger trg_equipos_updated_at
  before update on public.equipos
  for each row execute function set_updated_at();

-- Bitácora de daños, consumibles y mejoras por equipo
create table public.equipo_bitacora (
  id uuid primary key default gen_random_uuid(),
  equipo_id uuid not null references public.equipos(id) on delete cascade,
  tipo text not null check (tipo in ('daño','consumible','mejora','mantenimiento')),
  descripcion text not null,
  status text not null default 'pendiente' check (status in ('pendiente','en_proceso','resuelto')),
  costo numeric(12,2),
  reportado_por uuid references public.profiles(id) default auth.uid(),
  resuelto_por uuid references public.profiles(id),
  fecha timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.equipo_bitacora enable row level security;

create policy equipo_bitacora_select on public.equipo_bitacora
  for select using (private.is_agent_or_admin());
create policy equipo_bitacora_insert on public.equipo_bitacora
  for insert with check (private.is_agent_or_admin());
create policy equipo_bitacora_update on public.equipo_bitacora
  for update using (private.is_agent_or_admin());
create policy equipo_bitacora_delete on public.equipo_bitacora
  for delete using (private.is_admin());

create trigger trg_equipo_bitacora_updated_at
  before update on public.equipo_bitacora
  for each row execute function set_updated_at();

-- Vínculo opcional: un ticket puede referir a un equipo específico
alter table public.tickets add column equipo_id uuid references public.equipos(id) on delete set null;

create index idx_equipos_company on public.equipos(company_id);
create index idx_equipos_department on public.equipos(department_id);
create index idx_equipos_status on public.equipos(status);
create index idx_equipo_bitacora_equipo on public.equipo_bitacora(equipo_id);
create index idx_tickets_equipo on public.tickets(equipo_id);
;
