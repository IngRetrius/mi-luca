-- Identidad, acceso e invitaciones: criterios pgTAP de F1 (docs/06-plan-de-trabajo.md) y matriz de
-- permisos (docs/03-modelo-de-datos.md, sección 5). Solo datos inventados; todo se deshace al final.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- Usuarios: asesora A, asesor B sin acceso, dos clientes y una cuenta sin invitación.
insert into auth.users (id, email, aud, role) values
  ('11111111-1111-4111-8111-111111111111', 'asesora.a@example.com', 'authenticated', 'authenticated'),
  ('22222222-2222-4222-8222-222222222222', 'asesor.b@example.com', 'authenticated', 'authenticated'),
  ('33333333-3333-4333-8333-333333333333', 'cliente.uno@example.com', 'authenticated', 'authenticated'),
  ('44444444-4444-4444-8444-444444444444', 'cliente.dos@example.com', 'authenticated', 'authenticated'),
  ('55555555-5555-4555-8555-555555555555', 'sin.invitacion@example.com', 'authenticated', 'authenticated');
insert into public.advisors (id, user_id, display_name) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Asesora A'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'Asesor B');
insert into public.clients (id, display_name, country_code, base_currency, created_by) values
  ('c1c1c1c1-0000-4000-8000-000000000001', 'Cliente Uno', 'CO', 'COP', '11111111-1111-4111-8111-111111111111'),
  ('c2c2c2c2-0000-4000-8000-000000000002', 'Cliente Dos', 'ES', 'EUR', '11111111-1111-4111-8111-111111111111');
insert into public.advisor_client_access (advisor_id, client_id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'c1c1c1c1-0000-4000-8000-000000000001'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'c2c2c2c2-0000-4000-8000-000000000002');
insert into public.invitations (client_id, advisor_id, email, token_hash) values
  ('c1c1c1c1-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'cliente.uno@example.com', sha256(convert_to('token-uno', 'UTF8'))),
  ('c2c2c2c2-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   null, sha256(convert_to('token-dos', 'UTF8')));
insert into public.invitations (client_id, advisor_id, token_hash, expires_at, created_at) values
  ('c2c2c2c2-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   sha256(convert_to('token-vencido', 'UTF8')), now() - interval '1 day', now() - interval '8 days');
-- Textos de tratamiento de datos vigentes: aceptar exige el del país (invitation_consent.test.sql).
insert into public.legal_texts (id, kind, country_code, version, title, body_markdown) values
  ('d0d0d0d0-0000-4000-8000-0000000000c0', 'tratamiento_datos', 'CO', '1', 'Tratamiento CO', 'Texto CO'),
  ('d0d0d0d0-0000-4000-8000-0000000000e0', 'tratamiento_datos', 'ES', '1', 'Tratamiento ES', 'Texto ES');

-- Estructura ----------------------------------------------------------------------------------

select is(
  (select count(*)::int from pg_tables where schemaname = 'public' and not rowsecurity), 0,
  'Todas las tablas de public tienen RLS');
select results_eq('select code::text from public.countries order by code', array['CO', 'ES'],
  'Colombia y España están en el catálogo');

-- Visitante sin sesión -------------------------------------------------------------------------

set local role anon;
select throws_ok('select * from public.clients', '42501', null, 'anon no lee clientes');
select throws_ok('select * from public.invitations', '42501', null, 'anon no lee invitaciones');
select throws_ok('select * from public.audit_log', '42501', null, 'anon no lee el historial');
select throws_ok($$select public.accept_invitation('token-uno')$$, '42501', null,
  'anon no acepta invitaciones');
reset role;

-- Asesora A ------------------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
set local role authenticated;

select is((select count(*)::int from public.clients), 2, 'La asesora ve a sus dos clientes');
select isnt(public.create_client('Perfil nuevo', 'CO'), null, 'La asesora crea un perfil');
select is((select base_currency::text from public.clients where display_name = 'Perfil nuevo'), 'COP',
  'La moneda base sale del país');
select is((select status from public.clients where display_name = 'Perfil nuevo'), 'borrador',
  'El perfil nuevo empieza en borrador');
select is(
  (select x.status from public.advisor_client_access x
   join public.clients c on c.id = x.client_id where c.display_name = 'Perfil nuevo'), 'active',
  'Crear el perfil da acceso a quien lo crea');
select throws_ok($$select public.create_client('Otro', 'XX')$$, '22023', null,
  'Un país que no existe se rechaza');

select lives_ok(
  $$insert into public.invitations (client_id, token_hash)
    select id, sha256(convert_to('token-tres', 'UTF8')) from public.clients where display_name = 'Perfil nuevo'$$,
  'La asesora invita al perfil nuevo');
select is((select status from public.clients where display_name = 'Perfil nuevo'), 'invitado',
  'Invitar marca el perfil como invitado');
select is(
  (select i.advisor_id from public.invitations i join public.clients c on c.id = i.client_id
   where c.display_name = 'Perfil nuevo'), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
  'La invitación queda a nombre de quien invita');
select throws_ok(
  $$insert into public.invitations (client_id, advisor_id, token_hash) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
     sha256(convert_to('x', 'UTF8')))$$,
  '42501', null, 'La asesora no invita a nombre de otro asesor');
select throws_ok(
  $$insert into public.advisor_client_access (advisor_id, client_id) values
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'c1c1c1c1-0000-4000-8000-000000000001')$$,
  '42501', null, 'Nadie crea filas de acceso desde la API');
select throws_ok(
  $$update public.clients set status = 'activo' where id = 'c1c1c1c1-0000-4000-8000-000000000001'$$,
  '42501', null, 'El estado del perfil no se cambia desde la API');
reset role;

-- Asesor B, sin acceso -------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222"}', true);
set local role authenticated;

select is((select count(*)::int from public.clients), 0, 'Un asesor sin acceso no ve clientes');
select is((select count(*)::int from public.invitations), 0, 'Un asesor sin acceso no ve invitaciones');
select is((select count(*)::int from public.audit_log), 0, 'Un asesor sin acceso no ve el historial');
update public.clients set display_name = 'Cambio ajeno' where id = 'c1c1c1c1-0000-4000-8000-000000000001';
select throws_ok(
  $$insert into public.invitations (client_id, token_hash) values
    ('c1c1c1c1-0000-4000-8000-000000000001', sha256(convert_to('y', 'UTF8')))$$,
  '42501', null, 'Un asesor sin acceso no invita');
reset role;

select is(
  (select display_name from public.clients where id = 'c1c1c1c1-0000-4000-8000-000000000001'), 'Cliente Uno',
  'Un asesor sin acceso no cambia el perfil');

-- Cuenta sin invitación ------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"55555555-5555-4555-8555-555555555555"}', true);
set local role authenticated;

