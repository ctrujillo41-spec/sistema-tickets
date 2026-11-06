
insert into public.departments (name) values
  ('TI'), ('Recursos Humanos'), ('Compras'), ('Finanzas'), ('Ventas')
on conflict (name) do nothing;

insert into public.categories (name, company_id) values
  ('TI', null), ('Recursos Humanos', null), ('Compras', null), ('Finanzas', null),
  ('Contabilidad', null), ('Nómina', null), ('Ventas', null), ('Soporte Web', null),
  ('Aplicaciones', null), ('Infraestructura', null), ('Redes', null), ('Servidores', null),
  ('Impresoras', null), ('Correo', null), ('Telefonía', null), ('Seguridad', null), ('Otras', null)
on conflict do nothing;
;
