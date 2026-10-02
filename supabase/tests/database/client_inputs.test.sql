-- Datos de entrada del cliente (F2): tasas, supuestos del caso, ingresos, presupuesto y parámetros.
-- Matriz de permisos (docs/03-modelo-de-datos.md, sección 5). Solo datos inventados; todo se deshace.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- Asesora A con dos perfiles: uno con dueño (Cliente Uno, COP) y uno sin dueño (Perfil ES, EUR).
-- Asesor B sin acceso y un cliente de otro perfil (Cliente Tres, de B).
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
  ('c2c2c2c2-0000-4000-8000-000000000002', null, 'Perfil ES', 'ES', 'EUR',
   '11111111-1111-4111-8111-111111111111'),
  ('c3c3c3c3-0000-4000-8000-000000000003', '44444444-4444-4444-8444-444444444444', 'Cliente Tres', 'CO', 'COP',
   '22222222-2222-4222-8222-222222222222');
insert into public.advisor_client_access (advisor_id, client_id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'c1c1c1c1-0000-4000-8000-000000000001'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'c2c2c2c2-0000-4000-8000-000000000002'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'c3c3c3c3-0000-4000-8000-000000000003');
insert into public.incomes (client_id, name, kind, currency, amount) values
  ('c3c3c3c3-0000-4000-8000-000000000003', 'Sueldo de otro cliente', 'laboral', 'COP', 1000);

-- Parámetros sembrados con su fuente (migración country_parameters_2026, docs/fuentes.md F30 y F45).
select is((public.parameter_at('ES', 'tax.dependent_income_limit', '2026-09-28')).value, '8000'::jsonb,
  'España: límite de rentas del descendiente');
select is((public.parameter_at('CO', 'minimum_wage', '2026-09-28')).value, '1750905'::jsonb,
  'Colombia: salario mínimo 2026');
select is((select count(*)::int from public.country_parameters where source_url is null or consulted_at is null), 0,
  'Todo parámetro sembrado tiene fuente y fecha de consulta');

-- Visitante sin sesión -------------------------------------------------------------------------

set local role anon;
select throws_ok('select * from public.incomes', '42501', null, 'anon no lee ingresos');
select throws_ok('select * from public.budget_items', '42501', null, 'anon no lee el presupuesto');
select throws_ok('select * from public.client_fx_rates', '42501', null, 'anon no lee tasas');
select throws_ok('select * from public.country_parameters', '42501', null, 'anon no lee parámetros');
select throws_ok($$select public.parameter_at('CO', 'x', current_date)$$, '42501', null,
  'anon no consulta parámetros');
reset role;

-- Cliente Uno (dueño) --------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333"}', true);
set local role authenticated;

select lives_ok(
  $$insert into public.incomes (client_id, name, kind, currency, amount, payments_by_month) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Honorarios', 'laboral', 'COP', 7000000,
     '{0,1,1,1,1,1,1,1,1,1,1,1}')$$,
  'El cliente registra un ingreso en su moneda base');
select is((select updated_by from public.incomes where name = 'Honorarios'),
  '33333333-3333-4333-8333-333333333333'::uuid, 'La base anota quién lo cambió');
select throws_ok(
  $$insert into public.incomes (client_id, name, kind, currency, amount) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Pago en dólares', 'otro', 'USD', 100)$$,
  '23514', null, 'Un ingreso en otra moneda sin tasa se rechaza (RN-017)');
select throws_ok(
  $$insert into public.client_fx_rates (client_id, currency, rate_to_base, as_of) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'COP', 1, current_date)$$,
  '23514', null, 'La moneda base no lleva tasa');
select lives_ok(
  $$insert into public.client_fx_rates (client_id, currency, rate_to_base, as_of, note) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'USD', 3900, current_date, 'La que paga su banco')$$,
  'El cliente registra la tasa que recibe');
select lives_ok(
  $$insert into public.incomes (client_id, name, kind, currency, amount) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Pago en dólares', 'otro', 'USD', 100)$$,
  'Con la tasa, el ingreso en dólares se guarda');
select throws_ok(
  $$delete from public.client_fx_rates where currency = 'USD'$$,
  '23503', null, 'La tasa de una moneda en uso no se borra');
select throws_ok(
  $$insert into public.incomes (client_id, name, kind, currency, amount, payments_by_month) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Mal', 'otro', 'COP', 1, '{1,1,1}')$$,
  '23514', null, 'Los pagos por mes son doce');