select is((select count(*)::int from public.clients), 0, 'Sin invitación no se ve ningún perfil');
select is((select count(*)::int from public.advisors), 0, 'Sin invitación no se ve ningún asesor');
select is((select count(*)::int from public.advisor_client_access), 0, 'Sin invitación no se ve ningún acceso');
select throws_ok($$select public.accept_invitation('token-inventado')$$, '22023', null,
  'Un token que no existe se rechaza');
select throws_ok($$select public.create_client('Intento', 'CO')$$, '42501', null,
  'Quien no es asesor no crea perfiles');
reset role;

-- Aceptar invitaciones -------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333"}', true);
set local role authenticated;
select is(public.accept_invitation('token-uno', '{d0d0d0d0-0000-4000-8000-0000000000c0}'),
  'c1c1c1c1-0000-4000-8000-000000000001'::uuid,
  'El cliente uno acepta su invitación');
select throws_ok($$select public.accept_invitation('token-dos')$$, '23505', null,
  'Una cuenta vinculada no acepta otra invitación');
reset role;

select is(
  (select owner_user_id from public.clients where id = 'c1c1c1c1-0000-4000-8000-000000000001'),
  '33333333-3333-4333-8333-333333333333'::uuid, 'Aceptar vincula la cuenta al perfil');
select is((select status from public.clients where id = 'c1c1c1c1-0000-4000-8000-000000000001'), 'activo',
  'Aceptar activa el perfil');
select is(
  (select email from public.invitations where token_hash = sha256(convert_to('token-uno', 'UTF8'))), null,
  'Aceptar borra el correo de la invitación');

select set_config('request.jwt.claims', '{"sub":"55555555-5555-4555-8555-555555555555"}', true);
set local role authenticated;
select throws_ok($$select public.accept_invitation('token-uno')$$, '22023', null,
  'Un token usado no sirve otra vez');
reset role;

select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
set local role authenticated;
select throws_ok($$select public.accept_invitation('token-dos')$$, '42501', null,
  'Una cuenta de asesor no acepta invitaciones de cliente');
