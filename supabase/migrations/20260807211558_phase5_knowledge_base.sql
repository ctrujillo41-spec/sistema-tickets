create table public.kb_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  category_id uuid references public.categories(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  is_published boolean not null default true,
  view_count integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    to_tsvector('spanish', coalesce(title, '') || ' ' || coalesce(body, ''))
  ) stored
);

create index kb_articles_search_idx on public.kb_articles using gin (search_vector);
create index kb_articles_category_idx on public.kb_articles (category_id);
create index kb_articles_company_idx on public.kb_articles (company_id);
create index kb_articles_created_by_idx on public.kb_articles (created_by);

alter table public.kb_articles enable row level security;

create trigger trg_kb_articles_updated_at
before update on public.kb_articles
for each row execute function set_updated_at();

-- Lectura: cualquier autenticado ve los publicados; staff ve todo (incluye borradores)
create policy kb_articles_select on public.kb_articles
  for select to authenticated
  using (is_published = true or private.is_agent_or_admin());

-- Escritura: solo admin/agente
create policy kb_articles_write on public.kb_articles
  for all to authenticated
  using (private.is_agent_or_admin())
  with check (private.is_agent_or_admin());

-- Conteo de vistas: cualquier autenticado puede incrementar, sin poder
-- editar el resto del artículo (bypassa la política de escritura solo para este campo).
create or replace function public.increment_kb_view(p_article_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.kb_articles set view_count = view_count + 1 where id = p_article_id;
end;
$$;

revoke execute on function public.increment_kb_view(uuid) from public, anon;
grant execute on function public.increment_kb_view(uuid) to authenticated;;
