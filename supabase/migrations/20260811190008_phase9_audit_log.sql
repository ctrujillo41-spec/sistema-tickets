-- Fase 9 (Endurecimiento): bitácora de auditoría para tablas administrativas.
-- Registra INSERT/UPDATE/DELETE en profiles (altas, cambios de rol/depto/
-- empresa/estado), categories, subcategories, companies, departments y
-- kb_articles. Solo lectura para admins vía RLS; las filas las crea
-- exclusivamente el trigger (SECURITY DEFINER, dueño = postgres, que por
-- ser el dueño de la tabla no queda sujeto a RLS aunque no exista policy
-- de INSERT para authenticated/anon).

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text,
  changed_fields jsonb,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_log_table_name on public.audit_log(table_name);
create index if not exists idx_audit_log_record_id on public.audit_log(record_id);
create index if not exists idx_audit_log_created_at on public.audit_log(created_at desc);

alter table public.audit_log enable row level security;

drop policy if exists audit_log_select_admin on public.audit_log;
create policy audit_log_select_admin
  on public.audit_log
  for select
  to authenticated
  using (private.is_admin());

-- Sin policies de insert/update/delete para authenticated/anon: solo el
-- trigger (ejecutado como dueño de la tabla) puede escribir aquí.

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
begin
  v_actor_id := auth.uid();
  if v_actor_id is not null then
    select full_name into v_actor_name from public.profiles where id = v_actor_id;
  end if;

  if TG_OP = 'UPDATE' then
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    for v_key in select jsonb_object_keys(v_new) loop
      if v_old -> v_key is distinct from v_new -> v_key then
        v_changed := v_changed || jsonb_build_object(v_key, jsonb_build_object('old', v_old -> v_key, 'new', v_new -> v_key));
      end if;
    end loop;
    if v_changed = '{}'::jsonb then
      return new; -- nada cambió realmente (p.ej. solo updated_at) -> no auditar
    end if;
    insert into public.audit_log (table_name, record_id, action, actor_id, actor_name, changed_fields, old_data, new_data)
    values (TG_TABLE_NAME, new.id, 'UPDATE', v_actor_id, v_actor_name, v_changed, v_old, v_new);
    return new;
  elsif TG_OP = 'INSERT' then
    insert into public.audit_log (table_name, record_id, action, actor_id, actor_name, new_data)
    values (TG_TABLE_NAME, new.id, 'INSERT', v_actor_id, v_actor_name, to_jsonb(new));
    return new;
  elsif TG_OP = 'DELETE' then
    insert into public.audit_log (table_name, record_id, action, actor_id, actor_name, old_data)
    values (TG_TABLE_NAME, old.id, 'DELETE', v_actor_id, v_actor_name, to_jsonb(old));
    return old;
  end if;
  return null;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['profiles', 'categories', 'subcategories', 'companies', 'departments', 'kb_articles']
  loop
    execute format('drop trigger if exists trg_audit_%s on public.%I;', t, t);
    execute format(
      'create trigger trg_audit_%s after insert or update or delete on public.%I for each row execute function private.audit_trigger();',
      t, t
    );
  end loop;
end $$;;
