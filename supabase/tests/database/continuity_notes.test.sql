-- F7: datos de la ficha de continuidad. Matriz de permisos (docs/03-modelo-de-datos.md, sección 5).
-- Solo datos inventados; todo se deshace.
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

select ok((select relrowsecurity from pg_class where oid = 'public.continuity_notes'::regclass),
  'Los datos de la ficha tienen RLS');

set local role anon;
select throws_ok('select * from public.continuity_notes', '42501', null, 'anon no lee la ficha');
reset role;

-- Asesora A ------------------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
set local role authenticated;

select lives_ok(
  $$insert into public.continuity_notes (client_id, has_will, decisions) values
    ('c1c1c1c1-0000-4000-8000-000000000001', false, 'Primero el fondo de emergencia')$$,
  'La asesora escribe los datos de la ficha');
select is((select beneficiaries_reviewed from public.continuity_notes), null,
  'Sin respuesta queda sin dato, no en "no"');
select lives_ok(
  $$insert into public.continuity_notes (client_id, has_will, beneficiaries_reviewed, decisions)
    values ('c1c1c1c1-0000-4000-8000-000000000001', true, true, 'Primero el fondo de emergencia')
    on conflict (client_id) do update set has_will = excluded.has_will,
      beneficiaries_reviewed = excluded.beneficiaries_reviewed, decisions = excluded.decisions$$,
  'Y los cambia con el mismo guardado (upsert)');
select is((select has_will from public.continuity_notes), true, 'El cambio queda guardado');
select throws_ok(
  $$update public.continuity_notes set decisions = repeat('a', 4001)$$,
  '23514', null, 'Las decisiones tienen un límite de 4.000 caracteres');
select is((select updated_by from public.continuity_notes),
  '11111111-1111-4111-8111-111111111111'::uuid, 'La base pone quién cambió');

reset role;
select is((select count(*)::int from public.audit_log where table_name = 'continuity_notes'
  and client_id = 'c1c1c1c1-0000-4000-8000-000000000001'), 2,
  'Cada guardado queda en el historial');
set local role authenticated;

-- Cliente Uno: lee, no escribe -----------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333"}', true);
select is((select decisions from public.continuity_notes), 'Primero el fondo de emergencia',
  'El cliente lee sus datos de la ficha');
update public.continuity_notes set has_will = false;
select is((select has_will from public.continuity_notes), true, 'El cliente no los cambia');
select throws_ok(
  $$delete from public.continuity_notes$$,
  '42501', null, 'Ni los borra');

-- Asesor B sin acceso --------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222"}', true);
select is((select count(*)::int from public.continuity_notes
  where client_id = 'c1c1c1c1-0000-4000-8000-000000000001'), 0, 'Un asesor sin acceso no ve la ficha');
select throws_ok(
  $$insert into public.continuity_notes (client_id, decisions) values
    ('c3c3c3c3-0000-4000-8000-000000000003', 'x'),
    ('c1c1c1c1-0000-4000-8000-000000000001', 'x')$$,
  '42501', null, 'Ni la escribe');

reset role;
select * from finish();
rollback;
