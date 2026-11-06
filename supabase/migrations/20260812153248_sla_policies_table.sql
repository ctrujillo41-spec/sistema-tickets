-- Los tiempos de SLA por prioridad estaban hardcodeados dentro del trigger
-- private.set_ticket_sla() (Fase 4), sin ninguna pantalla para verlos o
-- cambiarlos. Se mueven a una tabla configurable por el admin, con los
-- mismos valores que ya estaban en uso para no cambiar el comportamiento
-- actual.

create table if not exists public.sla_policies (
  priority text primary key check (priority in ('muy_baja','baja','media','alta','critica')),
  label text not null,
  response_hours integer not null check (response_hours > 0),
  resolution_hours integer not null check (resolution_hours > 0),
  updated_at timestamptz not null default now()
);

insert into public.sla_policies (priority, label, response_hours, resolution_hours) values
  ('critica',  'Crítica',   1, 4),
  ('alta',     'Alta',      2, 8),
  ('media',    'Media',     4, 24),
  ('baja',     'Baja',      8, 48),
  ('muy_baja', 'Muy baja', 24, 72)
on conflict (priority) do nothing;

alter table public.sla_policies enable row level security;

drop policy if exists sla_policies_select_authenticated on public.sla_policies;
create policy sla_policies_select_authenticated
  on public.sla_policies
  for select
  to authenticated
  using (true);

drop policy if exists sla_policies_update_admin on public.sla_policies;
create policy sla_policies_update_admin
  on public.sla_policies
  for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create trigger trg_sla_policies_updated_at
  before update on public.sla_policies
  for each row execute function set_updated_at();

-- Igual que categories/departments/etc. (Fase 9), cualquier cambio a los
-- SLA queda en la bitácora de auditoría.
drop trigger if exists trg_audit_sla_policies on public.sla_policies;
create trigger trg_audit_sla_policies
  after insert or update or delete on public.sla_policies
  for each row execute function private.audit_trigger();

-- El trigger que calcula las fechas límite de un ticket nuevo ahora lee de
-- esta tabla en vez de tener los valores fijos en el código. Si por algún
-- motivo la tabla no tiene la fila de esa prioridad, cae a los mismos
-- valores que tenía antes como respaldo (para que crear un ticket nunca
-- falle por esto).
create or replace function private.set_ticket_sla()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_response_hours integer;
  v_resolution_hours integer;
begin
  select response_hours, resolution_hours
    into v_response_hours, v_resolution_hours
    from public.sla_policies
    where priority = new.priority;

  if v_response_hours is null then
    case new.priority
      when 'critica' then v_response_hours := 1; v_resolution_hours := 4;
      when 'alta' then v_response_hours := 2; v_resolution_hours := 8;
      when 'media' then v_response_hours := 4; v_resolution_hours := 24;
      when 'baja' then v_response_hours := 8; v_resolution_hours := 48;
      else v_response_hours := 24; v_resolution_hours := 72;
    end case;
  end if;

  if new.sla_response_due is null then
    new.sla_response_due := new.created_at + make_interval(hours => v_response_hours);
  end if;
  if new.sla_resolution_due is null then
    new.sla_resolution_due := new.created_at + make_interval(hours => v_resolution_hours);
  end if;

  return new;
end;
$function$;;
