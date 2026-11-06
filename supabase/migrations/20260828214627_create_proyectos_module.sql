
-- Módulo de Proyectos: trabajo de TI que no nace de una solicitud de un
-- tercero (automatizaciones, configuración de equipos, infraestructura,
-- migraciones, capacitación) pero cuyo tiempo invertido también se quiere
-- poder demostrar, igual que con tickets. Es de uso interno del equipo de
-- soporte (admin/agent) — no lo ve el usuario final.

create table public.proyecto_categorias (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.proyecto_categorias (name) values
  ('Automatización de procesos'),
  ('Configuración de equipos'),
  ('Infraestructura'),
  ('Migración / Mantenimiento'),
  ('Capacitación'),
  ('Otro');

create table public.proyectos (
  id uuid primary key default gen_random_uuid(),
  folio bigint generated always as identity,
  nombre text not null,
  descripcion text,
  categoria_id uuid references public.proyecto_categorias(id),
  company_id uuid references public.companies(id),
  department_id uuid references public.departments(id),
  priority text not null default 'media'
    check (priority = any (array['muy_baja','baja','media','alta','critica'])),
  status text not null default 'planeacion'
    check (status = any (array['planeacion','en_proceso','pausado','completado','cancelado'])),
  responsable_id uuid references public.profiles(id),
  created_by uuid references public.profiles(id) default auth.uid(),
  fecha_inicio date,
  fecha_objetivo date,
  fecha_cierre date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index proyectos_status_idx on public.proyectos(status);
create index proyectos_department_idx on public.proyectos(department_id);
create index proyectos_company_idx on public.proyectos(company_id);
create index proyectos_responsable_idx on public.proyectos(responsable_id);

create trigger trg_proyectos_updated_at
  before update on public.proyectos
  for each row execute function public.set_updated_at();

create table public.proyecto_tiempos (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) default auth.uid(),
  fecha date not null default current_date,
  horas numeric(5,2) not null check (horas > 0 and horas <= 24),
  nota text,
  created_at timestamptz not null default now()
);

create index proyecto_tiempos_proyecto_idx on public.proyecto_tiempos(proyecto_id);
create index proyecto_tiempos_user_idx on public.proyecto_tiempos(user_id);

alter table public.proyecto_categorias enable row level security;
alter table public.proyectos enable row level security;
alter table public.proyecto_tiempos enable row level security;

-- proyecto_categorias: catálogo visible para todo el staff, solo admin lo edita.
create policy proyecto_categorias_select on public.proyecto_categorias
  for select using (private.is_agent_or_admin());
create policy proyecto_categorias_write on public.proyecto_categorias
  for insert with check (private.is_admin());
create policy proyecto_categorias_update on public.proyecto_categorias
  for update using (private.is_admin());
create policy proyecto_categorias_delete on public.proyecto_categorias
  for delete using (private.is_admin());

-- proyectos: solo staff (admin/agent) lo ve y lo crea. Lo edita el admin o
-- el responsable asignado — igual de restrictivo que companies/departments
-- para escritura, pero el responsable puede actualizar su propio proyecto.
create policy proyectos_select on public.proyectos
  for select using (private.is_agent_or_admin());
create policy proyectos_insert on public.proyectos
  for insert with check (private.is_agent_or_admin());
create policy proyectos_update on public.proyectos
  for update using (private.is_admin() or responsable_id = (select auth.uid()));
create policy proyectos_delete on public.proyectos
  for delete using (private.is_admin());

-- proyecto_tiempos: cualquier miembro del staff ve todos los registros (para
-- que los reportes sumen el total del equipo), pero cada quien solo puede
-- registrar/editar/borrar su propio tiempo; el admin puede todo.
create policy proyecto_tiempos_select on public.proyecto_tiempos
  for select using (private.is_agent_or_admin());
create policy proyecto_tiempos_insert on public.proyecto_tiempos
  for insert with check (
    private.is_agent_or_admin()
    and (user_id = (select auth.uid()) or private.is_admin())
  );
create policy proyecto_tiempos_update on public.proyecto_tiempos
  for update using (private.is_admin() or user_id = (select auth.uid()));
create policy proyecto_tiempos_delete on public.proyecto_tiempos
  for delete using (private.is_admin() or user_id = (select auth.uid()));
;
