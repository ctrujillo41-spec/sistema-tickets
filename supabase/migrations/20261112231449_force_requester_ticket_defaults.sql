-- Tarea 2.4 (S-06): cuando un usuario normal crea un ticket por la API, se ignoran los campos
-- que solo debe fijar el sistema o el staff. El trigger se llama trg_0_... para correr ANTES
-- de trg_auto_assign_ticket y trg_set_ticket_sla, que luego asignan agente y calculan el SLA.
-- Reversion: drop trigger trg_0_force_requester_ticket_defaults on public.tickets;
--            drop function public.force_requester_ticket_defaults();
create or replace function public.force_requester_ticket_defaults()
returns trigger
language plpgsql
set search_path = ''
as $f$
begin
  if current_user in ('authenticated', 'anon')
     and not exists (
       select 1 from public.profiles
       where id = (select auth.uid()) and role in ('agent', 'admin') and is_active
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
$f$;

revoke execute on function public.force_requester_ticket_defaults() from public, anon, authenticated;

create trigger trg_0_force_requester_ticket_defaults
  before insert on public.tickets
  for each row execute function public.force_requester_ticket_defaults();;
