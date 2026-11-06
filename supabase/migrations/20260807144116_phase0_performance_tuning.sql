
-- Índices faltantes en llaves foráneas de uso frecuente
create index if not exists idx_categories_company on public.categories(company_id);
create index if not exists idx_profiles_company on public.profiles(company_id);
create index if not exists idx_subcategories_category on public.subcategories(category_id);
create index if not exists idx_attachments_comment on public.ticket_attachments(comment_id);
create index if not exists idx_attachments_uploaded_by on public.ticket_attachments(uploaded_by);
create index if not exists idx_comments_author on public.ticket_comments(author_id);
create index if not exists idx_history_changed_by on public.ticket_history(changed_by);
create index if not exists idx_tickets_category on public.tickets(category_id);
create index if not exists idx_tickets_subcategory on public.tickets(subcategory_id);

-- Evita reevaluar auth.uid() por fila (recomendación oficial de Supabase)
-- y consolida las dos políticas de UPDATE de "profiles" en una sola.
drop policy if exists "profiles_update_self" on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or private.is_admin())
  with check (id = (select auth.uid()) or private.is_admin());

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));

drop policy if exists "tickets_select" on public.tickets;
create policy "tickets_select" on public.tickets for select to authenticated using (
  private.is_admin()
  or requester_id = (select auth.uid())
  or assigned_agent_id = (select auth.uid())
  or (private.current_role() = 'agent' and department_id = private.current_department_id())
  or (private.current_role() = 'user' and company_id is not null and company_id = private.current_company_id())
);

drop policy if exists "tickets_insert" on public.tickets;
create policy "tickets_insert" on public.tickets for insert to authenticated with check (
  requester_id = (select auth.uid()) or private.is_agent_or_admin()
);

drop policy if exists "tickets_update_staff" on public.tickets;
create policy "tickets_update_staff" on public.tickets for update to authenticated using (
  private.is_admin()
  or assigned_agent_id = (select auth.uid())
  or (private.current_role() = 'agent' and department_id = private.current_department_id())
);

drop policy if exists "comments_select" on public.ticket_comments;
create policy "comments_select" on public.ticket_comments for select to authenticated using (
  (is_internal = false or private.is_agent_or_admin())
  and exists (
    select 1 from public.tickets t where t.id = ticket_comments.ticket_id and (
      private.is_admin() or t.requester_id = (select auth.uid()) or t.assigned_agent_id = (select auth.uid())
      or (private.current_role() = 'agent' and t.department_id = private.current_department_id())
    )
  )
);

drop policy if exists "comments_insert" on public.ticket_comments;
create policy "comments_insert" on public.ticket_comments for insert to authenticated with check (
  author_id = (select auth.uid())
  and (is_internal = false or private.is_agent_or_admin())
  and exists (
    select 1 from public.tickets t where t.id = ticket_comments.ticket_id and (
      private.is_admin() or t.requester_id = (select auth.uid()) or t.assigned_agent_id = (select auth.uid())
      or (private.current_role() = 'agent' and t.department_id = private.current_department_id())
    )
  )
);

drop policy if exists "attachments_select" on public.ticket_attachments;
create policy "attachments_select" on public.ticket_attachments for select to authenticated using (
  exists (
    select 1 from public.tickets t where t.id = ticket_attachments.ticket_id and (
      private.is_admin() or t.requester_id = (select auth.uid()) or t.assigned_agent_id = (select auth.uid())
      or (private.current_role() = 'agent' and t.department_id = private.current_department_id())
    )
  )
);

drop policy if exists "attachments_insert" on public.ticket_attachments;
create policy "attachments_insert" on public.ticket_attachments for insert to authenticated with check (
  uploaded_by = (select auth.uid())
  and exists (
    select 1 from public.tickets t where t.id = ticket_attachments.ticket_id and (
      private.is_admin() or t.requester_id = (select auth.uid()) or t.assigned_agent_id = (select auth.uid())
      or (private.current_role() = 'agent' and t.department_id = private.current_department_id())
    )
  )
);

drop policy if exists "history_select" on public.ticket_history;
create policy "history_select" on public.ticket_history for select to authenticated using (
  exists (
    select 1 from public.tickets t where t.id = ticket_history.ticket_id and (
      private.is_admin() or t.requester_id = (select auth.uid()) or t.assigned_agent_id = (select auth.uid())
      or (private.current_role() = 'agent' and t.department_id = private.current_department_id())
    )
  )
);
;
