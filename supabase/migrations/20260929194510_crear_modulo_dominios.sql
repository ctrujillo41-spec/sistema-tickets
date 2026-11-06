create table public.dominios (
  id uuid primary key default gen_random_uuid(),
  nombre_dominio text not null unique,
  company_id uuid references public.companies(id) on delete set null,
  registrador text,
  proveedor_hosting text,
  tiene_sitio_web boolean not null default false,
  url_sitio text,
  fecha_registro date,
  fecha_vencimiento date,
  costo_renovacion numeric(10,2),
  moneda text not null default 'MXN',
  ciclo_renovacion text not null default 'anual' check (ciclo_renovacion in ('mensual','anual','bianual','trianual')),
  auto_renovacion boolean not null default false,
  estado text not null default 'activo' check (estado in ('activo','por_vencer','vencido','cancelado')),
  usuario_registrador text,
  password_registrador text,
  usuario_hosting text,
  password_hosting text,
  servidor_dns text,
  correo_notificaciones text,
  proveedor_ssl text,
  fecha_vencimiento_ssl date,
  responsable_id uuid references public.profiles(id) on delete set null,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.dominios is 'Inventario de dominios administrados: vencimientos, costos, hosting y credenciales asociadas.';

create index dominios_company_id_idx on public.dominios(company_id);
create index dominios_fecha_vencimiento_idx on public.dominios(fecha_vencimiento);
create index dominios_estado_idx on public.dominios(estado);

create trigger set_dominios_updated_at
  before update on public.dominios
  for each row execute function public.set_updated_at();

alter table public.dominios enable row level security;

-- Los dominios guardan credenciales sensibles (usuarios/contraseñas de
-- registrador y hosting), así que a diferencia de equipos/proyectos este
-- módulo queda restringido solo a admin, no a agentes.
create policy dominios_select on public.dominios
  for select using (private.is_admin());

create policy dominios_insert on public.dominios
  for insert with check (private.is_admin());

create policy dominios_update on public.dominios
  for update using (private.is_admin());

create policy dominios_delete on public.dominios
  for delete using (private.is_admin());
;
