drop policy if exists kb_articles_write on public.kb_articles;

create policy kb_articles_insert on public.kb_articles
  for insert to authenticated
  with check (private.is_agent_or_admin());

create policy kb_articles_update on public.kb_articles
  for update to authenticated
  using (private.is_agent_or_admin())
  with check (private.is_agent_or_admin());

create policy kb_articles_delete on public.kb_articles
  for delete to authenticated
  using (private.is_agent_or_admin());;
