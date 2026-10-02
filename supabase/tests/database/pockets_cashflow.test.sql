-- Datos de entrada de F3: supuestos del plan, bancos, bolsillos, cobros, prueba de realidad y activos.
-- Matriz de permisos (docs/03-modelo-de-datos.md, sección 5). Solo datos inventados; todo se deshace.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- Asesora A con un perfil con dueño (Cliente Uno, COP); asesor B con su propio cliente (Cliente Tres).
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
insert into public.banks (id, client_id, name) values
  ('bbbb0003-0000-4000-8000-000000000003', 'c3c3c3c3-0000-4000-8000-000000000003', 'Banco de otro cliente');
insert into public.pockets (id, client_id, name, currency) values
  ('ffff0003-0000-4000-8000-000000000003', 'c3c3c3c3-0000-4000-8000-000000000003', 'Bolsillo ajeno', 'COP');

-- Parámetros de la metodología sembrados con su fuente.
select is((public.parameter_at('CO', 'method.pct_surplus_invest_pending', '2026-09-28')).value, '0.5'::jsonb,
  'Mientras la prueba de realidad esté pendiente se invierte el 50 % del sobrante');
select is((public.parameter_at('ES', 'method.expensive_debt_threshold', '2026-09-28')).value, '0.2'::jsonb,
  'El umbral de deuda cara es común a todos los países');
select is(
  (select count(*)::int from public.country_parameters where key like 'method.%' and country_code is null), 6,
  'La metodología tiene seis parámetros comunes');

-- Visitante sin sesión -------------------------------------------------------------------------

set local role anon;
select throws_ok('select * from public.banks', '42501', null, 'anon no lee bancos');
select throws_ok('select * from public.pockets', '42501', null, 'anon no lee bolsillos');
select throws_ok('select * from public.receivables', '42501', null, 'anon no lee cobros');
select throws_ok('select * from public.reality_check', '42501', null, 'anon no lee la prueba de realidad');
select throws_ok('select * from public.assets', '42501', null, 'anon no lee activos');
reset role;

-- Cliente Uno (dueño) --------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333"}', true);
set local role authenticated;

select lives_ok(
  $$insert into public.banks (client_id, name, max_pockets) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Banco A', 10)$$,
  'El cliente registra su banco por el nombre y su límite de bolsillos');
select lives_ok(
  $$insert into public.pockets (client_id, bank_id, name, currency, initial_balance) values
    ('c1c1c1c1-0000-4000-8000-000000000001', (select id from public.banks where name = 'Banco A'), 'Viajes',
     'COP', 500000)$$,
  'Y un bolsillo general con su saldo inicial');
select lives_ok(
  $$insert into public.pockets (client_id, kind, name, currency) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'emergencia', 'Fondo de emergencia', 'COP')$$,
  'Y el bolsillo del fondo de emergencia');
select throws_ok(
  $$insert into public.pockets (client_id, kind, name, currency) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'emergencia', 'Otro fondo', 'COP')$$,
  '23505', null, 'Hay un solo bolsillo de fondo de emergencia por cliente');
select throws_ok(
  $$insert into public.pockets (client_id, kind, name, currency, initial_balance) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'meses_sin_ingreso', 'Meses sin ingreso', 'COP', 1000)$$,
  '23514', null, 'El saldo del fondo y de meses sin ingreso lo sugiere el motor, no se escribe');
select throws_ok(
  $$insert into public.pockets (client_id, bank_id, name, currency) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'bbbb0003-0000-4000-8000-000000000003', 'Intruso', 'COP')$$,
  '23503', null, 'Un bolsillo no cuelga del banco de otro cliente');
select throws_ok(
  $$insert into public.pockets (client_id, name, currency) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'En dólares', 'USD')$$,
  '23514', null, 'Un bolsillo en otra moneda necesita la tasa (RN-017)');
select lives_ok(
  $$insert into public.budget_items (client_id, category, concept, currency, amount, frequency, expense_type,
      pocket_id) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Viajes y ocio', 'Viaje nacional', 'COP', 3000000, 'anual',
     'bolsillo', (select id from public.pockets where name = 'Viajes'))$$,
  'El cliente asigna una partida a su bolsillo');
select throws_ok(
  $$insert into public.budget_items (client_id, category, concept, currency, pocket_id) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Ocio', 'Intruso', 'COP', 'ffff0003-0000-4000-8000-000000000003')$$,
  '23503', null, 'Una partida no va al bolsillo de otro cliente');
select lives_ok(
  $$insert into public.budget_items (client_id, category, concept, currency, amount, frequency, expense_type) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Temporada', 'Navidad', 'COP', 1000000, 'anual', 'bolsillo')$$,
  'Una partida tipo bolsillo sin bolsillo se guarda: es un pendiente, no un error');

select lives_ok(
  $$insert into public.receivables (client_id, debtor_label, currency, balance, monthly_payment,
      first_payment_date) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Hermana', 'COP', 3000000, 250000, '2026-06-01')$$,
  'El cliente registra un cobro con el % a inversión por defecto');
select throws_ok(
  $$insert into public.receivables (client_id, debtor_label, currency, balance, monthly_payment,
      pct_to_investment) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Amigo', 'COP', 1000, 100, 0.5)$$,
  '42501', null, 'El cliente no fija el % del cobro que va a inversión');
