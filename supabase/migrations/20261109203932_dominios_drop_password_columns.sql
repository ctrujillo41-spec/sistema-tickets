-- Tarea 1.6 (S-03): las credenciales de dominios se guardan en un gestor de contrasenas, no en la app.
-- Las columnas estaban vacias (0 de 7 registros) y el codigo ya no las usa (commit ea3042c).
alter table public.dominios
  drop column password_registrador,
  drop column password_hosting;;
