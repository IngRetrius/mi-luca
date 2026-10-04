-- Inversión, patrimonio, metas y seguros (F5). Matriz de permisos (docs/03-modelo-de-datos.md,
-- sección 5). Solo datos inventados; todo se deshace.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- Asesora A con un perfil con dueño (Cliente Uno, COP); asesor B sin acceso.
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

select ok(
  (select bool_and(relrowsecurity) from pg_class
   where oid in ('public.goals'::regclass, 'public.goal_trip_items'::regclass, 'public.insurances'::regclass,
                 'public.investments'::regclass, 'public.risk_profile'::regclass)),
  'Las cinco tablas nuevas tienen RLS');
select is(
  (select count(*)::int from public.country_parameters
   where country_code is null and key in ('method.real_return_growth', 'method.real_return_stability',
     'method.growth_glide_step', 'method.growth_floor', 'method.growth_ranges', 'method.retirement_age_by_sex')),
  6, 'Los supuestos de inversión de la metodología están sembrados con fuente');

-- Visitante sin sesión -------------------------------------------------------------------------

set local role anon;
select throws_ok('select * from public.goals', '42501', null, 'anon no lee metas');
select throws_ok('select * from public.insurances', '42501', null, 'anon no lee seguros');
select throws_ok('select * from public.investments', '42501', null, 'anon no lee inversiones');
select throws_ok('select * from public.risk_profile', '42501', null, 'anon no lee el perfil de riesgo');
reset role;

-- Cliente Uno (dueño) --------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333"}', true);
set local role authenticated;

select lives_ok(
  $$insert into public.goals (client_id, name, currency, amount, target_date) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Computador', 'COP', 4000000, '2027-06-30')$$,
  'El cliente registra una meta con fecha');
select throws_ok(
  $$insert into public.goals (client_id, name, currency, uses_trip_calculator) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Viaje', 'COP', true)$$,
  '23514', null, 'Una meta con calculadora de viaje lleva la moneda del viaje');
select throws_ok(
  $$insert into public.goals (client_id, name, currency, uses_trip_calculator, trip_currency) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Viaje', 'COP', true, 'USD')$$,
  '23514', null, 'Y esa moneda necesita la tasa del cliente');
select lives_ok(
  $$insert into public.goals (client_id, name, currency, uses_trip_calculator, trip_currency, repeat_every_years)
    values ('c1c1c1c1-0000-4000-8000-000000000001', 'Viaje', 'COP', true, 'COP', 2)$$,
  'Un viaje que se repite cada 2 años, en moneda base');
select lives_ok(
  $$insert into public.goal_trip_items (goal_id, client_id, concept, unit_value, quantity, is_lodging) values
    ((select id from public.goals where name = 'Viaje'), 'c1c1c1c1-0000-4000-8000-000000000001',
     'Alojamiento por noche', 200000, 5, true)$$,
  'Con sus conceptos');

select lives_ok(
  $$insert into public.insurances (client_id, insurance_type, status, currency, annual_premium_quoted) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'vida', 'cotizando', 'COP', 1800000)$$,
  'El cliente registra un seguro de vida en cotización, sin número de póliza');
select throws_ok(
  $$insert into public.insurances (client_id, insurance_type, status, currency) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'vida', 'no', 'COP')$$,
  '23505', null, 'Cada seguro del catálogo aparece una vez');
select throws_ok(
  $$insert into public.insurances (client_id, insurance_type, currency) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'otro', 'COP')$$,
  '23514', null, 'Un seguro "otro" lleva nombre');
select lives_ok(
  $$insert into public.insurances (client_id, insurance_type, custom_name, currency) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'otro', 'Mascotas', 'COP')$$,
  'Con nombre, sí');

select lives_ok(
  $$insert into public.investments (client_id, name, bucket, currency, balance) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Plataforma A', 'crecimiento', 'COP', 5000000)$$,
  'El cliente registra una inversión por plataforma, sin número de cuenta');
select throws_ok(
  $$insert into public.investments (client_id, name, bucket, currency, balance) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Acciones', 'especulativo', 'COP', 1)$$,
  '23514', null, 'El tramo es crecimiento o estabilidad');

