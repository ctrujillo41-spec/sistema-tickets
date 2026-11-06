-- A petición del admin: los usuarios finales (role='user') solo deben ver
-- SUS PROPIOS tickets, no todos los de su empresa. La policy original
-- (de una fase anterior) tenía una cláusula extra que dejaba ver a
-- cualquier usuario todos los tickets de su misma company_id -- eso se
-- quita. Admins, agentes (de su propio departamento) y quien creó o tiene
-- asignado el ticket siguen viéndolo igual que antes.

drop policy if exists tickets_select on public.tickets;
create policy tickets_select
  on public.tickets
  for select
  to authenticated
  using (
    private.is_admin()
    or requester_id = (select auth.uid())
    or assigned_agent_id = (select auth.uid())
    or (private.current_role() = 'agent' and department_id = private.current_department_id())
  );;
