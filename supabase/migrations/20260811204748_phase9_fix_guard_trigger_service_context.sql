-- Bug propio: el trigger de Fase 9 que bloquea auto-escalación de rol
-- (trg_guard_profile_privileged_columns) revertía TAMBIÉN los cambios
-- hechos directamente vía SQL/service role (por ejemplo, para dar de alta
-- al primer admin), porque auth.uid() es NULL fuera de una sesión de
-- Supabase Auth y private.is_admin() evaluaba falso en ese caso. La regla
-- correcta es: solo congelar las columnas privilegiadas cuando quien
-- actualiza es un usuario autenticado normal que NO es admin; si no hay
-- auth.uid() (acceso directo con service role / SQL), se deja pasar, igual
-- que ya hace RLS con el dueño de la tabla.

create or replace function private.guard_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not private.is_admin() then
    new.role := old.role;
    new.department_id := old.department_id;
    new.company_id := old.company_id;
    new.is_active := old.is_active;
    new.entra_id := old.entra_id;
  end if;
  return new;
end;
$$;

-- Corrige ahora el registro de Christian, que se había revertido por el
-- mismo bug.
-- Correo real omitido: el repositorio es público. Migración ya aplicada en producción.
update public.profiles set role = 'admin' where email = 'admin@ejemplo.com';;
