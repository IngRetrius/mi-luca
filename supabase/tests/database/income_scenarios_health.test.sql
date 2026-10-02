-- ADR 0011: ingreso estable en los escenarios del fondo (H-07) y gastos de salud sin detalle cuando
-- el cliente retira su consentimiento de datos de salud (C20). Solo datos inventados; todo se deshace.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (id, email, aud, role) values
  ('11111111-1111-4111-8111-111111111111', 'asesora.a@example.com', 'authenticated', 'authenticated'),
  ('33333333-3333-4333-8333-333333333333', 'cliente.uno@example.com', 'authenticated', 'authenticated');
insert into public.advisors (id, user_id, display_name) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Asesora A');
insert into public.clients (id, owner_user_id, display_name, country_code, base_currency, created_by) values
  ('c1c1c1c1-0000-4000-8000-000000000001', '33333333-3333-4333-8333-333333333333', 'Cliente Uno', 'CO', 'COP',
   '11111111-1111-4111-8111-111111111111'),
  ('c2c2c2c2-0000-4000-8000-000000000002', null, 'Borrador', 'CO', 'COP',
   '11111111-1111-4111-8111-111111111111');
insert into public.advisor_client_access (advisor_id, client_id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'c1c1c1c1-0000-4000-8000-000000000001'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'c2c2c2c2-0000-4000-8000-000000000002');
insert into public.legal_texts (id, kind, country_code, version, title, body_markdown) values
  ('d0d0d0d0-0000-4000-8000-000000000099', 'datos_sensibles', 'CO', '99', 'Salud', 'Salud');
insert into public.consents (id, client_id, user_id, legal_text_id, granted) values
  ('e0e0e0e0-0000-4000-8000-000000000001', 'c1c1c1c1-0000-4000-8000-000000000001',
   '33333333-3333-4333-8333-333333333333', 'd0d0d0d0-0000-4000-8000-000000000099', true);

select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333"}', true);
set local role authenticated;

-- H-07: un ingreso estable
select lives_ok(
  $$insert into public.incomes (client_id, name, kind, currency, amount, lost_in_scenario) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Aporte de la familia', 'otro', 'COP', 500000, 'ninguno')$$,
  'Un ingreso se marca como estable: no se pierde en ningún escenario');
select throws_ok(
  $$insert into public.incomes (client_id, name, kind, currency, amount, lost_in_scenario) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Mal', 'otro', 'COP', 1, 'd')$$,
  '23514', null, 'Solo los escenarios del catálogo');

-- C20: con el consentimiento vigente, el gasto de salud guarda su detalle
select lives_ok(
  $$insert into public.budget_items (client_id, category, concept, currency, amount, frequency, expense_type,
      is_health, note) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Terapias', 'Terapia de lenguaje', 'COP', 200000, 'mensual',
     'directo', true, 'Detalle sensible')$$,
  'Con el consentimiento vigente, el gasto de salud se guarda con su detalle');
select is((select concept from public.budget_items where is_health), 'Terapia de lenguaje',
  'El detalle se conserva mientras el consentimiento esté vigente');
update public.budget_items set amount = 210000 where is_health;
select lives_ok(
  $$insert into public.budget_items (client_id, category, concept, currency, amount, frequency, expense_type) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Vivienda', 'Arriendo', 'COP', 1000000, 'mensual', 'directo')$$,
  'Un gasto que no es de salud');

-- El cliente retira el consentimiento
select lives_ok(
  $$update public.consents set withdrawn_at = now() where id = 'e0e0e0e0-0000-4000-8000-000000000001'$$,
  'El cliente retira su consentimiento de datos de salud');
select results_eq(
  $$select category, concept, note, amount from public.budget_items where is_health$$,
  $$values ('Salud y bienestar'::text, 'Salud'::text, null::text, 210000.00::numeric)$$,
  'El gasto de salud conserva el importe y pierde el detalle');
select is((select concept from public.budget_items where concept = 'Arriendo'), 'Arriendo',
  'Los demás gastos no cambian');
reset role;
select is(
  (select count(*)::int from public.audit_log
   where table_name = 'budget_items' and (old_values::text like '%Terapia%' or new_values::text like '%Terapia%'
     or old_values::text like '%Detalle sensible%' or new_values::text like '%Detalle sensible%')),
  0, 'El historial tampoco conserva el detalle');

-- Después del retiro, un gasto de salud nuevo se guarda sin detalle
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333"}', true);
set local role authenticated;
select lives_ok(
  $$insert into public.budget_items (client_id, category, concept, currency, amount, frequency, expense_type,
      is_health, note) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Salud mental', 'Psicólogo', 'COP', 150000, 'mensual',
     'directo', true, 'Otra nota')$$,
  'Un gasto de salud nuevo se puede registrar');
select is((select count(*)::int from public.budget_items where is_health and concept = 'Salud' and note is null), 2,
  'Y queda sin detalle');

-- Un perfil sin consentimientos (borrador del asesor) no se toca
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
select lives_ok(
  $$insert into public.budget_items (client_id, category, concept, currency, amount, is_health) values
    ('c2c2c2c2-0000-4000-8000-000000000002', 'Salud', 'Lentes', 'COP', 300000, true)$$,
  'El asesor registra un gasto de salud en un borrador');
select is((select concept from public.budget_items where client_id = 'c2c2c2c2-0000-4000-8000-000000000002'),
  'Lentes', 'Sin consentimientos registrados, el detalle se conserva');
reset role;

select * from finish();
rollback;
