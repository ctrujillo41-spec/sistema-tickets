-- Bug: el guardado del horario laboral usa upsert() desde el cliente, y
-- Postgres evalúa la policy de INSERT para un upsert aunque termine
-- resolviendo como UPDATE por el conflicto de PK. business_hours solo
-- tenía policies de SELECT y UPDATE, faltaba INSERT para admin.

drop policy if exists business_hours_insert_admin on public.business_hours;
create policy business_hours_insert_admin
  on public.business_hours
  for insert
  to authenticated
  with check (private.is_admin());;
