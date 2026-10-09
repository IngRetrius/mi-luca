-- Planes entregados: solo el asesor entrega, el cliente lo ve, nadie lo cambia ni lo borra.
-- Matriz de permisos (docs/03-modelo-de-datos.md, sección 5). Solo datos inventados; todo se deshace.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (id, email, aud, role) values
  ('11111111-1111-4111-8111-111111111111', 'asesora.a@example.com', 'authenticated', 'authenticated'),
  ('22222222-2222-4222-8222-222222222222', 'asesor.b@example.com', 'authenticated', 'authenticated'),
  ('33333333-3333-4333-8333-333333333333', 'cliente.uno@example.com', 'authenticated', 'authenticated');
insert into public.advisors (id, user_id, display_name) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Asesora A'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'Asesor B');
insert into public.clients (id, owner_user_id, display_name, country_code, base_currency, created_by) values
  ('c1c1c1c1-0000-4000-8000-000000000001', '33333333-3333-4333-8333-333333333333', 'Cliente Uno', 'CO', 'COP',
   '11111111-1111-4111-8111-111111111111');
insert into public.advisor_client_access (advisor_id, client_id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'c1c1c1c1-0000-4000-8000-000000000001');

-- Visitante sin sesión
set local role anon;
select throws_ok('select * from public.plan_deliveries', '42501', null, 'anon no lee planes entregados');
reset role;

-- Cliente Uno: no entrega su propio plan
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333"}', true);
set local role authenticated;
select throws_ok(
  $$insert into public.plan_deliveries (client_id, label, cutoff_date, engine_version, mode, inputs,
      results, key_figures, qc_report) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Mi plan', '2026-09-28', '0.8.0', 'native', '{}', '{}', '{}', '{}')$$,
  '42501', null, 'El cliente no entrega un plan');

-- Asesora A: entrega
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
select throws_ok(
  $$insert into public.plan_deliveries (client_id, label, cutoff_date, engine_version, mode, inputs,
      results, key_figures, qc_report, delivered_by, sha256) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Plan falso', '2026-09-28', '0.8.0', 'native',
     '{}', '{}', '{}', '{}', '22222222-2222-4222-8222-222222222222', 'falso')$$,
  '42501', null, 'Quién entregó y la huella no se escriben desde la API');
select lives_ok(
  $$insert into public.plan_deliveries (client_id, label, cutoff_date, engine_version, mode, inputs,
      results, key_figures, qc_report) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Plan inicial', '2026-09-28', '0.8.0', 'native',
     '{"incomes":[]}', '{"summary":{}}', '{"annualSurplus":100}', '{"items":[]}')$$,
  'La asesora entrega el plan');
select is((select delivered_by from public.plan_deliveries), '11111111-1111-4111-8111-111111111111'::uuid,
  'La base anota quién entregó');
select is((select sha256 from public.plan_deliveries),
  encode(sha256(convert_to('{"incomes": []}' || '{}' || '{"summary": {}}' || '{}' || 'completo', 'UTF8')),
    'hex'),
  'La base sella entradas, nombres, resultados, documentos y etapa con su sha256');
select throws_ok(
  $$update public.plan_deliveries set label = 'Otro nombre'$$,
  '42501', null, 'Nadie cambia un plan entregado desde la API');
select is((select count(*)::int from public.plan_deliveries), 1, 'Borrar no hace nada: no hay privilegio');
select throws_ok($$delete from public.plan_deliveries$$, '42501', null, 'Nadie borra un plan entregado desde la API');
select throws_ok(
  $$insert into public.plan_deliveries (client_id, label, cutoff_date, engine_version, mode, inputs,
      results, key_figures, qc_report) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Mal', '2026-09-28', 'uno', 'native', '{}', '{}', '{}', '{}')$$,
  '23514', null, 'La versión del motor es semver');
select is(
  (select count(*)::int from public.audit_log
   where table_name = 'plan_deliveries' and new_values ? 'inputs'),
  0, 'El historial registra la entrega sin copiar las fotos grandes');
reset role;

-- Ni con la clave secreta se cambia (la regla es de la base, no de los privilegios)
select throws_ok(
  $$update public.plan_deliveries set label = 'Otro nombre'$$,
  '55000', null, 'Un plan entregado no se cambia nunca');

-- El cliente lo ve; un asesor sin acceso, no
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333"}', true);
set local role authenticated;
select is((select label from public.plan_deliveries), 'Plan inicial', 'El cliente ve su plan entregado');
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222"}', true);
select is((select count(*)::int from public.plan_deliveries), 0, 'Un asesor sin acceso no lo ve');
select throws_ok(
  $$insert into public.plan_deliveries (client_id, label, cutoff_date, engine_version, mode, inputs,
      results, key_figures, qc_report) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Intruso', '2026-09-28', '0.8.0', 'native', '{}', '{}', '{}', '{}')$$,
  '42501', null, 'Ni entrega uno');
reset role;

select * from finish();
rollback;
