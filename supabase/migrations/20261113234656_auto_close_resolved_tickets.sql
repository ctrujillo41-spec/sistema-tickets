-- Tarea 3.5 (Q-04): los tickets resueltos se cierran solos a los 7 dias. closed_at se fija en
-- resolved_at + 7 dias, de modo que la ventana de reapertura (7 dias desde el cierre) se cuenta
-- de forma consistente. Corre diario a las 07:15 UTC (01:15 en Ciudad de Mexico), despues del respaldo.
-- Reversion: select cron.unschedule('auto-close-resolved-tickets'); drop function private.auto_close_resolved_tickets();

create or replace function private.auto_close_resolved_tickets()
returns integer language plpgsql security definer set search_path to 'public' as $f$
declare
  n integer;
begin
  update public.tickets
  set status = 'cerrado', closed_at = resolved_at + interval '7 days'
  where status = 'resuelto' and resolved_at < now() - interval '7 days';
  get diagnostics n = row_count;
  return n;
end
$f$;

revoke execute on function private.auto_close_resolved_tickets() from public, anon, authenticated;

select cron.schedule('auto-close-resolved-tickets', '15 7 * * *', 'select private.auto_close_resolved_tickets();');;
