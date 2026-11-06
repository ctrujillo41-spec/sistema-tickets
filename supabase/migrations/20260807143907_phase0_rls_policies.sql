
-- =========================================================
-- profiles
-- =========================================================
alter table public.profiles enable row level security;

create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (true);

create policy "profiles_insert_self" on public.profiles
  for insert to authenticated with check (id = auth.uid());

create policy "profiles_update_self" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "profiles_update_admin" on public.profiles
  for update to authenticated using (public.is_admin());

create policy "profiles_delete_admin" on public.profiles
  for delete to authenticated using (public.is_admin());

-- =========================================================
-- companies / departments / categories / subcategories
-- lectura para todo usuario autenticado (listas del formulario de ticket)
-- escritura solo administrador
-- =========================================================
alter table public.companies enable row level security;
alter table public.departments enable row level security;
alter table public.categories enable row level security;
alter table public.subcategories enable row level security;

create policy "companies_select" on public.companies for select to authenticated using (true);
create policy "companies_write" on public.companies for insert to authenticated with check (public.is_admin());
create policy "companies_update" on public.companies for update to authenticated using (public.is_admin());
create policy "companies_delete" on public.companies for delete to authenticated using (public.is_admin());

create policy "departments_select" on public.departments for select to authenticated using (true);
create policy "departments_write" on public.departments for insert to authenticated with check (public.is_admin());
create policy "departments_update" on public.departments for update to authenticated using (public.is_admin());
create policy "departments_delete" on public.departments for delete to authenticated using (public.is_admin());

create policy "categories_select" on public.categories for select to authenticated using (true);
create policy "categories_write" on public.categories for insert to authenticated with check (public.is_admin());
create policy "categories_update" on public.categories for update to authenticated using (public.is_admin());
create policy "categories_delete" on public.categories for delete to authenticated using (public.is_admin());

create policy "subcategories_select" on public.subcategories for select to authenticated using (true);
create policy "subcategories_write" on public.subcategories for insert to authenticated with check (public.is_admin());
create policy "subcategories_update" on public.subcategories for update to authenticated using (public.is_admin());
create policy "subcategories_delete" on public.subcategories for delete to authenticated using (public.is_admin());

-- =========================================================
-- tickets
-- =========================================================
alter table public.tickets enable row level security;

create policy "tickets_select" on public.tickets for select to authenticated using (
  public.is_admin()
  or requester_id = auth.uid()
  or assigned_agent_id = auth.uid()
  or (public.current_role() = 'agent' and department_id = public.current_department_id())
  or (public.current_role() = 'user' and company_id is not null and company_id = public.current_company_id())
);

create policy "tickets_insert" on public.tickets for insert to authenticated with check (
  requester_id = auth.uid() or public.is_agent_or_admin()
);

-- Actualización de campos operativos reservada a personal (admin/agente).
-- Acciones del usuario final (cerrar, reabrir, calificar) se expondrán
-- en Fase 2 mediante funciones RPC controladas, no por UPDATE directo.
create policy "tickets_update_staff" on public.tickets for update to authenticated using (
  public.is_admin()
  or assigned_agent_id = auth.uid()
  or (public.current_role() = 'agent' and department_id = public.current_department_id())
);

-- =========================================================
-- ticket_comments
-- =========================================================
alter table public.ticket_comments enable row level security;

create policy "comments_select" on public.ticket_comments for select to authenticated using (
  (is_internal = false or public.is_agent_or_admin())
  and exists (
    select 1 from public.tickets t where t.id = ticket_comments.ticket_id and (
      public.is_admin() or t.requester_id = auth.uid() or t.assigned_agent_id = auth.uid()
      or (public.current_role() = 'agent' and t.department_id = public.current_department_id())
    )
  )
);

create policy "comments_insert" on public.ticket_comments for insert to authenticated with check (
  author_id = auth.uid()
  and (is_internal = false or public.is_agent_or_admin())
  and exists (
    select 1 from public.tickets t where t.id = ticket_comments.ticket_id and (
      public.is_admin() or t.requester_id = auth.uid() or t.assigned_agent_id = auth.uid()
      or (public.current_role() = 'agent' and t.department_id = public.current_department_id())
    )
  )
);

-- =========================================================
-- ticket_attachments
-- =========================================================
alter table public.ticket_attachments enable row level security;

create policy "attachments_select" on public.ticket_attachments for select to authenticated using (
  exists (
    select 1 from public.tickets t where t.id = ticket_attachments.ticket_id and (
      public.is_admin() or t.requester_id = auth.uid() or t.assigned_agent_id = auth.uid()
      or (public.current_role() = 'agent' and t.department_id = public.current_department_id())
    )
  )
);

create policy "attachments_insert" on public.ticket_attachments for insert to authenticated with check (
  uploaded_by = auth.uid()
  and exists (
    select 1 from public.tickets t where t.id = ticket_attachments.ticket_id and (
      public.is_admin() or t.requester_id = auth.uid() or t.assigned_agent_id = auth.uid()
      or (public.current_role() = 'agent' and t.department_id = public.current_department_id())
    )
  )
);

-- =========================================================
-- ticket_history (solo lectura para participantes; la escritura
-- ocurre únicamente vía el trigger log_ticket_changes, que corre
-- con security definer y por tanto no requiere policy de insert)
-- =========================================================
alter table public.ticket_history enable row level security;

create policy "history_select" on public.ticket_history for select to authenticated using (
  exists (
    select 1 from public.tickets t where t.id = ticket_history.ticket_id and (
      public.is_admin() or t.requester_id = auth.uid() or t.assigned_agent_id = auth.uid()
      or (public.current_role() = 'agent' and t.department_id = public.current_department_id())
    )
  )
);
;
