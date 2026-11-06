-- Fase 9 (Endurecimiento): respaldos verificados. El proyecto está en el
-- plan free de Supabase, sin respaldos automáticos gestionados. Se arma un
-- mecanismo propio: una Edge Function (backup-export, desplegada aparte)
-- exporta las tablas principales a un bucket de Storage privado (fuera de
-- las tablas de la base, para resiliencia ante un borrado accidental o una
-- migración mala), y registra cada corrida en backup_log para poder
-- verificar que sí ocurrieron y con cuántas filas.

create table if not exists public.backup_log (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'success', 'error')),
  storage_path text,
  tables_backed_up jsonb,
  file_size_bytes bigint,
  error_message text,
  triggered_by text not null default 'cron' check (triggered_by in ('cron', 'manual'))
);

create index if not exists idx_backup_log_started_at on public.backup_log(started_at desc);

alter table public.backup_log enable row level security;

drop policy if exists backup_log_select_admin on public.backup_log;
create policy backup_log_select_admin
  on public.backup_log
  for select
  to authenticated
  using (private.is_admin());

-- Solo el service role (usado internamente por la Edge Function) puede
-- escribir aquí; no hay policies de insert/update para authenticated/anon.

-- Bucket privado para los archivos de respaldo.
insert into storage.buckets (id, name, public)
values ('backups', 'backups', false)
on conflict (id) do nothing;

drop policy if exists backups_storage_select_admin on storage.objects;
create policy backups_storage_select_admin
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'backups' and private.is_admin());

-- Sin policy de insert para authenticated/anon: solo el service role
-- (la Edge Function) puede subir archivos al bucket de respaldos.;
