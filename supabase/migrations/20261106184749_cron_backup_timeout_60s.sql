-- Tarea 1.4b: la funcion backup-export tarda ~12 s y pg_net cortaba la espera a los 5 s.
-- Solo se agrega timeout_milliseconds := 60000; URL, encabezados y horario sin cambios.
select cron.alter_job(
  job_id := (select jobid from cron.job where jobname = 'daily-backup-export'),
  command := $cmd$
  select net.http_post(
    url := 'https://vvqmsxbinhcdrxkkgyms.supabase.co/functions/v1/backup-export',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'backup_service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $cmd$
);;
