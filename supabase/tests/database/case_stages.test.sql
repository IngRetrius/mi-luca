-- Asesoría en tres etapas (migración case_stages, ADR 0025): el asesor activa las etapas de cada
-- cliente y cada plan entregado guarda su etapa. Solo datos inventados; todo se deshace al final.
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

-- Etapas activas
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
set local role authenticated;
select lives_ok(
  $$insert into public.case_settings (client_id) values ('c1c1c1c1-0000-4000-8000-000000000001')$$,
  'La asesora crea los supuestos del cliente');
select is((select active_stages from public.case_settings), array['presupuesto']::text[],
  'Un cliente nuevo empieza con la etapa de presupuesto');
select lives_ok(
  $$update public.case_settings set active_stages = '{presupuesto,deudas}'$$,
  'La asesora activa la etapa de deudas');
select is((select active_stages from public.case_settings), array['presupuesto', 'deudas']::text[],
  'Y queda guardada');
select throws_ok(
  $$update public.case_settings set active_stages = '{presupuesto,pension}'$$,
  '23514', null, 'Una etapa fuera del catálogo se rechaza');

-- El cliente ve sus etapas pero no las cambia
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333"}', true);
select is((select active_stages from public.case_settings), array['presupuesto', 'deudas']::text[],
  'El cliente ve sus etapas activas');
update public.case_settings set active_stages = '{presupuesto,deudas,patrimonio}';
select is((select active_stages from public.case_settings), array['presupuesto', 'deudas']::text[],
  'El cliente no cambia sus etapas (RLS no le deja la fila)');

-- Un asesor sin acceso no las ve ni las cambia
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222"}', true);
select is((select count(*)::int from public.case_settings), 0, 'Un asesor sin acceso no las ve');

-- Etapa de cada plan entregado
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
select lives_ok(
  $$insert into public.plan_deliveries (client_id, label, cutoff_date, engine_version, mode, inputs,
      results, key_figures, qc_report, stage) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Presupuesto', '2026-10-08', '0.16.0', 'native',
     '{}', '{}', '{}', '{"items":[]}', 'presupuesto')$$,
  'La asesora entrega el reporte de la etapa de presupuesto');
select lives_ok(
  $$insert into public.plan_deliveries (client_id, label, cutoff_date, engine_version, mode, inputs,
      results, key_figures, qc_report) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Plan completo', '2026-10-08', '0.16.0', 'native',
     '{}', '{}', '{}', '{"items":[]}')$$,
  'Y un plan completo sin decir la etapa');
select is(
  (select array_agg(stage order by label) from public.plan_deliveries),
  array['completo', 'presupuesto'], 'Sin etapa, la entrega es del plan completo');
select is(
  (select sha256 from public.plan_deliveries where label = 'Presupuesto'),
  encode(sha256(convert_to('{}' || '{}' || '{}' || '{}' || 'presupuesto', 'UTF8')), 'hex'),
  'El sello cubre la etapa');
select throws_ok(
  $$insert into public.plan_deliveries (client_id, label, cutoff_date, engine_version, mode, inputs,
      results, key_figures, qc_report, stage) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Mal', '2026-10-08', '0.16.0', 'native',
     '{}', '{}', '{}', '{}', 'pension')$$,
  '23514', null, 'Una etapa fuera del catálogo se rechaza');
reset role;

select throws_ok(
  $$update public.plan_deliveries set stage = 'deudas' where label = 'Presupuesto'$$,
  '55000', null, 'La etapa de un plan entregado no se cambia, ni con la clave secreta');

select * from finish();
rollback;
