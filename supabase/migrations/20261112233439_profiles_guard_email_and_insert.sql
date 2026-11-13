-- Tarea 2.6 (S-12, S-13): un usuario no admin no puede cambiar su correo ni crear su perfil
-- con privilegios. El nombre sigue siendo editable. Las altas de Auth (handle_new_user) corren
-- sin auth.uid() y no se ven afectadas.
-- Reversion: drop trigger trg_guard_profile_privileged_columns_insert on public.profiles;
--            y restaurar la version anterior de la funcion (sin la rama INSERT ni new.email).
create or replace function private.guard_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $f$
begin
  if auth.uid() is not null and not private.is_admin() then
    if tg_op = 'INSERT' then
      new.role := 'user';
      new.department_id := null;
      new.company_id := null;
      new.is_active := true;
      new.entra_id := null;
      new.email := (select u.email from auth.users u where u.id = new.id);
    else
      new.role := old.role;
      new.department_id := old.department_id;
      new.company_id := old.company_id;
      new.is_active := old.is_active;
      new.entra_id := old.entra_id;
      new.email := old.email;
    end if;
  end if;
  return new;
end
$f$;

create trigger trg_guard_profile_privileged_columns_insert
  before insert on public.profiles
  for each row execute function private.guard_profile_privileged_columns();;
