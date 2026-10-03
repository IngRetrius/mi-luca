-- Deudas del diagnóstico (F4): inventario y método de pago. Matriz de permisos
-- (docs/03-modelo-de-datos.md, sección 5). Solo datos inventados; todo se deshace.
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

-- Visitante sin sesión -------------------------------------------------------------------------

set local role anon;
select throws_ok('select * from public.debts', '42501', null, 'anon no lee deudas');
select throws_ok('select * from public.debt_installments', '42501', null, 'anon no lee cuotas marcadas');
reset role;

-- Cliente Uno (dueño) --------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333"}', true);
set local role authenticated;

select lives_ok(
  $$insert into public.debts (client_id, name, debt_type, lender_name, currency, balance, annual_rate,
      min_payment) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Tarjeta', 'tarjeta_credito', 'Banco A', 'COP', 4000000, 0.28,
     200000)$$,
  'El cliente registra una deuda con el nombre de la entidad, sin número de tarjeta');
select lives_ok(
  $$insert into public.debts (client_id, name, debt_type, currency, balance, annual_rate, min_payment,
      accepts_extra) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Préstamo familiar', 'informal', 'COP', 5000000, 0, 250000, false)$$,
  'Y un préstamo familiar a 0 % que no acepta abonos');
select throws_ok(
  $$insert into public.debts (client_id, name, debt_type, currency, balance, annual_rate, min_payment,
      manual_order) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Vehículo', 'vehiculo', 'COP', 1000, 0.15, 100, 1)$$,
  '42501', null, 'El cliente no fija el orden de pago');
select throws_ok(
  $$update public.debts set manual_order = 1 where name = 'Tarjeta'$$,
  '42501', null, 'Ni lo cambia');
select throws_ok(
  $$insert into public.debts (client_id, name, debt_type, currency, balance, annual_rate, min_payment) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Leasing', 'leasing', 'COP', 1000, 0.15, 100)$$,
  '23514', null, 'El tipo es uno del catálogo');
select throws_ok(
  $$insert into public.debts (client_id, name, debt_type, currency, balance, annual_rate, min_payment) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Negativa', 'otro', 'COP', -1, 0.15, 100)$$,
  '23514', null, 'El saldo no es negativo');
select throws_ok(
  $$insert into public.debts (client_id, name, debt_type, currency, balance, annual_rate, min_payment,
      accepts_extra, extra_from_date) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Contradictoria', 'otro', 'COP', 1000, 0.1, 100, false,
     '2030-01-01')$$,
  '23514', null, 'Una deuda que no acepta abonos no tiene fecha desde la que los acepta');
select throws_ok(
  $$insert into public.debts (client_id, name, debt_type, currency, balance, annual_rate, min_payment) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'En dólares', 'otro', 'USD', 1000, 0.1, 100)$$,
  '23514', null, 'Una deuda en otra moneda necesita la tasa de cambio del cliente');
select lives_ok(
  $$update public.debts set balance = 3500000, extra_from_date = '2027-01-01' where name = 'Tarjeta'$$,
  'El cliente actualiza el saldo y desde cuándo acepta abonos');
select throws_ok(
  $$insert into public.case_settings (client_id, debt_method) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'bola_de_nieve')$$,
  '42501', null, 'El cliente no fija el método de pago');

-- Seguimiento cuota a cuota: el cliente lo activa y marca sus cuotas.
select lives_ok(
  $$update public.debts set first_installment_date = '2026-08-15', total_installments = 36,
      insurance_in_payment = 20000 where name = 'Tarjeta'$$,
  'El cliente activa el seguimiento cuota a cuota de una deuda');
select lives_ok(
  $$insert into public.debt_installments (debt_id, client_id, installment_number, paid, paid_on) values
    ((select id from public.debts where name = 'Tarjeta'), 'c1c1c1c1-0000-4000-8000-000000000001', 1, true,
     '2026-08-14')$$,
  'Y marca una cuota pagada con la fecha real');
