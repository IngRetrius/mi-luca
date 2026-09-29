-- Flujo de invitación: textos legales, consentimientos y lectura de la invitación sin sesión
-- (migración invitation_consent). Solo datos inventados; todo se deshace al final.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- Asesora, dos clientes por invitar, una cuenta de otro cliente y un país sin textos.
insert into auth.users (id, email, aud, role) values
  ('11111111-1111-4111-8111-111111111111', 'asesora@example.com', 'authenticated', 'authenticated'),
  ('33333333-3333-4333-8333-333333333333', 'cliente.co@example.com', 'authenticated', 'authenticated'),
  ('44444444-4444-4444-8444-444444444444', 'cliente.es@example.com', 'authenticated', 'authenticated'),
  ('66666666-6666-4666-8666-666666666666', 'cliente.mx@example.com', 'authenticated', 'authenticated');
insert into public.advisors (id, user_id, display_name) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Asesora Prueba');
insert into public.countries (code, name, default_currency, default_locale) values
  ('MX', 'País de prueba', 'MXN', 'es-MX');
insert into public.clients (id, display_name, form_of_address, country_code, base_currency, created_by) values
  ('c1c1c1c1-0000-4000-8000-000000000001', 'Cliente CO', 'usted', 'CO', 'COP', '11111111-1111-4111-8111-111111111111'),
  ('c2c2c2c2-0000-4000-8000-000000000002', 'Cliente ES', 'tu', 'ES', 'EUR', '11111111-1111-4111-8111-111111111111'),
  ('c3c3c3c3-0000-4000-8000-000000000003', 'Cliente MX', 'tu', 'MX', 'MXN', '11111111-1111-4111-8111-111111111111');