select lives_ok(
  $$update public.invitations set revoked_at = now()
    where token_hash = sha256(convert_to('token-dos', 'UTF8'))$$,
  'La asesora revoca una invitación');
select throws_ok(
  $$update public.invitations set revoked_at = null
    where token_hash = sha256(convert_to('token-dos', 'UTF8'))$$,
  '22023', null, 'Una invitación revocada no se reactiva');
select lives_ok(
  $$insert into public.invitations (client_id, token_hash) values
    ('c2c2c2c2-0000-4000-8000-000000000002', sha256(convert_to('token-dos-b', 'UTF8')))$$,
  'La asesora vuelve a invitar');
reset role;

select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-8444-444444444444"}', true);
set local role authenticated;
select throws_ok($$select public.accept_invitation('token-dos')$$, '22023', null,
  'Una invitación revocada no sirve');
select throws_ok($$select public.accept_invitation('token-vencido')$$, '22023', null,
  'Una invitación vencida no sirve');
select is(public.accept_invitation('token-dos-b', '{d0d0d0d0-0000-4000-8000-0000000000e0}'),
  'c2c2c2c2-0000-4000-8000-000000000002'::uuid,
  'El cliente dos acepta la invitación nueva');
reset role;

select is(
  (select count(*)::int from public.invitations
   where client_id = 'c2c2c2c2-0000-4000-8000-000000000002' and accepted_at is null and revoked_at is null),
  0, 'Al aceptar no quedan invitaciones abiertas para ese perfil');

select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
set local role authenticated;
select throws_ok(
  $$insert into public.invitations (client_id, token_hash) values
    ('c1c1c1c1-0000-4000-8000-000000000001', sha256(convert_to('z', 'UTF8')))$$,
  '42501', null, 'Un perfil con dueño no se vuelve a invitar');
reset role;

-- Aislamiento entre clientes -------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333"}', true);
set local role authenticated;
select results_eq('select id from public.clients', array['c1c1c1c1-0000-4000-8000-000000000001'::uuid],
  'El cliente uno solo ve su perfil');
select is((select count(*)::int from public.invitations), 0, 'El cliente no ve invitaciones');
select results_eq('select display_name from public.advisors', array['Asesora A'],
  'El cliente ve el nombre de su asesora y de nadie más');
select is((select count(*)::int from public.advisor_client_access), 1, 'El cliente ve el acceso de su asesora');
update public.clients set birth_date = '1990-01-01' where id = 'c2c2c2c2-0000-4000-8000-000000000002';
select is((select count(*)::int from public.audit_log where client_id = 'c2c2c2c2-0000-4000-8000-000000000002'),
  0, 'El cliente uno no ve el historial del cliente dos');
reset role;

select is(
  (select birth_date from public.clients where id = 'c2c2c2c2-0000-4000-8000-000000000002'), null,
  'El cliente uno no cambia el perfil del cliente dos');

-- Columnas que cambia el cliente ---------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333"}', true);
set local role authenticated;
select lives_ok(
  $$update public.clients set birth_date = '1990-05-17', sex = 'mujer', dependents_count = 1
    where id = 'c1c1c1c1-0000-4000-8000-000000000001'$$,
  'El cliente cambia sus datos de hecho');
select throws_ok(
  $$update public.clients set display_name = 'Otro nombre' where id = 'c1c1c1c1-0000-4000-8000-000000000001'$$,
  '42501', 'El campo display_name solo lo puede cambiar el asesor', 'El cliente no cambia su nombre visible');
select throws_ok(
  $$update public.clients set client_type = 'empleado' where id = 'c1c1c1c1-0000-4000-8000-000000000001'$$,
  '42501', null, 'El cliente no cambia su tipo de cliente (criterio profesional)');
select throws_ok(
  $$update public.clients set base_currency = 'USD' where id = 'c1c1c1c1-0000-4000-8000-000000000001'$$,
  '42501', null, 'El cliente no cambia su moneda base');
select throws_ok(
  $$update public.clients set owner_user_id = null where id = 'c1c1c1c1-0000-4000-8000-000000000001'$$,
  '42501', null, 'Nadie cambia el dueño desde la API');
delete from public.clients where id = 'c1c1c1c1-0000-4000-8000-000000000001';
select is((select count(*)::int from public.clients), 1, 'El cliente no borra su perfil desde la API');
select throws_ok(
  $$insert into public.audit_log (table_name, row_pk, action) values ('x', '{}', 'insert')$$,
  '42501', null, 'Nadie escribe el historial desde la API');