select lives_ok(
  $$insert into public.debt_installments (debt_id, client_id, installment_number, extra_payment) values
    ((select id from public.debts where name = 'Tarjeta'), 'c1c1c1c1-0000-4000-8000-000000000001', 3, 500000)$$,
  'Y un abono extra en una cuota futura');
select throws_ok(
  $$insert into public.debt_installments (debt_id, client_id, installment_number, paid_on) values
    ((select id from public.debts where name = 'Tarjeta'), 'c1c1c1c1-0000-4000-8000-000000000001', 4,
     '2026-10-01')$$,
  '23514', null, 'Una fecha de pago va con la cuota marcada como pagada');
select throws_ok(
  $$update public.debts set frech_points = 0.04 where name = 'Tarjeta'$$,
  '23514', null, 'Los puntos del FRECH van con la cuota hasta la que cubre');
select throws_ok(
  $$update public.debts set extra_from_installment = 10 where name = 'Préstamo familiar'$$,
  '23514', null, 'Una deuda que no acepta abonos no tiene cuota desde la que los acepta');

select is(
  (select count(*)::int from public.audit_log
   where client_id = 'c1c1c1c1-0000-4000-8000-000000000001' and actor_role = 'cliente'
     and table_name in ('debts', 'debt_installments')),
  6, 'Cada cambio del cliente en sus deudas y cuotas queda en el historial a su nombre');

-- Asesora A ------------------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
select lives_ok(
  $$insert into public.case_settings (client_id, debt_method) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'manual')$$,
  'La asesora elige el orden manual');
select throws_ok(
  $$update public.case_settings set debt_method = 'cascada'
    where client_id = 'c1c1c1c1-0000-4000-8000-000000000001'$$,
  '23514', null, 'El método es avalancha, bola de nieve o manual');
select lives_ok(
  $$update public.debts set manual_order = 1 where name = 'Préstamo familiar'$$,
  'Y fija el lugar de cada deuda');
select is(
  (select debt_method from public.case_settings where client_id = 'c1c1c1c1-0000-4000-8000-000000000001'),
  'manual', 'El método queda guardado');
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333"}', true);
update public.case_settings set debt_method = 'avalancha'
where client_id = 'c1c1c1c1-0000-4000-8000-000000000001';
select is(
  (select debt_method from public.case_settings where client_id = 'c1c1c1c1-0000-4000-8000-000000000001'),
  'manual', 'El cliente lo ve, pero no lo cambia');
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);

-- Monedas en uso: la tasa de una moneda con una deuda no se borra.
select lives_ok(
  $$insert into public.client_fx_rates (client_id, currency, rate_to_base, as_of) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'USD', 3900, current_date)$$,
  'La asesora registra la tasa del dólar');
select lives_ok(
  $$insert into public.debts (client_id, name, debt_type, currency, balance, annual_rate, min_payment) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Préstamo en dólares', 'otro', 'USD', 2000, 0.09, 150)$$,
  'Y una deuda en dólares');
select throws_ok(
  $$delete from public.client_fx_rates where currency = 'USD'$$,
  '23503', null, 'La tasa de una moneda con una deuda no se borra');

-- Asesor B sin acceso --------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222"}', true);
select is((select count(*)::int from public.debts), 0, 'Un asesor sin acceso no ve las deudas');
select is((select count(*)::int from public.debt_installments), 0, 'Ni las cuotas marcadas');
select throws_ok(
  $$insert into public.debts (client_id, name, debt_type, currency, balance, annual_rate, min_payment) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Intrusa', 'otro', 'COP', 1, 0.1, 1)$$,
  '42501', null, 'Ni las escribe');

-- Revocación -----------------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333"}', true);
update public.advisor_client_access set status = 'revoked'
where client_id = 'c1c1c1c1-0000-4000-8000-000000000001';
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
select is((select count(*)::int from public.debts), 0, 'Al retirar el acceso, la asesora deja de ver las deudas');
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333"}', true);
select lives_ok($$delete from public.debts where name = 'Tarjeta'$$, 'El dueño sigue borrando sus deudas');

select * from finish();
rollback;