select lives_ok(
  $$insert into public.risk_profile (client_id, drop_reaction, experience, horizon) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'esperaria', 'algo', 'mas_7')$$,
  'El cliente responde el perfil de riesgo');
select throws_ok(
  $$update public.risk_profile set range_position = 0.9
    where client_id = 'c1c1c1c1-0000-4000-8000-000000000001'$$,
  '42501', null, 'El cliente no cambia la posición en el rango');
select throws_ok(
  $$update public.risk_profile set variable_income_override = false
    where client_id = 'c1c1c1c1-0000-4000-8000-000000000001'$$,
  '42501', null, 'Ni las condiciones de capacidad');
select throws_ok(
  $$insert into public.case_settings (client_id, retirement_age) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 65)$$,
  '42501', null, 'Ni la edad de retiro');

select is(
  (select count(*)::int from public.audit_log
   where client_id = 'c1c1c1c1-0000-4000-8000-000000000001' and actor_role = 'cliente'
     and table_name in ('goals', 'goal_trip_items', 'insurances', 'investments', 'risk_profile')),
  7, 'Cada cambio del cliente queda en el historial a su nombre');

-- Asesora A ------------------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
select lives_ok(
  $$update public.risk_profile set range_position = 0.8, variable_income_override = false
    where client_id = 'c1c1c1c1-0000-4000-8000-000000000001'$$,
  'La asesora fija la posición en el rango y una condición de capacidad');
select lives_ok(
  $$insert into public.case_settings (client_id, retirement_age, real_return_growth, life_support_years,
      life_annual_to_cover) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 65, 0.04, 15, 30000000)$$,
  'Y la edad de retiro, el rendimiento supuesto y los datos del seguro de vida');
select throws_ok(
  $$update public.case_settings set growth_floor = 1.5
    where client_id = 'c1c1c1c1-0000-4000-8000-000000000001'$$,
  '23514', null, 'El piso del % en crecimiento está entre 0 y 1');

select lives_ok(
  $$insert into public.client_fx_rates (client_id, currency, rate_to_base, as_of) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'USD', 3900, current_date)$$,
  'La asesora registra la tasa del dólar');
select lives_ok(
  $$update public.goals set trip_currency = 'USD' where name = 'Viaje'$$,
  'El viaje pasa a dólares');
select throws_ok(
  $$delete from public.client_fx_rates where currency = 'USD'$$,
  '23503', null, 'La tasa de la moneda de un viaje no se borra');
select lives_ok(
  $$update public.goals set uses_trip_calculator = false, trip_currency = null where name = 'Viaje'$$,
  'Sin la calculadora');
select lives_ok(
  $$insert into public.investments (client_id, name, currency, balance) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Fondo en dólares', 'USD', 1000)$$,
  'Una inversión en dólares, sin tramo');
select throws_ok(
  $$delete from public.client_fx_rates where currency = 'USD'$$,
  '23503', null, 'La tasa de una moneda con una inversión no se borra');

-- Asesor B sin acceso --------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222"}', true);
select is((select count(*)::int from public.goals), 0, 'Un asesor sin acceso no ve las metas');
select is((select count(*)::int from public.goal_trip_items), 0, 'Ni los conceptos del viaje');
select is((select count(*)::int from public.insurances), 0, 'Ni los seguros');
select is((select count(*)::int from public.investments), 0, 'Ni las inversiones');
select is((select count(*)::int from public.risk_profile), 0, 'Ni el perfil de riesgo');
select throws_ok(
  $$insert into public.investments (client_id, name, currency, balance) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Intrusa', 'COP', 1)$$,
  '42501', null, 'Ni los escribe');

-- Revocación -----------------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333"}', true);
update public.advisor_client_access set status = 'revoked'
where client_id = 'c1c1c1c1-0000-4000-8000-000000000001';
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
select is((select count(*)::int from public.investments), 0,
  'Al retirar el acceso, la asesora deja de ver las inversiones');
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333"}', true);
select lives_ok($$delete from public.goals where name = 'Viaje'$$,
  'El dueño sigue borrando sus metas (con sus conceptos)');
select is((select count(*)::int from public.goal_trip_items), 0, 'Los conceptos se van con la meta');

select * from finish();
rollback;
