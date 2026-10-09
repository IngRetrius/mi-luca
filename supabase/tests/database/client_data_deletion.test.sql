-- Borrado de los datos de un cliente a pedido suyo (migración client_data_deletion). Solo datos
-- inventados; todo se deshace al final.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (id, email, aud, role) values
  ('11111111-1111-4111-8111-111111111111', 'asesora@example.com', 'authenticated', 'authenticated'),
  ('33333333-3333-4333-8333-333333333333', 'cliente.uno@example.com', 'authenticated', 'authenticated'),
  ('44444444-4444-4444-8444-444444444444', 'cliente.dos@example.com', 'authenticated', 'authenticated');
insert into public.advisors (id, user_id, display_name) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Asesora');
insert into public.clients (id, owner_user_id, display_name, country_code, base_currency, created_by) values
  ('c1c1c1c1-0000-4000-8000-000000000001', '33333333-3333-4333-8333-333333333333', 'Cliente Uno', 'CO', 'COP',
   '11111111-1111-4111-8111-111111111111'),
  ('c2c2c2c2-0000-4000-8000-000000000002', '44444444-4444-4444-8444-444444444444', 'Cliente Dos', 'CO', 'COP',
   '11111111-1111-4111-8111-111111111111');
insert into public.advisor_client_access (advisor_id, client_id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'c1c1c1c1-0000-4000-8000-000000000001'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'c2c2c2c2-0000-4000-8000-000000000002');

-- Datos de los dos clientes en varias tablas, también en otra moneda y un plan entregado.
insert into public.consents (client_id, user_id, legal_text_id, granted)
select c.id, c.owner_user_id, t.id, true
from public.clients c
cross join (select id from public.legal_texts where kind = 'tratamiento_datos' and country_code = 'CO'
            order by version desc limit 1) t
where c.id in ('c1c1c1c1-0000-4000-8000-000000000001', 'c2c2c2c2-0000-4000-8000-000000000002');
insert into public.client_fx_rates (client_id, currency, rate_to_base, as_of) values
  ('c1c1c1c1-0000-4000-8000-000000000001', 'USD', 3900, current_date);
insert into public.incomes (client_id, name, kind, currency, amount) values
  ('c1c1c1c1-0000-4000-8000-000000000001', 'Sueldo', 'laboral', 'COP', 5000000),
  ('c1c1c1c1-0000-4000-8000-000000000001', 'Pago en dólares', 'otro', 'USD', 100),
  ('c2c2c2c2-0000-4000-8000-000000000002', 'Sueldo', 'laboral', 'COP', 4000000);
insert into public.budget_items (client_id, category, concept, currency, amount, frequency, expense_type) values
  ('c1c1c1c1-0000-4000-8000-000000000001', 'Alimentación', 'Mercado', 'COP', 800000, 'mensual', 'directo');
insert into public.debts (client_id, name, debt_type, currency, balance, annual_rate, min_payment) values
  ('c1c1c1c1-0000-4000-8000-000000000001', 'Tarjeta', 'tarjeta_credito', 'COP', 4000000, 0.28, 200000);
insert into public.plan_deliveries (client_id, label, cutoff_date, engine_version, mode, inputs, results,
    key_figures, qc_report) values
  ('c1c1c1c1-0000-4000-8000-000000000001', 'Plan inicial', '2026-09-28', '0.8.0', 'native', '{}', '{}', '{}',
   '{}');

-- Filas de un cliente en todas las tablas que cuelgan de él, más su historial.
create function pg_temp.rows_of(p_client uuid)
returns integer
language plpgsql
as $$
declare
  v_table text;
  v_count integer;
  v_total integer := 0;
begin
  for v_table in
    select c.table_name from information_schema.columns c
    join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public' and c.column_name = 'client_id' and t.table_type = 'BASE TABLE'
  loop
    execute format('select count(*) from public.%I where client_id = $1', v_table) into v_count using p_client;
    v_total := v_total + v_count;
  end loop;
  return v_total + (select count(*)::int from public.clients where id = p_client);
end;
$$;

select ok(pg_temp.rows_of('c1c1c1c1-0000-4000-8000-000000000001') > 10, 'Antes, el cliente uno tiene datos');
select ok((select count(*) from public.audit_log where client_id = 'c1c1c1c1-0000-4000-8000-000000000001') > 0,
  'y historial');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
select throws_ok($$select private.delete_client_data('c1c1c1c1-0000-4000-8000-000000000001')$$, '42501', null,
  'Ni el asesor lo puede ejecutar desde la app');
reset role;

select is(
  private.delete_client_data('c1c1c1c1-0000-4000-8000-000000000001') ->> 'account_deleted', 'true',
  'Borra al cliente uno y su cuenta');
select is(pg_temp.rows_of('c1c1c1c1-0000-4000-8000-000000000001'), 0,
  'No queda ninguna fila suya, ni en el plan entregado ni en los consentimientos');
select is((select count(*)::int from public.audit_log where client_id = 'c1c1c1c1-0000-4000-8000-000000000001'),
  0, 'Ni en el historial');
select is((select count(*)::int from auth.users where id = '33333333-3333-4333-8333-333333333333'), 0,
  'Su cuenta de acceso ya no existe');

select ok(pg_temp.rows_of('c2c2c2c2-0000-4000-8000-000000000002') > 0, 'El cliente dos sigue con sus datos');
select ok(exists (select 1 from public.audit_log where client_id = 'c2c2c2c2-0000-4000-8000-000000000002'),
  'y su historial');
select is((select count(*)::int from auth.users where id in ('11111111-1111-4111-8111-111111111111',
  '44444444-4444-4444-8444-444444444444')), 2, 'La asesora y el cliente dos conservan su cuenta');

select throws_ok($$select private.delete_client_data('c1c1c1c1-0000-4000-8000-000000000001')$$, 'P0002', null,
  'Un cliente que no existe da error en vez de no hacer nada');

-- Un perfil que nadie aceptó: se borra sin tocar cuentas.
insert into public.clients (id, display_name, country_code, base_currency, created_by) values
  ('c3c3c3c3-0000-4000-8000-000000000003', 'Borrador', 'CO', 'COP', '11111111-1111-4111-8111-111111111111');
select is(
  private.delete_client_data('c3c3c3c3-0000-4000-8000-000000000003') ->> 'account_deleted', 'false',
  'Un perfil sin dueño se borra sin cuenta que borrar');
select is((select count(*)::int from auth.users where id = '11111111-1111-4111-8111-111111111111'), 1,
  'La cuenta de la asesora que lo creó sigue');

select * from finish();
rollback;
