-- Bug: audit_trigger() asumía que toda tabla auditada tiene columna "id"
-- (new.id / old.id), pero business_hours usa "weekday" y
-- business_hours_settings usa "singleton" como llave primaria, ni
-- siquiera son de tipo uuid. Se cambia a leer el campo "id" vía JSON
-- (to_jsonb(...)->>'id'), que da NULL en vez de error si la columna no
-- existe, en lugar de fallar todo el UPDATE/INSERT/DELETE.

create or replace function private.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_actor_name text;
  v_old jsonb;
  v_new jsonb;
  v_changed jsonb := '{}'::jsonb;
  v_key text;
  v_ignored_keys text[] := array['updated_at', 'view_count', 'search_vector'];
begin
  v_actor_id := auth.uid();
  if v_actor_id is not null then
    select full_name into v_actor_name from public.profiles where id = v_actor_id;
  end if;

  if TG_OP = 'UPDATE' then
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    for v_key in select jsonb_object_keys(v_new) loop
      if v_key <> all (v_ignored_keys) and v_old -> v_key is distinct from v_new -> v_key then
        v_changed := v_changed || jsonb_build_object(v_key, jsonb_build_object('old', v_old -> v_key, 'new', v_new -> v_key));
      end if;
    end loop;
    if v_changed = '{}'::jsonb then
      return new; -- solo cambiaron columnas ignoradas (o nada realmente cambió)
    end if;
    insert into public.audit_log (table_name, record_id, action, actor_id, actor_name, changed_fields, old_data, new_data)
    values (TG_TABLE_NAME, nullif(v_new ->> 'id', '')::uuid, 'UPDATE', v_actor_id, v_actor_name, v_changed, v_old, v_new);
    return new;
  elsif TG_OP = 'INSERT' then
    v_new := to_jsonb(new);
    insert into public.audit_log (table_name, record_id, action, actor_id, actor_name, new_data)
    values (TG_TABLE_NAME, nullif(v_new ->> 'id', '')::uuid, 'INSERT', v_actor_id, v_actor_name, v_new);
    return new;
  elsif TG_OP = 'DELETE' then
    v_old := to_jsonb(old);
    insert into public.audit_log (table_name, record_id, action, actor_id, actor_name, old_data)
    values (TG_TABLE_NAME, nullif(v_old ->> 'id', '')::uuid, 'DELETE', v_actor_id, v_actor_name, v_old);
    return old;
  end if;
  return null;
end;
$$;;