reset role;

select is(
  (select dependents_count::int from public.clients where id = 'c1c1c1c1-0000-4000-8000-000000000001'), 1,
  'El cambio del cliente quedó guardado');

-- Historial ------------------------------------------------------------------------------------

select is(
  (select actor_role from public.audit_log
   where table_name = 'clients' and actor_user_id = '33333333-3333-4333-8333-333333333333'
     and 'birth_date' = any (changed_cols)),
  'cliente', 'El cambio del cliente deja una fila con su rol');
select is(
  (select old_values ->> 'dependents_count' from public.audit_log
   where table_name = 'clients' and actor_user_id = '33333333-3333-4333-8333-333333333333'
     and 'birth_date' = any (changed_cols)),
  '0', 'El historial guarda el valor anterior');
select is(
  (select count(*)::int from public.audit_log
   where table_name = 'invitations'
     and (old_values ? 'email' or new_values ? 'email' or old_values ? 'token_hash' or new_values ? 'token_hash')),
  0, 'El historial no copia el correo ni el hash del token');
select is(
  (select count(*)::int from public.audit_log where changed_cols = array['updated_at']), 0,
  'El historial ignora updated_at');

select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333"}', true);
set local role authenticated;
select ok((select count(*) from public.audit_log where client_id = 'c1c1c1c1-0000-4000-8000-000000000001') > 0,
  'El cliente ve el historial de su perfil');
reset role;

-- Revocar y restablecer el acceso --------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
set local role authenticated;
update public.advisor_client_access set status = 'revoked'
  where client_id = 'c1c1c1c1-0000-4000-8000-000000000001';
select is(
  (select status from public.advisor_client_access where client_id = 'c1c1c1c1-0000-4000-8000-000000000001'),
  'active', 'La asesora no se revoca ni se restablece el acceso');
reset role;

select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333"}', true);
set local role authenticated;
select lives_ok(
  $$update public.advisor_client_access set status = 'revoked'
    where client_id = 'c1c1c1c1-0000-4000-8000-000000000001'$$,
  'El cliente revoca el acceso de su asesora');
reset role;

select is(
  (select revoked_by from public.advisor_client_access where client_id = 'c1c1c1c1-0000-4000-8000-000000000001'),
  '33333333-3333-4333-8333-333333333333'::uuid, 'La revocación guarda quién la hizo');

select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
set local role authenticated;
select is((select count(*)::int from public.clients where id = 'c1c1c1c1-0000-4000-8000-000000000001'), 0,
  'Tras la revocación, la asesora pierde el perfil en la siguiente consulta');
select is((select count(*)::int from public.audit_log where client_id = 'c1c1c1c1-0000-4000-8000-000000000001'), 0,
  'Tras la revocación, la asesora pierde el historial');
update public.clients set display_name = 'Sin acceso' where id = 'c1c1c1c1-0000-4000-8000-000000000001';
reset role;

select is(
  (select display_name from public.clients where id = 'c1c1c1c1-0000-4000-8000-000000000001'), 'Cliente Uno',
  'Tras la revocación, la asesora no cambia el perfil');

select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333"}', true);
set local role authenticated;
update public.advisor_client_access set status = 'active'
  where client_id = 'c1c1c1c1-0000-4000-8000-000000000001';
reset role;

select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
set local role authenticated;
select is((select count(*)::int from public.clients where id = 'c1c1c1c1-0000-4000-8000-000000000001'), 1,
  'Al restablecer, la asesora vuelve a ver el perfil');
select lives_ok(
  $$update public.clients set display_name = 'Cliente Uno Editado' where id = 'c1c1c1c1-0000-4000-8000-000000000001'$$,
  'La asesora cambia el nombre visible');

-- Borrar perfiles ------------------------------------------------------------------------------

delete from public.clients where id = 'c1c1c1c1-0000-4000-8000-000000000001';
delete from public.clients where display_name = 'Perfil nuevo';
reset role;

select is((select count(*)::int from public.clients where id = 'c1c1c1c1-0000-4000-8000-000000000001'), 1,
  'La asesora no borra un perfil que ya tiene dueño');
select is((select count(*)::int from public.clients where display_name = 'Perfil nuevo'), 0,
  'La asesora borra un perfil que nadie aceptó');

select * from finish();
rollback;