select throws_ok(
  $$insert into public.incomes (client_id, name, kind, currency, amount, payments_by_month) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Mal', 'otro', 'COP', 1, '{1,1,1,1,1,1,1,1,1,1,1,-1}')$$,
  '23514', null, 'Un mes no tiene pagos negativos');

select lives_ok(
  $$insert into public.budget_items (client_id, category, concept, currency, amount, frequency, expense_type,
      essential, payer, payer_label) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Alimentación', 'Mercado', 'COP', 130000, 'semanal', 'directo',
     true, 'familia', 'sus padres')$$,
  'El cliente registra un gasto y quién lo paga');
select throws_ok(
  $$insert into public.budget_items (client_id, category, concept, currency, amount, basic_amount) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Ocio', 'Salidas', 'COP', 100000, 50000)$$,
  '42501', null, 'El cliente no propone el nivel básico');
select throws_ok(
  $$insert into public.budget_items (client_id, category, concept, currency, is_proposed) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Ocio', 'Salidas', 'COP', true)$$,
  '42501', null, 'El cliente no marca un valor como propuesto');
select throws_ok(
  $$update public.budget_items set basic_amount = 1 where concept = 'Mercado'$$,
  '42501', null, 'El cliente no cambia el nivel básico');
select throws_ok(
  $$insert into public.budget_items (client_id, category, concept, currency, amount) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Ocio', 'Viaje', 'EUR', 100)$$,
  '23514', null, 'Un gasto en otra moneda sin tasa se rechaza');
select throws_ok(
  $$insert into public.budget_items (client_id, category, concept, currency, payer) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Ocio', 'Viaje', 'COP', 'vecino')$$,
  '23514', null, 'El pagador es uno del catálogo');

select lives_ok(
  $$insert into public.social_security_months (client_id, payments_by_month) values
    ('c1c1c1c1-0000-4000-8000-000000000001', '{1,0,1,1,1,1,1,1,1,1,1,1}')$$,
  'El cliente marca los meses de seguridad social');
select lives_ok(
  $$insert into public.variable_income_history (client_id, month_index, currency, amount) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 1, 'COP', 5000000)$$,
  'El cliente registra lo recibido en un mes');

select throws_ok(
  $$insert into public.case_settings (client_id, fiscal_threshold_keys) values
    ('c1c1c1c1-0000-4000-8000-000000000001', '{tax.dependent_income_limit}')$$,
  '42501', null, 'Ni marca umbrales fiscales');
select throws_ok(
  $$insert into public.case_settings (client_id, pension_enabled) values
    ('c1c1c1c1-0000-4000-8000-000000000001', true)$$,
  '42501', null, 'El cliente no escribe los supuestos del caso');

select is((select count(*)::int from public.incomes where client_id = 'c3c3c3c3-0000-4000-8000-000000000003'), 0,
  'El cliente no ve los ingresos de otro cliente');
select throws_ok(
  $$insert into public.incomes (client_id, name, kind, currency, amount) values
    ('c3c3c3c3-0000-4000-8000-000000000003', 'Intruso', 'otro', 'COP', 1)$$,
  '42501', null, 'El cliente no escribe en otro perfil');

select is(
  (select array_agg(distinct actor_role) from public.audit_log
   where client_id = 'c1c1c1c1-0000-4000-8000-000000000001' and table_name in ('incomes', 'budget_items')),
  array['cliente'], 'Cada cambio del cliente queda en el historial a su nombre');

-- Parámetros: el cliente los lee pero no los publica.
select lives_ok('select * from public.country_parameters', 'El cliente lee los parámetros');
select throws_ok(
  $$insert into public.country_parameters (country_code, key, value, valid_from, source_name, consulted_at)
    values ('CO', 'prueba.cliente', '1', '2026-01-01', 'Fuente', current_date)$$,
  '42501', null, 'El cliente no publica parámetros');

-- Asesora A ------------------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);

select is((select count(*)::int from public.incomes where client_id = 'c1c1c1c1-0000-4000-8000-000000000001'), 2,
  'La asesora ve los ingresos de su cliente');
select lives_ok(
  $$update public.budget_items set basic_amount = 100000, is_proposed = true where concept = 'Mercado'$$,
  'La asesora propone el nivel básico');
