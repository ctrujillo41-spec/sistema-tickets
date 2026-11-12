-- Tarea 2.2 (S-04): un usuario normal solo ve su propio perfil y los del staff.
-- El staff (agent/admin) sigue viendo todos los perfiles.
-- Reversion: drop policy profiles_select_scoped; create policy profiles_select_authenticated
--   on public.profiles for select to authenticated using (true);
drop policy profiles_select_authenticated on public.profiles;

create policy profiles_select_scoped on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or role in ('agent', 'admin')
    or private.is_agent_or_admin()
  );;
