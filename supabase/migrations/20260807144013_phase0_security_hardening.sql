
-- Endurecimiento: las funciones auxiliares de RLS no deben quedar
-- expuestas como endpoints RPC públicos (PostgREST expone todo lo
-- que vive en el esquema "public"). Se mueven a un esquema privado.
create schema if not exists private;

alter function public.current_role() set schema private;
alter function public.current_company_id() set schema private;
alter function public.current_department_id() set schema private;
alter function public.is_admin() set schema private;
alter function public.is_agent_or_admin() set schema private;
alter function public.handle_new_user() set schema private;
alter function public.log_ticket_changes() set schema private;

revoke all on function private.current_role() from public, anon, authenticated;
revoke all on function private.current_company_id() from public, anon, authenticated;
revoke all on function private.current_department_id() from public, anon, authenticated;
revoke all on function private.is_admin() from public, anon, authenticated;
revoke all on function private.is_agent_or_admin() from public, anon, authenticated;

-- Corrige search_path mutable en la función preexistente set_updated_at
alter function public.set_updated_at() set search_path = public;
;