select lives_ok(
  $$insert into public.case_settings (client_id, cutoff_date) values
    ('c1c1c1c1-0000-4000-8000-000000000001', '2026-09-28')$$,
  'La asesora fija la fecha de corte');
select is((select pension_enabled from public.case_settings where client_id = 'c1c1c1c1-0000-4000-8000-000000000001'),
  false, 'El análisis de pensión empieza apagado, sea cual sea el país');
select lives_ok(
  $$update public.case_settings set pension_enabled = true where client_id = 'c1c1c1c1-0000-4000-8000-000000000001'$$,
  'La asesora lo activa para este cliente');
select lives_ok(
  $$update public.case_settings set fiscal_threshold_keys = '{tax.dependent_income_limit}'
    where client_id = 'c1c1c1c1-0000-4000-8000-000000000001'$$,
  'La asesora marca qué umbral fiscal aplica a este cliente');
select is((select count(*)::int from public.incomes where client_id = 'c3c3c3c3-0000-4000-8000-000000000003'), 0,
  'La asesora no ve clientes de otro asesor');

-- Perfil sin dueño con importes en otra moneda: se borra entero, también su tasa.
select lives_ok(
  $$insert into public.client_fx_rates (client_id, currency, rate_to_base, as_of) values
    ('c2c2c2c2-0000-4000-8000-000000000002', 'USD', 0.87, current_date)$$,
  'La asesora registra una tasa en el perfil sin dueño');
select lives_ok(
  $$insert into public.budget_items (client_id, category, concept, currency, amount, frequency, expense_type) values
    ('c2c2c2c2-0000-4000-8000-000000000002', 'Servicios', 'Suscripción', 'USD', 10, 'mensual', 'directo')$$,
  'Y un gasto en dólares');
select lives_ok($$delete from public.clients where id = 'c2c2c2c2-0000-4000-8000-000000000002'$$,
  'Borrar el perfil se lleva sus importes y sus tasas');

-- Parámetros: la asesora publica versiones sin solapes; el valor no se cambia.
select lives_ok(
  $$insert into public.country_parameters (country_code, key, value, unit, valid_from, valid_to, source_name,
      source_url, consulted_at) values
    (null, 'prueba.limite', '100', 'ratio', '2026-01-01', null, 'Común', 'https://example.com/a', '2026-10-01'),
    ('CO', 'prueba.limite', '200', 'ratio', '2026-01-01', '2027-01-01', 'País', 'https://example.com/b', '2026-10-01')$$,
  'La asesora publica un parámetro común y uno del país');
select throws_ok(
  $$insert into public.country_parameters (country_code, key, value, valid_from, source_name, consulted_at) values
    ('CO', 'prueba.limite', '300', '2026-06-01', 'País', '2026-10-01')$$,
  '23P01', null, 'Dos versiones de la misma clave no se solapan');
select is((public.parameter_at('CO', 'prueba.limite', '2026-09-28')).value, '200'::jsonb,
  'En su vigencia, el valor del país gana sobre el común');
select is((public.parameter_at('CO', 'prueba.limite', '2027-03-01')).value, '100'::jsonb,
  'Fuera de ella, vale el común');
select is((public.parameter_at('ES', 'prueba.limite', '2026-09-28')).value, '100'::jsonb,
  'Un país sin valor propio usa el común');
select throws_ok(
  $$update public.country_parameters set value = '999' where key = 'prueba.limite'$$,
  '42501', null, 'El valor de una versión publicada no se cambia');

-- Asesor B sin acceso --------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222"}', true);
select is((select count(*)::int from public.budget_items where client_id = 'c1c1c1c1-0000-4000-8000-000000000001'), 0,
  'Un asesor sin acceso no ve el presupuesto');
select throws_ok(
  $$insert into public.case_settings (client_id) values ('c1c1c1c1-0000-4000-8000-000000000001')$$,
  '42501', null, 'Ni escribe sus supuestos');

-- Revocación -----------------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333"}', true);
update public.advisor_client_access set status = 'revoked'
where client_id = 'c1c1c1c1-0000-4000-8000-000000000001';
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
select is((select count(*)::int from public.incomes where client_id = 'c1c1c1c1-0000-4000-8000-000000000001'), 0,
  'Al revocar, la asesora deja de ver los ingresos en la siguiente consulta');
select is((select count(*)::int from public.case_settings), 0, 'Y los supuestos del caso');

reset role;
select * from finish();
rollback;
