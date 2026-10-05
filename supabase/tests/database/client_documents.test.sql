-- F7: carta de cierre y notas para el cliente. Matriz de permisos (docs/03-modelo-de-datos.md,
-- sección 5). Solo datos inventados; todo se deshace.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- Asesora A con un perfil con dueño (Cliente Uno, COP); asesor B con su propio cliente.
insert into auth.users (id, email, aud, role) values
  ('11111111-1111-4111-8111-111111111111', 'asesora.a@example.com', 'authenticated', 'authenticated'),
  ('22222222-2222-4222-8222-222222222222', 'asesor.b@example.com', 'authenticated', 'authenticated'),
  ('33333333-3333-4333-8333-333333333333', 'cliente.uno@example.com', 'authenticated', 'authenticated'),
  ('44444444-4444-4444-8444-444444444444', 'cliente.tres@example.com', 'authenticated', 'authenticated');
insert into public.advisors (id, user_id, display_name) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Asesora A'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'Asesor B');
insert into public.clients (id, owner_user_id, display_name, country_code, base_currency, created_by) values
  ('c1c1c1c1-0000-4000-8000-000000000001', '33333333-3333-4333-8333-333333333333', 'Cliente Uno', 'CO', 'COP',
   '11111111-1111-4111-8111-111111111111'),
  ('c3c3c3c3-0000-4000-8000-000000000003', '44444444-4444-4444-8444-444444444444', 'Cliente Tres', 'CO', 'COP',
   '22222222-2222-4222-8222-222222222222');
insert into public.advisor_client_access (advisor_id, client_id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'c1c1c1c1-0000-4000-8000-000000000001'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'c3c3c3c3-0000-4000-8000-000000000003');


select ok((select relrowsecurity from pg_class where oid = 'public.client_documents'::regclass),
  'Los documentos tienen RLS');

set local role anon;
select throws_ok('select * from public.client_documents', '42501', null, 'anon no lee documentos');
reset role;

-- Asesora A ------------------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
set local role authenticated;

select lives_ok(
  $$insert into public.client_documents (client_id, kind, content) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'carta', '{"opening": "Hola", "today": "Sobrante {{sobrante_anual}}"}'),
    ('c1c1c1c1-0000-4000-8000-000000000001', 'notas', '{"body": "Primer borrador"}')$$,
  'La asesora escribe la carta y las notas');
select throws_ok(
  $$insert into public.client_documents (client_id, kind, content) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'carta', '{}')$$,
  '23505', null, 'Una carta por cliente');
select throws_ok(
  $$update public.client_documents set status = 'publicado' where kind = 'carta'$$,
  '23514', null, 'La carta no se publica sola: llega con el plan entregado');
select throws_ok(
  $$update public.client_documents set content = '[]' where kind = 'notas'$$,
  '23514', null, 'El contenido es un objeto con el texto de cada sección');
select is((select published_at from public.client_documents where kind = 'notas'), null,
  'Las notas en borrador no tienen fecha de publicación');

-- Cliente Uno: no ve borradores ----------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333"}', true);
select is((select count(*)::int from public.client_documents), 0, 'El cliente no ve los borradores');

select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
select lives_ok(
  $$update public.client_documents set status = 'publicado' where kind = 'notas'$$,
  'La asesora publica las notas');
select ok((select published_at is not null from public.client_documents where kind = 'notas'),
  'La base pone la fecha de publicación');

select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333"}', true);
select is((select kind from public.client_documents), 'notas', 'El cliente ve solo las notas publicadas');
update public.client_documents set content = '{"body": "Cambiado por el cliente"}' where kind = 'notas';
select is((select content ->> 'body' from public.client_documents), 'Primer borrador',
  'El cliente no cambia las notas');
select throws_ok(
  $$insert into public.client_documents (client_id, kind, content) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'notas', '{}')$$,
  '42501', null, 'Ni escribe documentos');

select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
select lives_ok(
  $$update public.client_documents set status = 'borrador' where kind = 'notas'$$,
  'La asesora deja de mostrar las notas');
select is((select published_at from public.client_documents where kind = 'notas'), null,
  'Y se borra la fecha de publicación');

-- Asesor B sin acceso --------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222"}', true);
select is((select count(*)::int from public.client_documents
  where client_id = 'c1c1c1c1-0000-4000-8000-000000000001'), 0, 'Un asesor sin acceso no ve los documentos');
select throws_ok(
  $$insert into public.client_documents (client_id, kind, content) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'notas', '{}')$$,
  '42501', null, 'Ni los escribe');

reset role;
select * from finish();
rollback;
