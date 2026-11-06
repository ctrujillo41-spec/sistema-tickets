-- Fase 9 (Endurecimiento): la política profiles_update permite que cualquier
-- usuario autenticado actualice su propia fila (id = auth.uid()), pero no
-- restringe QUÉ columnas puede cambiar. La app nunca expone role/department_id/
-- company_id/is_active/entra_id en el formulario de "mi perfil", pero a nivel
-- de base de datos nada impedía que alguien llamara a la API de PostgREST
-- directamente y se auto-asignara role='admin'. Este trigger congela esas
-- columnas a su valor anterior cuando quien actualiza NO es admin, sin
-- bloquear la actualización completa (así full_name/phone/avatar_url se
-- siguen pudiendo editar libremente).

create or replace function private.guard_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.is_admin() then
    new.role := old.role;
    new.department_id := old.department_id;
    new.company_id := old.company_id;
    new.is_active := old.is_active;
    new.entra_id := old.entra_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_profile_privileged_columns on public.profiles;
create trigger trg_guard_profile_privileged_columns
  before update on public.profiles
  for each row
  execute function private.guard_profile_privileged_columns();;
