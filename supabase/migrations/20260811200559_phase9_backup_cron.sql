-- Fase 9: programa la Edge Function backup-export para correr todos los
-- días a la 01:00 hora de Ciudad de México (07:00 UTC, sin horario de
-- verano). El header Authorization se arma en tiempo real leyendo el
-- service_role key desde Supabase Vault (secreto "backup_service_role_key"),
-- para no dejarlo escrito en texto plano en la definición del cron job.
--
-- IMPORTANTE: este job no funcionará hasta que el secreto exista en Vault.
-- Ver instrucciones aparte para crearlo desde el SQL Editor del dashboard
-- de Supabase (nunca se pega el service_role key en este chat).

create extension if not exists pg_net;

select cron.schedule(
  'daily-backup-export',
  '0 7 * * *',
  $$
  select net.http_post(
    url := 'https://vvqmsxbinhcdrxkkgyms.supabase.co/functions/v1/backup-export',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'backup_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);;
