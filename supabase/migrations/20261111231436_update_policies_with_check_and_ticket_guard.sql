-- Tarea 2.3 (S-05): restringir como queda un registro despues de editarlo.
-- Transferir tickets a otro departamento y cambiar el responsable de un proyecto pasan a ser solo de admin.
-- Reversion: alter policy ... with check (true) no aplica; usar:
--   alter policy tickets_update_staff on public.tickets with check (null) -> recrear politica sin with check;
--   drop trigger trg_guard_ticket_protected_columns on public.tickets; drop function public.guard_ticket_protected_columns();

alter policy tickets_update_staff on public.tickets
  with check (
    private.is_admin()
    or assigned_agent_id = (select auth.uid())
    or (private."current_role"() = 'agent' and department_id = private.current_department_id())
  );

alter policy proyectos_update on public.proyectos
  with check (private.is_admin() or responsable_id = (select auth.uid()));

alter policy proyecto_tiempos_update on public.proyecto_tiempos
  with check (private.is_admin() or user_id = (select auth.uid()));

-- Solicitante y calificacion: solo admin por la API. Las funciones internas (rate_ticket, close_ticket,
-- reopen_ticket) corren como propietario y no pasan por esta restriccion.
create or replace function public.guard_ticket_protected_columns()
returns trigger
language plpgsql
set search_path = ''
as $f$
begin
  if current_user in ('authenticated', 'anon')
     and not exists (
       select 1 from public.profiles
       where id = (select auth.uid()) and role = 'admin' and is_active
     ) then
    if new.requester_id is distinct from old.requester_id then
      raise exception 'Solo un administrador puede cambiar el solicitante' using errcode = '42501';
    end if;
    if new.csat_rating is distinct from old.csat_rating
       or new.csat_comment is distinct from old.csat_comment then
      raise exception 'La calificación solo la registra el solicitante' using errcode = '42501';
    end if;
  end if;
  return new;
end
$f$;

revoke execute on function public.guard_ticket_protected_columns() from public, anon, authenticated;

create trigger trg_guard_ticket_protected_columns
  before update on public.tickets
  for each row execute function public.guard_ticket_protected_columns();;