select throws_ok(
  $$update public.receivables set pct_to_investment = 0 where debtor_label = 'Hermana'$$,
  '42501', null, 'Ni lo cambia');
select throws_ok(
  $$insert into public.receivables (client_id, debtor_label, currency, balance, monthly_payment) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Sin saldo', 'COP', 0, 100)$$,
  '23514', null, 'Un cobro tiene saldo y cuota');

select lives_ok(
  $$insert into public.reality_check (client_id, currency, savings_n_ago, n_months, savings_today) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'COP', 10000000, 6, 16000000)$$,
  'El cliente da los saldos de la prueba de realidad');
select throws_ok(
  $$update public.reality_check set n_months = 0 where client_id = 'c1c1c1c1-0000-4000-8000-000000000001'$$,
  '23514', null, 'N es al menos un mes');

select lives_ok(
  $$insert into public.assets (client_id, name, asset_type, currency, value, pocket_id) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Bolsillos del Banco A', 'liquido', 'COP', 5000000,
     (select id from public.pockets where name = 'Viajes'))$$,
  'El cliente registra un activo líquido');
select throws_ok(
  $$insert into public.assets (client_id, name, asset_type, currency, value) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Acciones', 'inversion', 'COP', 1)$$,
  '23514', null, 'Las inversiones van en su propia tabla');

select throws_ok(
  $$insert into public.case_settings (client_id, operating_cushion) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 100000)$$,
  '42501', null, 'El cliente no escribe los supuestos del plan');
select is((select count(*)::int from public.banks), 1, 'El cliente no ve los bancos de otro cliente');
select is(
  (select array_agg(distinct table_name order by table_name) from public.audit_log
   where client_id = 'c1c1c1c1-0000-4000-8000-000000000001' and actor_role = 'cliente'
     and table_name in ('banks', 'pockets', 'receivables', 'reality_check', 'assets')),
  array['assets', 'banks', 'pockets', 'reality_check', 'receivables'],
  'Cada cambio del cliente queda en el historial a su nombre');

-- Asesora A ------------------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
select lives_ok(
  $$update public.receivables set pct_to_investment = 0.6 where debtor_label = 'Hermana'$$,
  'La asesora decide qué parte del cobro va a inversión');
select lives_ok(
  $$insert into public.case_settings (client_id, emergency_months_override, expensive_debt_threshold,
      pct_surplus_invest_confirmed, pct_surplus_invest_pending, pct_surplus_to_debt, pct_excess_to_invest,
      operating_cushion) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 4, 0.15, 0.7, 0.5, 0.9, 0.5, 949000)$$,
  'La asesora fija los supuestos del plan');
select throws_ok(
  $$update public.case_settings set pct_surplus_to_debt = 1.5
    where client_id = 'c1c1c1c1-0000-4000-8000-000000000001'$$,
  '23514', null, 'Un porcentaje va de 0 a 1');
select lives_ok($$delete from public.banks where name = 'Banco A'$$,
  'La asesora borra un banco');
select is((select bank_id from public.pockets where name = 'Viajes'), null,
  'El bolsillo queda sin banco, con su saldo');
select lives_ok($$delete from public.pockets where name = 'Viajes'$$, 'Y borra el bolsillo');
select is((select pocket_id from public.budget_items where concept = 'Viaje nacional'), null,
  'La partida queda sin bolsillo, sin perderse');

-- Monedas en uso: la tasa de una moneda con un activo no se borra.
select lives_ok(
  $$insert into public.client_fx_rates (client_id, currency, rate_to_base, as_of) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'USD', 3900, current_date)$$,
  'La asesora registra la tasa del dólar');
select lives_ok(
  $$insert into public.assets (client_id, name, asset_type, currency, value) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Dólares en efectivo', 'liquido', 'USD', 500)$$,
  'Y un activo en dólares');
select throws_ok(
  $$delete from public.client_fx_rates where currency = 'USD'$$,
  '23503', null, 'La tasa de una moneda con un activo no se borra');

-- Asesor B sin acceso --------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222"}', true);
select is((select count(*)::int from public.receivables where client_id = 'c1c1c1c1-0000-4000-8000-000000000001'), 0,
  'Un asesor sin acceso no ve los cobros');
select is((select count(*)::int from public.reality_check where client_id = 'c1c1c1c1-0000-4000-8000-000000000001'), 0,
  'Ni la prueba de realidad');
select throws_ok(
  $$insert into public.assets (client_id, name, asset_type, currency, value) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Intruso', 'liquido', 'COP', 1)$$,
  '42501', null, 'Ni escribe activos');

-- Revocación -----------------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333"}', true);
update public.advisor_client_access set status = 'revoked'
where client_id = 'c1c1c1c1-0000-4000-8000-000000000001';
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
select is((select count(*)::int from public.assets where client_id = 'c1c1c1c1-0000-4000-8000-000000000001'), 0,
  'Al revocar, la asesora deja de ver los activos en la siguiente consulta');
select is((select count(*)::int from public.pockets where client_id = 'c1c1c1c1-0000-4000-8000-000000000001'), 0,
  'Y los bolsillos');

reset role;
select * from finish();
rollback;
