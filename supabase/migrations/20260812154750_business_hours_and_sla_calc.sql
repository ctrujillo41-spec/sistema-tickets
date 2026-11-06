-- Horario laboral configurable (lunes a viernes 08:00-17:00, hora de
-- Ciudad de México, como valores iniciales). Las horas de SLA (sla_policies)
-- ahora se cuentan solo dentro de este horario, no en tiempo de calendario:
-- un ticket "alta" (2h respuesta) creado viernes a las 16:30 vence el lunes
-- a las 09:30, no el mismo viernes a las 18:30.

create table if not exists public.business_hours (
  weekday integer primary key check (weekday between 0 and 6), -- 0=domingo ... 6=sábado (extract(dow))
  label text not null,
  is_open boolean not null default false,
  open_time time,
  close_time time,
  check (not is_open or (open_time is not null and close_time is not null and open_time < close_time))
);

insert into public.business_hours (weekday, label, is_open, open_time, close_time) values
  (0, 'Domingo',  false, null,     null),
  (1, 'Lunes',    true,  '08:00',  '17:00'),
  (2, 'Martes',   true,  '08:00',  '17:00'),
  (3, 'Miércoles',true,  '08:00',  '17:00'),
  (4, 'Jueves',   true,  '08:00',  '17:00'),
  (5, 'Viernes',  true,  '08:00',  '17:00'),
  (6, 'Sábado',   false, null,     null)
on conflict (weekday) do nothing;

create table if not exists public.business_hours_settings (
  singleton boolean primary key default true check (singleton),
  timezone text not null default 'America/Mexico_City'
);
insert into public.business_hours_settings (singleton, timezone)
  values (true, 'America/Mexico_City')
  on conflict (singleton) do nothing;

alter table public.business_hours enable row level security;
alter table public.business_hours_settings enable row level security;

drop policy if exists business_hours_select_authenticated on public.business_hours;
create policy business_hours_select_authenticated
  on public.business_hours for select to authenticated using (true);

drop policy if exists business_hours_update_admin on public.business_hours;
create policy business_hours_update_admin
  on public.business_hours for update to authenticated
  using (private.is_admin()) with check (private.is_admin());

drop policy if exists business_hours_settings_select_authenticated on public.business_hours_settings;
create policy business_hours_settings_select_authenticated
  on public.business_hours_settings for select to authenticated using (true);

drop policy if exists business_hours_settings_update_admin on public.business_hours_settings;
create policy business_hours_settings_update_admin
  on public.business_hours_settings for update to authenticated
  using (private.is_admin()) with check (private.is_admin());

drop trigger if exists trg_audit_business_hours on public.business_hours;
create trigger trg_audit_business_hours
  after insert or update or delete on public.business_hours
  for each row execute function private.audit_trigger();

drop trigger if exists trg_audit_business_hours_settings on public.business_hours_settings;
create trigger trg_audit_business_hours_settings
  after insert or update or delete on public.business_hours_settings
  for each row execute function private.audit_trigger();

-- Suma horas hábiles a un timestamp, saltando días cerrados y horario
-- fuera de la ventana laboral configurada. Si algo sale mal (por ejemplo
-- toda la semana quedó marcada como cerrada por error), después de 60
-- días de recorrido se rinde y regresa calendario simple, para que crear
-- un ticket nunca falle por esto.
create or replace function private.add_business_hours(start_ts timestamptz, hours_to_add numeric)
returns timestamptz
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_tz text;
  v_remaining numeric := hours_to_add;
  v_cursor timestamp;
  v_dow int;
  v_is_open boolean;
  v_open time;
  v_close time;
  v_day_open timestamp;
  v_day_close timestamp;
  v_available numeric;
  v_guard int := 0;
begin
  if hours_to_add is null or hours_to_add <= 0 then
    return start_ts;
  end if;

  select timezone into v_tz from public.business_hours_settings limit 1;
  if v_tz is null then v_tz := 'America/Mexico_City'; end if;

  v_cursor := start_ts at time zone v_tz;

  loop
    v_guard := v_guard + 1;
    if v_guard > 1440 then
      -- salvaguarda: configuración inválida, no te quedes en loop infinito
      return start_ts + make_interval(hours => hours_to_add);
    end if;

    v_dow := extract(dow from v_cursor)::int;
    select is_open, open_time, close_time into v_is_open, v_open, v_close
      from public.business_hours where weekday = v_dow;

    if not found or not v_is_open then
      v_cursor := date_trunc('day', v_cursor) + interval '1 day';
      continue;
    end if;

    v_day_open := date_trunc('day', v_cursor) + v_open;
    v_day_close := date_trunc('day', v_cursor) + v_close;

    if v_cursor < v_day_open then
      v_cursor := v_day_open;
    elsif v_cursor >= v_day_close then
      v_cursor := date_trunc('day', v_cursor) + interval '1 day';
      continue;
    end if;

    v_available := extract(epoch from (v_day_close - v_cursor)) / 3600.0;

    if v_remaining <= v_available then
      v_cursor := v_cursor + (v_remaining * interval '1 hour');
      exit;
    else
      v_remaining := v_remaining - v_available;
      v_cursor := date_trunc('day', v_cursor) + interval '1 day';
    end if;
  end loop;

  return v_cursor at time zone v_tz;
end;
$function$;

grant execute on function private.add_business_hours(timestamptz, numeric) to authenticated;

-- El trigger de SLA ahora suma horas hábiles en vez de horas de calendario.
create or replace function private.set_ticket_sla()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_response_hours integer;
  v_resolution_hours integer;
begin
  select response_hours, resolution_hours
    into v_response_hours, v_resolution_hours
    from public.sla_policies
    where priority = new.priority;

  if v_response_hours is null then
    case new.priority
      when 'critica' then v_response_hours := 1; v_resolution_hours := 4;
      when 'alta' then v_response_hours := 2; v_resolution_hours := 8;
      when 'media' then v_response_hours := 4; v_resolution_hours := 24;
      when 'baja' then v_response_hours := 8; v_resolution_hours := 48;
      else v_response_hours := 24; v_resolution_hours := 72;
    end case;
  end if;

  if new.sla_response_due is null then
    new.sla_response_due := private.add_business_hours(new.created_at, v_response_hours);
  end if;
  if new.sla_resolution_due is null then
    new.sla_resolution_due := private.add_business_hours(new.created_at, v_resolution_hours);
  end if;

  return new;
end;
$function$;;
