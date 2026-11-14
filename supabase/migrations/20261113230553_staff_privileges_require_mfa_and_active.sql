-- Tarea 2.8 parte C (S-16): los privilegios de staff (admin/agent) solo valen si la cuenta esta
-- activa (is_active) y la sesion tiene segundo factor (aal2). Un staff sin factor, o dado de baja,
-- queda con permisos de usuario normal. Tambien aplica a los tickets que tenga asignados.
-- Reversion: restaurar is_admin / is_agent_or_admin / current_role sin is_active ni aal2,
--            quitar "AND private.is_agent_or_admin()" de las 9 politicas y la condicion aal2 de los 2 triggers.

create or replace function private.staff_session_ok()
returns boolean language sql stable security definer set search_path to 'public' as $f$
  select coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2'
$f$;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path to 'public' as $f$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin' and is_active)
     and private.staff_session_ok();
$f$;

create or replace function private.is_agent_or_admin()
returns boolean language sql stable security definer set search_path to 'public' as $f$
  select exists(select 1 from public.profiles where id = auth.uid() and role in ('admin','agent') and is_active)
     and private.staff_session_ok();
$f$;

create or replace function private."current_role"()
returns text language sql stable security definer set search_path to 'public' as $f$
  select case
           when role in ('admin','agent') and not (is_active and private.staff_session_ok()) then 'user'
           else role
         end
  from public.profiles where id = auth.uid();
$f$;

-- La rama "ticket asignado a mi" tambien exige staff activo con segundo factor.
do $$
declare p record; q text; c text; s text;
begin
  for p in
    select * from pg_policies
    where schemaname in ('public','storage')
      and (coalesce(qual,'') || coalesce(with_check,'')) like '%assigned_agent_id%'
  loop
    q := p.qual; c := p.with_check;
    q := replace(replace(replace(q,
      '(t.assigned_agent_id = ( SELECT auth.uid() AS uid))', '((t.assigned_agent_id = ( SELECT auth.uid() AS uid)) AND private.is_agent_or_admin())'),
      '(assigned_agent_id = ( SELECT auth.uid() AS uid))',   '((assigned_agent_id = ( SELECT auth.uid() AS uid)) AND private.is_agent_or_admin())'),
      '(t.assigned_agent_id = auth.uid())',                  '((t.assigned_agent_id = auth.uid()) AND private.is_agent_or_admin())');
    c := replace(replace(replace(c,
      '(t.assigned_agent_id = ( SELECT auth.uid() AS uid))', '((t.assigned_agent_id = ( SELECT auth.uid() AS uid)) AND private.is_agent_or_admin())'),
      '(assigned_agent_id = ( SELECT auth.uid() AS uid))',   '((assigned_agent_id = ( SELECT auth.uid() AS uid)) AND private.is_agent_or_admin())'),
      '(t.assigned_agent_id = auth.uid())',                  '((t.assigned_agent_id = auth.uid()) AND private.is_agent_or_admin())');
    s := format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
    if q is not null then s := s || ' using (' || q || ')'; end if;
    if c is not null then s := s || ' with check (' || c || ')'; end if;
    execute s;
  end loop;
end $$;

create or replace function public.guard_ticket_protected_columns()
returns trigger language plpgsql set search_path = '' as $f$
begin
  if current_user in ('authenticated', 'anon')
     and not (
       exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin' and is_active)
       and coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2'
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

create or replace function public.force_requester_ticket_defaults()
returns trigger language plpgsql set search_path = '' as $f$
begin
  if current_user in ('authenticated', 'anon')
     and not (
       exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('agent', 'admin') and is_active)
       and coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2'
     ) then
    new.status := 'nuevo';
    new.assigned_agent_id := null;
    new.first_response_at := null;
    new.resolved_at := null;
    new.closed_at := null;
    new.sla_response_due := null;
    new.sla_resolution_due := null;
    new.csat_rating := null;
    new.csat_comment := null;
  end if;
  return new;
end
$f$;;
