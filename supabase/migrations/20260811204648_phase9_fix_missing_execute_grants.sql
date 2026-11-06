-- Bug encontrado en producción: "permission denied for function
-- is_agent_or_admin" al crear un ticket. Causa raíz: private.is_admin,
-- private.is_agent_or_admin, private.current_role, private.current_company_id
-- y private.current_department_id nunca tuvieron GRANT EXECUTE para el rol
-- "authenticated", aunque se usan directamente dentro de policies de RLS
-- (tickets_insert, kb_articles_*, ticket_comments_*, profiles_update,
-- audit_log_select_admin, backup_log_select_admin, backups_storage_select_admin).
-- Postgres valida el permiso de ejecutar la función al planear la consulta,
-- sin importar si el otro lado del OR ya resuelve el check a verdadero, así
-- que cualquier policy que las mencione fallaba con "permission denied" en
-- vez de simplemente negar el acceso. No es algo que haya tocado la
-- migración de Fase 9; ya estaba así desde que se crearon estas funciones.

grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_agent_or_admin() to authenticated;
grant execute on function private.current_role() to authenticated;
grant execute on function private.current_company_id() to authenticated;
grant execute on function private.current_department_id() to authenticated;;
