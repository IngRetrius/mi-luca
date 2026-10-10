-- Documentos del cliente (migración client_files, ADR 0030): el cliente sube a la carpeta de su
-- perfil y registra lo subido; él y su asesor lo ven y lo borran; nadie más. Los archivos se
-- simulan con filas de storage.objects. Solo datos inventados; todo se deshace al final.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (id, email, aud, role) values
  ('11111111-1111-4111-8111-111111111111', 'asesora.a@example.com', 'authenticated', 'authenticated'),
  ('22222222-2222-4222-8222-222222222222', 'asesor.b@example.com', 'authenticated', 'authenticated'),
  ('33333333-3333-4333-8333-333333333333', 'cliente.uno@example.com', 'authenticated', 'authenticated'),
  ('44444444-4444-4444-8444-444444444444', 'cliente.dos@example.com', 'authenticated', 'authenticated');
insert into public.advisors (id, user_id, display_name) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Asesora A'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'Asesor B');
insert into public.clients (id, owner_user_id, display_name, country_code, base_currency, created_by) values
  ('c1c1c1c1-0000-4000-8000-000000000001', '33333333-3333-4333-8333-333333333333', 'Cliente Uno', 'CO', 'COP',
   '11111111-1111-4111-8111-111111111111'),
  ('c2c2c2c2-0000-4000-8000-000000000002', '44444444-4444-4444-8444-444444444444', 'Cliente Dos', 'CO', 'COP',
   '11111111-1111-4111-8111-111111111111');
insert into public.advisor_client_access (advisor_id, client_id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'c1c1c1c1-0000-4000-8000-000000000001');

select is((select public from storage.buckets where id = 'client-files'), false, 'El bucket es privado');
select is((select file_size_limit from storage.buckets where id = 'client-files'), 10485760::bigint,
  'Hasta 10 MB por archivo');

-- El cliente sube a su carpeta y registra lo subido
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333"}', true);
set local role authenticated;
select lives_ok(
  $$insert into storage.objects (bucket_id, name) values
    ('client-files', 'c1c1c1c1-0000-4000-8000-000000000001/f1f1f1f1-0000-4000-8000-000000000001.pdf'),
    ('client-files', 'c1c1c1c1-0000-4000-8000-000000000001/f2f2f2f2-0000-4000-8000-000000000002.jpg')$$,
  'El cliente sube a la carpeta de su perfil');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values
    ('client-files', 'c2c2c2c2-0000-4000-8000-000000000002/f3f3f3f3-0000-4000-8000-000000000003.pdf')$$,
  '42501', null, 'No sube a la carpeta de otro cliente');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values
    ('client-files', 'c1c1c1c1-0000-4000-8000-000000000001/extracto 4589.pdf')$$,
  '42501', null, 'Ni con otro nombre de archivo');
select lives_ok(
  $$insert into public.client_files (id, client_id, kind, mime_type, size_bytes, storage_path) values
    ('f1f1f1f1-0000-4000-8000-000000000001', 'c1c1c1c1-0000-4000-8000-000000000001', 'tarjeta',
     'application/pdf', 250000,
     'c1c1c1c1-0000-4000-8000-000000000001/f1f1f1f1-0000-4000-8000-000000000001.pdf'),
    ('f2f2f2f2-0000-4000-8000-000000000002', 'c1c1c1c1-0000-4000-8000-000000000001', 'ingresos',
     'image/jpeg', 1800000,
     'c1c1c1c1-0000-4000-8000-000000000001/f2f2f2f2-0000-4000-8000-000000000002.jpg')$$,
  'El cliente registra lo que subió');
select is(
  (select array_agg(uploaded_by order by kind) from public.client_files),
  array['33333333-3333-4333-8333-333333333333', '33333333-3333-4333-8333-333333333333']::uuid[],
  'La base pone quién lo subió');
select ok(
  (select bool_and(expires_at = uploaded_at + interval '30 days') from public.client_files),
  'Y el vencimiento a los 30 días');
