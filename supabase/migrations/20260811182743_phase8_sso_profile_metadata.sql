-- Fase 8: al iniciar sesión con Microsoft (Azure/Entra ID vía Supabase Auth),
-- el proveedor no llena "full_name" en raw_user_meta_data como sí lo hace
-- nuestro formulario de registro por correo; en su lugar usa el claim OIDC
-- estándar "name". También aprovechamos para guardar el identificador único
-- de Entra ID (claim "sub"/"provider_id") en profiles.entra_id.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.profiles (id, email, full_name, entra_id)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      new.email
    ),
    coalesce(
      new.raw_user_meta_data->>'provider_id',
      new.raw_user_meta_data->>'sub'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
;
