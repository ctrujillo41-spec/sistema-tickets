
-- =========================================================
-- Trigger de historial: ahora también registra tiempos
-- (primera respuesta / resolución / cierre) automáticamente.
-- Estos campos siguen ocultos en la UI (feature flag, Fase 4)
-- pero se capturan desde ya para no perder datos históricos.
-- =========================================================
create or replace function private.log_ticket_changes()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.status is distinct from new.status then
    insert into public.ticket_history(ticket_id, changed_by, field_name, old_value, new_value)
    values (new.id, auth.uid(), 'status', old.status, new.status);

    if old.status = 'nuevo' and new.first_response_at is null then
      new.first_response_at = now();
    end if;
    if new.status = 'resuelto' and new.resolved_at is null then
      new.resolved_at = now();
    end if;
    if new.status = 'cerrado' and new.closed_at is null then
      new.closed_at = now();
    end if;
    if new.status = 'reabierto' then
      new.closed_at = null;
    end if;
  end if;

  if old.priority is distinct from new.priority then
    insert into public.ticket_history(ticket_id, changed_by, field_name, old_value, new_value)
    values (new.id, auth.uid(), 'priority', old.priority, new.priority);
  end if;

  if old.assigned_agent_id is distinct from new.assigned_agent_id then
    insert into public.ticket_history(ticket_id, changed_by, field_name, old_value, new_value)
    values (new.id, auth.uid(), 'assigned_agent_id', old.assigned_agent_id::text, new.assigned_agent_id::text);
  end if;

  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- Acciones seguras del usuario final: cerrar, reabrir y
-- calificar su propio ticket. No usan UPDATE directo (la
-- política tickets_update_staff no lo permite para "user");
-- estas funciones validan la transición y el dueño del ticket.
-- =========================================================
create or replace function public.close_ticket(p_ticket_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_status text;
  v_requester uuid;
begin
  select status, requester_id into v_status, v_requester from public.tickets where id = p_ticket_id;
  if v_requester is null then
    raise exception 'Ticket no encontrado';
  end if;
  if auth.uid() <> v_requester and not private.is_admin() then
    raise exception 'No autorizado';
  end if;
  if v_status <> 'resuelto' then
    raise exception 'Solo se puede cerrar un ticket resuelto';
  end if;
  update public.tickets set status = 'cerrado' where id = p_ticket_id;
end;
$$;

create or replace function public.reopen_ticket(p_ticket_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_status text;
  v_requester uuid;
  v_closed_at timestamptz;
begin
  select status, requester_id, closed_at into v_status, v_requester, v_closed_at
  from public.tickets where id = p_ticket_id;
  if v_requester is null then
    raise exception 'Ticket no encontrado';
  end if;
  if auth.uid() <> v_requester and not private.is_admin() then
    raise exception 'No autorizado';
  end if;
  if v_status <> 'cerrado' then
    raise exception 'Solo se puede reabrir un ticket cerrado';
  end if;
  if v_closed_at is not null and now() - v_closed_at > interval '7 days' then
    raise exception 'La ventana para reabrir (7 días) ya expiró';
  end if;
  update public.tickets set status = 'reabierto' where id = p_ticket_id;
end;
$$;

create or replace function public.rate_ticket(p_ticket_id uuid, p_rating smallint, p_comment text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_status text;
  v_requester uuid;
begin
  select status, requester_id into v_status, v_requester from public.tickets where id = p_ticket_id;
  if v_requester is null then
    raise exception 'Ticket no encontrado';
  end if;
  if auth.uid() <> v_requester then
    raise exception 'No autorizado';
  end if;
  if v_status not in ('resuelto', 'cerrado') then
    raise exception 'El ticket aún no está resuelto';
  end if;
  if p_rating < 1 or p_rating > 5 then
    raise exception 'Calificación inválida';
  end if;
  update public.tickets set csat_rating = p_rating, csat_comment = p_comment where id = p_ticket_id;
end;
$$;

revoke all on function public.close_ticket(uuid) from public, anon;
revoke all on function public.reopen_ticket(uuid) from public, anon;
revoke all on function public.rate_ticket(uuid, smallint, text) from public, anon;
grant execute on function public.close_ticket(uuid) to authenticated;
grant execute on function public.reopen_ticket(uuid) to authenticated;
grant execute on function public.rate_ticket(uuid, smallint, text) to authenticated;

-- =========================================================
-- Storage: bucket privado para adjuntos de tickets.
-- Ruta de cada archivo: {ticket_id}/{uuid}-{nombre_original}
-- =========================================================
insert into storage.buckets (id, name, public)
values ('ticket-attachments', 'ticket-attachments', false)
on conflict (id) do nothing;

create policy "ticket_attachments_storage_select" on storage.objects
for select to authenticated using (
  bucket_id = 'ticket-attachments' and
  exists (
    select 1 from public.tickets t
    where t.id::text = (storage.foldername(name))[1]
    and (
      private.is_admin() or t.requester_id = auth.uid() or t.assigned_agent_id = auth.uid()
      or (private.current_role() = 'agent' and t.department_id = private.current_department_id())
    )
  )
);

create policy "ticket_attachments_storage_insert" on storage.objects
for insert to authenticated with check (
  bucket_id = 'ticket-attachments' and
  exists (
    select 1 from public.tickets t
    where t.id::text = (storage.foldername(name))[1]
    and (
      private.is_admin() or t.requester_id = auth.uid() or t.assigned_agent_id = auth.uid()
      or (private.current_role() = 'agent' and t.department_id = private.current_department_id())
    )
  )
);
;