select throws_ok(
  $$insert into public.client_files (id, client_id, kind, mime_type, size_bytes, storage_path) values
    ('f4f4f4f4-0000-4000-8000-000000000004', 'c1c1c1c1-0000-4000-8000-000000000001', 'otro',
     'application/pdf', 1000,
     'c1c1c1c1-0000-4000-8000-000000000001/f1f1f1f1-0000-4000-8000-000000000001.pdf')$$,
  '23514', null, 'La ruta tiene que ser la del id de la fila');
select throws_ok(
  $$insert into public.client_files (id, client_id, kind, mime_type, size_bytes, storage_path) values
    ('f5f5f5f5-0000-4000-8000-000000000005', 'c1c1c1c1-0000-4000-8000-000000000001', 'otro',
     'text/html', 1000,
     'c1c1c1c1-0000-4000-8000-000000000001/f5f5f5f5-0000-4000-8000-000000000005.png')$$,
  '23514', null, 'Solo PDF, JPG o PNG');

-- Otro cliente no ve ni registra nada del primero
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-8444-444444444444"}', true);
select is((select count(*)::int from public.client_files), 0, 'Otro cliente no ve los documentos');
select is((select count(*)::int from storage.objects where bucket_id = 'client-files'), 0,
  'Ni los archivos');
select throws_ok(
  $$insert into public.client_files (id, client_id, kind, mime_type, size_bytes, storage_path) values
    ('f6f6f6f6-0000-4000-8000-000000000006', 'c1c1c1c1-0000-4000-8000-000000000001', 'otro',
     'application/pdf', 1000,
     'c1c1c1c1-0000-4000-8000-000000000001/f6f6f6f6-0000-4000-8000-000000000006.pdf')$$,
  '42501', null, 'Ni registra documentos a nombre del primero');

-- La asesora con acceso los ve y recibe un solo aviso
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
select is((select count(*)::int from public.client_files), 2, 'La asesora con acceso ve los documentos');
select is((select count(*)::int from storage.objects where bucket_id = 'client-files'), 2,
  'Y los archivos');
select is(
  (select count(*)::int from public.notifications where kind = 'documentos_subidos'), 1,
  'Recibe un solo aviso aunque se suban dos');
select throws_ok(
  $$update public.client_files set deleted_reason = 'cliente'
    where id = 'f1f1f1f1-0000-4000-8000-000000000001'$$,
  '42501', null, 'La asesora no borra a nombre del cliente');
select lives_ok(
  $$update public.client_files set deleted_reason = 'revisado'
    where id = 'f1f1f1f1-0000-4000-8000-000000000001'$$,
  'La asesora marca el documento como revisado');
select isnt(
  (select deleted_at from public.client_files where id = 'f1f1f1f1-0000-4000-8000-000000000001'),
  null, 'Y la base pone la fecha del borrado');
select throws_ok(
  $$update public.client_files set deleted_reason = null
    where id = 'f1f1f1f1-0000-4000-8000-000000000001'$$,
  '55000', null, 'Un documento borrado no vuelve');
select throws_ok(
  $$update public.client_files set kind = 'otro' where id = 'f2f2f2f2-0000-4000-8000-000000000002'$$,
  '42501', null, 'Nada más se cambia');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values
    ('client-files', 'c1c1c1c1-0000-4000-8000-000000000001/f7f7f7f7-0000-4000-8000-000000000007.pdf')$$,
  '42501', null, 'La asesora no sube documentos del cliente');
set local storage.allow_delete_query = 'true';
delete from storage.objects
  where name = 'c1c1c1c1-0000-4000-8000-000000000001/f1f1f1f1-0000-4000-8000-000000000001.pdf';
select is((select count(*)::int from storage.objects where bucket_id = 'client-files'), 1,
  'La asesora borra el archivo revisado');

