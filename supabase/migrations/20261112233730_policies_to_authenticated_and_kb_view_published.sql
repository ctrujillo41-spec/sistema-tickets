-- Tarea 2.7 (S-14): las politicas de equipos, proyectos, dominios y catalogos aplicaban al rol
-- "public" (incluye anon). Pasan a "authenticated"; las condiciones no cambian.
-- Reversion: alter policy <nombre> on <tabla> to public; para cada una.
alter policy dominios_delete on public.dominios to authenticated;
alter policy dominios_insert on public.dominios to authenticated;
alter policy dominios_select on public.dominios to authenticated;
alter policy dominios_update on public.dominios to authenticated;
alter policy equipo_bitacora_delete on public.equipo_bitacora to authenticated;
alter policy equipo_bitacora_insert on public.equipo_bitacora to authenticated;
alter policy equipo_bitacora_select on public.equipo_bitacora to authenticated;
alter policy equipo_bitacora_update on public.equipo_bitacora to authenticated;
alter policy equipo_categorias_delete on public.equipo_categorias to authenticated;
alter policy equipo_categorias_select on public.equipo_categorias to authenticated;
alter policy equipo_categorias_update on public.equipo_categorias to authenticated;
alter policy equipo_categorias_write on public.equipo_categorias to authenticated;
alter policy equipos_delete on public.equipos to authenticated;
alter policy equipos_insert on public.equipos to authenticated;
alter policy equipos_select on public.equipos to authenticated;
alter policy equipos_update on public.equipos to authenticated;
alter policy proyecto_categorias_delete on public.proyecto_categorias to authenticated;
alter policy proyecto_categorias_select on public.proyecto_categorias to authenticated;
alter policy proyecto_categorias_update on public.proyecto_categorias to authenticated;
alter policy proyecto_categorias_write on public.proyecto_categorias to authenticated;
alter policy proyecto_tiempos_delete on public.proyecto_tiempos to authenticated;
alter policy proyecto_tiempos_insert on public.proyecto_tiempos to authenticated;
alter policy proyecto_tiempos_select on public.proyecto_tiempos to authenticated;
alter policy proyecto_tiempos_update on public.proyecto_tiempos to authenticated;
alter policy proyectos_delete on public.proyectos to authenticated;
alter policy proyectos_insert on public.proyectos to authenticated;
alter policy proyectos_select on public.proyectos to authenticated;
alter policy proyectos_update on public.proyectos to authenticated;

-- Solo cuenta vistas de articulos publicados.
create or replace function public.increment_kb_view(p_article_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $f$
begin
  update public.kb_articles
  set view_count = view_count + 1
  where id = p_article_id and is_published = true;
end
$f$;;