insert into public.advisor_client_access (advisor_id, client_id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'c1c1c1c1-0000-4000-8000-000000000001'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'c2c2c2c2-0000-4000-8000-000000000002'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'c3c3c3c3-0000-4000-8000-000000000003');
insert into public.invitations (client_id, advisor_id, email, token_hash) values
  ('c1c1c1c1-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'cliente.co@example.com', sha256(convert_to('token-co', 'UTF8'))),
  ('c2c2c2c2-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'cliente.es@example.com', sha256(convert_to('token-es', 'UTF8'))),
  ('c3c3c3c3-0000-4000-8000-000000000003', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   null, sha256(convert_to('token-mx', 'UTF8')));
insert into public.invitations (client_id, advisor_id, token_hash, expires_at, created_at) values
  ('c2c2c2c2-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   sha256(convert_to('token-vencido', 'UTF8')), now() - interval '1 day', now() - interval '8 days');
insert into public.invitations (client_id, advisor_id, token_hash, revoked_at) values
  ('c2c2c2c2-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   sha256(convert_to('token-revocado', 'UTF8')), now());

-- Textos: Colombia tiene una versión vieja y una vigente, España los suyos, una versión
-- futura que aún no se ve y términos comunes a todos los países. Se publican al empezar la
-- transacción, después de los avisos de las migraciones, para que sean los vigentes.
insert into public.legal_texts (id, kind, country_code, version, title, body_markdown, published_at) values
  ('d0d0d0d0-0000-4000-8000-000000000001', 'tratamiento_datos', 'CO', '1', 'Tratamiento CO v1', 'Viejo',
   now() - interval '30 days'),
  ('d0d0d0d0-0000-4000-8000-000000000002', 'tratamiento_datos', 'CO', '2', 'Tratamiento CO v2', 'Vigente',
   now()),
  ('d0d0d0d0-0000-4000-8000-000000000003', 'datos_sensibles', 'CO', '1', 'Salud CO', 'Salud',
   now()),
  ('d0d0d0d0-0000-4000-8000-000000000004', 'tratamiento_datos', 'ES', '1', 'Tratamiento ES', 'Vigente ES',
   now()),
  ('d0d0d0d0-0000-4000-8000-000000000007', 'datos_sensibles', 'ES', '1', 'Salud ES', 'Salud ES',
   now()),
  ('d0d0d0d0-0000-4000-8000-000000000005', 'tratamiento_datos', 'CO', '3', 'Tratamiento CO v3', 'Futuro',
   now() + interval '10 days'),
  ('d0d0d0d0-0000-4000-8000-000000000006', 'terminos', null, '1', 'Términos', 'Comunes',
   now());

-- Textos legales ---------------------------------------------------------------------------------

select is(
  (select body_sha256 from public.legal_texts where id = 'd0d0d0d0-0000-4000-8000-000000000002'),
  encode(sha256(convert_to('Vigente', 'UTF8')), 'hex'), 'La base guarda el sha256 del texto');
select throws_ok(
  $$update public.legal_texts set body_markdown = 'Otro' where id = 'd0d0d0d0-0000-4000-8000-000000000002'$$,
  '55000', null, 'Un texto publicado no se cambia');
select results_eq(
  $$select id from public.current_legal_texts('CO') order by kind$$,
  $$values ('d0d0d0d0-0000-4000-8000-000000000003'::uuid), ('d0d0d0d0-0000-4000-8000-000000000006'::uuid),
    ('d0d0d0d0-0000-4000-8000-000000000002'::uuid)$$,
  'Vigentes en Colombia: la última versión publicada del país y los textos comunes');
select results_eq(
  $$select kind from public.current_legal_texts('MX') order by kind$$, array['terminos'],
  'Un país sin textos propios solo tiene los comunes');

-- Permisos de las funciones: Supabase da EXECUTE a anon en cada función nueva de public, así que
-- cada una declara quién la usa y esta lista lo vigila.
select is(
  array(select p.proname::text collate "default" from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')
        order by 1),
  array['current_legal_texts', 'get_invitation'],
  'Sin sesión solo se ven la invitación con su token y los textos legales');

-- Visitante sin sesión ---------------------------------------------------------------------------

set local role anon;
select is((select count(*)::int from public.legal_texts where id::text like 'd0d0d0d0-%'), 6, 'anon lee los textos ya publicados');
select throws_ok(
  $$insert into public.legal_texts (kind, version, title, body_markdown) values ('terminos', '9', 'x', 'x')$$,
  '42501', null, 'anon no publica textos');
select throws_ok('select * from public.consents', '42501', null, 'anon no lee consentimientos');

select results_eq(
  $$select status, advisor_name, client_name, form_of_address, country_code, email
    from public.get_invitation('token-co')$$,
  $$values ('valid', 'Asesora Prueba', 'Cliente CO', 'usted', 'CO', 'cliente.co@example.com')$$,
  'Con el token vigente se ve la invitación');
select ok((select expires_at > now() from public.get_invitation('token-co')), 'Y su vencimiento');
select results_eq($$select status from public.get_invitation('token-inventado')$$, array['invalid'],
  'Un token que no existe no muestra nada');
select results_eq($$select status from public.get_invitation(repeat('x', 200))$$, array['invalid'],
  'Un token demasiado largo no se busca');
select results_eq($$select status from public.get_invitation(null)$$, array['invalid'],
  'Sin token no se busca');
select results_eq($$select status from public.get_invitation('token-vencido')$$, array['expired'],
  'Una invitación vencida se reconoce');
select results_eq($$select status from public.get_invitation('token-revocado')$$, array['revoked'],
  'Una invitación revocada se reconoce');
select is((select client_name from public.get_invitation('token-vencido')), null,
  'Una invitación que no sirve no muestra datos del perfil');
select throws_ok(
  $$select public.accept_invitation('token-co', '{d0d0d0d0-0000-4000-8000-000000000002}')$$,
  '42501', null, 'anon no acepta invitaciones');
reset role;

-- Aceptar con consentimiento ---------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333"}', true);
set local role authenticated;
select throws_ok($$select public.accept_invitation('token-co')$$, '23514', null,
  'Sin aceptar el tratamiento de datos no se acepta la invitación');
select throws_ok(
  $$select public.accept_invitation('token-co', '{d0d0d0d0-0000-4000-8000-000000000001}')$$,
  '23514', null, 'Una versión vieja del texto no sirve');
select throws_ok(
  $$select public.accept_invitation('token-co', '{d0d0d0d0-0000-4000-8000-000000000003}')$$,
  '23514', null, 'Aceptar solo los datos sensibles no basta');
select is(
  public.accept_invitation('token-co',
    '{d0d0d0d0-0000-4000-8000-000000000002,d0d0d0d0-0000-4000-8000-000000000003}', 'Navegador de prueba'),
  'c1c1c1c1-0000-4000-8000-000000000001'::uuid, 'Con el tratamiento vigente, la invitación se acepta');
select results_eq(
  $$select legal_text_id, granted, user_agent from public.consents order by legal_text_id$$,
  $$values ('d0d0d0d0-0000-4000-8000-000000000002'::uuid, true, 'Navegador de prueba'),
    ('d0d0d0d0-0000-4000-8000-000000000003'::uuid, true, 'Navegador de prueba')$$,
  'El cliente ve sus dos consentimientos, con el texto exacto y el navegador');
select throws_ok(
  $$insert into public.consents (client_id, user_id, legal_text_id, granted) values
    ('c1c1c1c1-0000-4000-8000-000000000001', '33333333-3333-4333-8333-333333333333',
     'd0d0d0d0-0000-4000-8000-000000000001', true)$$,
  '42501', null, 'El cliente no escribe consentimientos por fuera de la aceptación');
select throws_ok(
  $$update public.consents set granted = false$$,
  '42501', null, 'El cliente no cambia un consentimiento registrado');
reset role;

select results_eq($$select status from public.get_invitation('token-co')$$, array['used'],
  'Una invitación usada se reconoce');
select is(
  (select count(*)::int from public.audit_log where table_name = 'consents'
     and client_id = 'c1c1c1c1-0000-4000-8000-000000000001' and actor_role = 'cliente'),
  2, 'Cada consentimiento deja una fila en el historial');

select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-8444-444444444444"}', true);
set local role authenticated;
select is(
  public.accept_invitation('token-es', '{d0d0d0d0-0000-4000-8000-000000000004}'),
  'c2c2c2c2-0000-4000-8000-000000000002'::uuid, 'España: se acepta con su propio texto');
select results_eq(
  $$select legal_text_id, granted from public.consents order by legal_text_id$$,
  $$values ('d0d0d0d0-0000-4000-8000-000000000004'::uuid, true),
    ('d0d0d0d0-0000-4000-8000-000000000007'::uuid, false)$$,
  'Un cliente solo ve sus consentimientos, y los datos sensibles no aceptados quedan registrados');
reset role;

select set_config('request.jwt.claims', '{"sub":"66666666-6666-4666-8666-666666666666"}', true);
set local role authenticated;
select throws_ok(
  $$select public.accept_invitation('token-mx', '{d0d0d0d0-0000-4000-8000-000000000006}')$$,
  '55000', null, 'Sin texto de tratamiento vigente en el país no se puede aceptar');
reset role;
select is((select owner_user_id from public.clients where id = 'c3c3c3c3-0000-4000-8000-000000000003'), null,
  'Un intento fallido no vincula el perfil');

-- Aceptar sin los datos sensibles los registra como no aceptados. Sin usuario (como una tarea del
-- sistema), el perfil de prueba pasa a Colombia, que tiene texto de salud.
select set_config('request.jwt.claims', '', true);
insert into public.invitations (client_id, advisor_id, token_hash) values
  ('c3c3c3c3-0000-4000-8000-000000000003', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   sha256(convert_to('token-mx-2', 'UTF8')));
update public.clients set country_code = 'CO' where id = 'c3c3c3c3-0000-4000-8000-000000000003';
select set_config('request.jwt.claims', '{"sub":"66666666-6666-4666-8666-666666666666"}', true);
set local role authenticated;
select lives_ok(
  $$select public.accept_invitation('token-mx-2', '{d0d0d0d0-0000-4000-8000-000000000002}')$$,
  'Se acepta sin los datos sensibles, que son facultativos');
select results_eq(
  $$select legal_text_id, granted from public.consents order by legal_text_id$$,
  $$values ('d0d0d0d0-0000-4000-8000-000000000002'::uuid, true),
    ('d0d0d0d0-0000-4000-8000-000000000003'::uuid, false)$$,
  'Los datos sensibles quedan registrados como no aceptados');
reset role;

-- Asesora ----------------------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
set local role authenticated;
select is((select count(*)::int from public.consents), 6, 'La asesora ve los consentimientos de sus clientes');
select lives_ok($$update public.consents set withdrawn_at = now()$$,
  'La asesora intenta retirar consentimientos');
reset role;
select is(
  (select count(*)::int from public.consents
   where withdrawn_at is not null and client_id::text like 'c_c_c_c_-0000-%'), 0,
  'RLS no deja a la asesora retirar consentimientos de sus clientes');

update public.advisor_client_access set status = 'revoked'
where client_id = 'c1c1c1c1-0000-4000-8000-000000000001';
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
set local role authenticated;
select is((select count(*)::int from public.consents where client_id = 'c1c1c1c1-0000-4000-8000-000000000001'),
  0, 'Sin acceso, la asesora deja de ver los consentimientos de ese cliente');
reset role;

-- Retirar el consentimiento de datos sensibles (migración consent_withdrawal) ----------------

select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333"}', true);
set local role authenticated;
select throws_ok(
  $$update public.consents set withdrawn_at = now()
    where legal_text_id = 'd0d0d0d0-0000-4000-8000-000000000002'$$,
  '42501', null, 'El tratamiento de datos no se retira desde aquí');
select lives_ok(
  $$update public.consents set withdrawn_at = '2000-01-01'
    where legal_text_id = 'd0d0d0d0-0000-4000-8000-000000000003'$$,
  'El cliente retira su consentimiento de datos de salud');
select is(
  (select withdrawn_at from public.consents where legal_text_id = 'd0d0d0d0-0000-4000-8000-000000000003'),
  now(), 'La fecha de retiro la pone la base');
select throws_ok(
  $$update public.consents set withdrawn_at = null
    where legal_text_id = 'd0d0d0d0-0000-4000-8000-000000000003'$$,
  '55000', null, 'Un consentimiento retirado no se reactiva');
reset role;
select is(
  (select count(*)::int from public.audit_log where table_name = 'consents' and action = 'update'
     and client_id = 'c1c1c1c1-0000-4000-8000-000000000001' and actor_role = 'cliente'),
  1, 'El retiro queda en el historial');

select set_config('request.jwt.claims', '{"sub":"66666666-6666-4666-8666-666666666666"}', true);
set local role authenticated;
select throws_ok(
  $$update public.consents set withdrawn_at = now()
    where legal_text_id = 'd0d0d0d0-0000-4000-8000-000000000003'$$,
  '55000', null, 'Un consentimiento que no se dio no se retira');
select lives_ok(
  $$update public.consents set withdrawn_at = now()
    where client_id = 'c1c1c1c1-0000-4000-8000-000000000001'$$,
  'Un cliente intenta retirar consentimientos de otro');
reset role;
select is(
  (select count(*)::int from public.consents
   where client_id = 'c1c1c1c1-0000-4000-8000-000000000001' and withdrawn_at is not null),
  1, 'RLS no deja a un cliente retirar consentimientos de otro');

-- Aviso al asesor cuando el cliente acepta (migración notifications) ---------------------------

select is(
  (select count(*)::int from public.notifications
   where recipient_user_id = '11111111-1111-4111-8111-111111111111' and kind = 'invitacion_aceptada'
     and client_id::text like 'c_c_c_c_-0000-%'),
  3, 'Cada invitación aceptada deja un aviso para la asesora');

select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-8444-444444444444"}', true);
set local role authenticated;
select is((select count(*)::int from public.notifications), 0, 'El cliente no ve los avisos de la asesora');
select throws_ok(
  $$insert into public.notifications (recipient_user_id, kind)
    values ('44444444-4444-4444-8444-444444444444', 'invitacion_aceptada')$$,
  '42501', null, 'Nadie crea avisos desde la API');
reset role;

select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
set local role authenticated;
select is(
  (select count(*)::int from public.notifications where client_id::text like 'c_c_c_c_-0000-%'), 3,
  'La asesora ve sus avisos');
select lives_ok(
  $$update public.notifications set read_at = '2000-01-01'
    where client_id = 'c2c2c2c2-0000-4000-8000-000000000002'$$,
  'La asesora marca un aviso como visto');
select is(
  (select read_at from public.notifications where client_id = 'c2c2c2c2-0000-4000-8000-000000000002'),
  now(), 'La fecha de lectura la pone la base');
select throws_ok(
  $$update public.notifications set read_at = null
    where client_id = 'c2c2c2c2-0000-4000-8000-000000000002'$$,
  '55000', null, 'Un aviso visto no se desmarca');
reset role;

select * from finish();
rollback;