-- Un asesor sin acceso no ve ni borra nada
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222"}', true);
select is((select count(*)::int from public.client_files), 0, 'Un asesor sin acceso no los ve');
delete from storage.objects where bucket_id = 'client-files';
reset storage.allow_delete_query;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
select is((select count(*)::int from storage.objects where bucket_id = 'client-files'), 1,
  'Ni borra sus archivos');

-- El cliente borra el suyo; el vencimiento solo lo pone el borrado diario
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333"}', true);
select throws_ok(
  $$update public.client_files set deleted_reason = 'vencido'
    where id = 'f2f2f2f2-0000-4000-8000-000000000002'$$,
  '42501', null, 'El cliente no marca un documento como vencido');
select lives_ok(
  $$update public.client_files set deleted_reason = 'cliente'
    where id = 'f2f2f2f2-0000-4000-8000-000000000002'$$,
  'El cliente borra un documento suyo');
select throws_ok(
  $$select public.client_files_orphans()$$,
  '42501', null, 'La lista de archivos por borrar es solo para la clave secreta');

-- Más de 20 activos no
reset role;
insert into public.client_files (id, client_id, kind, mime_type, size_bytes, storage_path)
select x.id, 'c1c1c1c1-0000-4000-8000-000000000001', 'otro', 'application/pdf', 1000,
  'c1c1c1c1-0000-4000-8000-000000000001/' || x.id || '.pdf'
from (select gen_random_uuid() as id from generate_series(1, 20)) x;
select throws_ok(
  $$insert into public.client_files (id, client_id, kind, mime_type, size_bytes, storage_path) values
    ('f8f8f8f8-0000-4000-8000-000000000008', 'c1c1c1c1-0000-4000-8000-000000000001', 'otro',
     'application/pdf', 1000,
     'c1c1c1c1-0000-4000-8000-000000000001/f8f8f8f8-0000-4000-8000-000000000008.pdf')$$,
  '23514', null, 'No más de 20 documentos activos por cliente');

-- Archivos por borrar: sin fila activa y de más de una hora
update storage.objects set created_at = now() - interval '2 hours'
  where bucket_id = 'client-files' and name like 'c1c1c1c1-0000-4000-8000-000000000001/%';
select is(
  (select array_agg(n) from public.client_files_orphans() n
   where n like 'c1c1c1c1-0000-4000-8000-000000000001/%'),
  array['c1c1c1c1-0000-4000-8000-000000000001/f2f2f2f2-0000-4000-8000-000000000002.jpg'],
  'El archivo borrado por el cliente queda para el borrado diario');
-- La clave secreta llega sin usuario y con su propio rol, como el borrado diario.
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
select is(
  (select array_agg(n) from public.client_files_orphans() n
   where n like 'c1c1c1c1-0000-4000-8000-000000000001/%'),
  array['c1c1c1c1-0000-4000-8000-000000000001/f2f2f2f2-0000-4000-8000-000000000002.jpg'],
  'La clave secreta lee la lista de archivos por borrar');
select lives_ok(
  $$update public.client_files set deleted_reason = 'vencido' where deleted_at is null$$,
  'Sin sesión, el borrado diario marca los vencidos');
reset role;

-- Con archivos en Storage, el borrado del cliente se niega
select throws_ok(
  $$select private.delete_client_data('c1c1c1c1-0000-4000-8000-000000000001')$$,
  '55000', null, 'No se borra un cliente que todavía tiene archivos en Storage');
set local storage.allow_delete_query = 'true';
delete from storage.objects
  where bucket_id = 'client-files' and name like 'c1c1c1c1-0000-4000-8000-000000000001/%';
reset storage.allow_delete_query;
select lives_ok(
  $$select private.delete_client_data('c1c1c1c1-0000-4000-8000-000000000001')$$,
  'Sin archivos, el cliente se borra');
select is(
  (select count(*)::int from public.client_files
   where client_id = 'c1c1c1c1-0000-4000-8000-000000000001'),
  0, 'Y sus documentos con él');

select * from finish();
rollback;
