-- Antes y después de los cambios y aviso al asesor (F2, 03-modelo sección 7). Datos inventados.
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

-- Cifras de ejemplo con la forma de keyFigures y diffKeyFigures del motor.
create temporary table fixture (name text primary key, value jsonb);
insert into fixture values
  ('antes', '{"annualExpenses": 1000, "annualSurplus": 500}'),
  ('despues', '{"annualExpenses": 1200, "annualSurplus": 300}'),
  ('deltas', '[{"id": "annualExpenses", "kind": "amount", "before": 1000, "after": 1200}]'),
  ('despues2', '{"annualExpenses": 1300, "annualSurplus": 200}');
create temporary table marks (name text primary key, value bigint);
grant select on fixture, marks to authenticated;
insert into marks values ('inicio', coalesce((select max(id) from public.audit_log), 0));

-- Cliente: cambia un gasto y registra el impacto --------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333"}', true);
set local role authenticated;

select throws_ok(
  $$insert into public.change_impacts (client_id, actor_user_id, actor_role, audit_from_id, audit_to_id,
      engine_version, before_figures, after_figures, deltas)
    values ('c1c1c1c1-0000-4000-8000-000000000001', '33333333-3333-4333-8333-333333333333', 'cliente', 1, 1,
      '0', '{}', '{}', '[]')$$,
  '42501', null, 'Nadie escribe el antes y después directamente');
select throws_ok(
  $$insert into public.client_key_figures (client_id, engine_version, mode, figures)
    values ('c1c1c1c1-0000-4000-8000-000000000001', '0', 'native', '{}')$$,
  '42501', null, 'Ni la caché de cifras clave');

select is(
  public.record_change_impact('c1c1c1c1-0000-4000-8000-000000000001',
    (select value from marks where name = 'inicio'), '0.5.0', 'native',
    (select value from fixture where name = 'antes'), (select value from fixture where name = 'antes'), '[]'),
  null, 'Sin datos cambiados no hay antes y después');
select is((select figures from public.client_key_figures), (select value from fixture where name = 'antes'),
  'Pero la caché de cifras queda al día');

insert into public.budget_items (client_id, category, concept, currency, amount, frequency, expense_type)
values ('c1c1c1c1-0000-4000-8000-000000000001', 'Alimentación', 'Mercado', 'COP', 200, 'mensual', 'directo');

select isnt(
  public.record_change_impact('c1c1c1c1-0000-4000-8000-000000000001',
    (select value from marks where name = 'inicio'), '0.5.0', 'native',
    (select value from fixture where name = 'antes'), (select value from fixture where name = 'despues'),
    (select value from fixture where name = 'deltas')),
  null, 'Un cambio del cliente que mueve cifras queda registrado');
select results_eq(
  $$select actor_role, deltas -> 0 ->> 'id' from public.change_impacts$$,
  $$values ('cliente', 'annualExpenses')$$,
  'A nombre del cliente y con solo las cifras que cambiaron');
select is((select count(*)::int from public.notifications), 0, 'El cliente no ve los avisos del asesor');

-- Un segundo cambio dentro de 10 minutos amplía el mismo registro, con el antes del primero.
update public.budget_items set amount = 300 where concept = 'Mercado';
select is(
  public.record_change_impact('c1c1c1c1-0000-4000-8000-000000000001',
    (select value from marks where name = 'inicio'), '0.5.0', 'native',
    (select value from fixture where name = 'antes'), (select value from fixture where name = 'despues2'),
    (select value from fixture where name = 'deltas'), (select id from public.change_impacts)),
  (select id from public.change_impacts), 'Dentro de 10 minutos se amplía el mismo registro');
select results_eq(
  $$select count(*)::int, max(after_figures ->> 'annualExpenses'), max(before_figures ->> 'annualExpenses')
    from public.change_impacts$$,
  $$values (1, '1300', '1000')$$,
  'Con el después del último cambio y el antes del primero');

select throws_ok(
  $$select public.record_change_impact('c1c1c1c1-0000-4000-8000-000000000001', 0, '0.5.0', 'native',
    '[]', '{}', '[]')$$,
  '22023', null, 'Las cifras deben tener la forma del motor');

-- Asesora A: recibe el aviso; sus propios cambios no la avisan ------------------------------------

select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
select results_eq(
  $$select kind, (payload ->> 'impact_id')::uuid = (select id from public.change_impacts where actor_role = 'cliente')
    from public.notifications$$,
  $$values ('cambio_del_cliente', true)$$,
  'La asesora recibe un solo aviso por el registro agrupado');
select is((select count(*)::int from public.change_impacts), 1, 'Y ve el antes y después');

update public.budget_items set amount = 250 where concept = 'Mercado';
select isnt(
  public.record_change_impact('c1c1c1c1-0000-4000-8000-000000000001',
    (select value from marks where name = 'inicio'), '0.5.0', 'native',
    (select value from fixture where name = 'despues2'), (select value from fixture where name = 'despues'),
    (select value from fixture where name = 'deltas'),
    (select id from public.change_impacts where actor_role = 'cliente')),
  (select id from public.change_impacts where actor_role = 'cliente'),
  'El registro abierto de otra persona no se amplía');
select is((select count(*)::int from public.change_impacts where actor_role = 'asesor'), 1,
  'El cambio de la asesora queda en su propio registro, a su nombre');
select is((select count(*)::int from public.notifications), 1, 'Y no genera aviso');

-- Asesor B sin acceso ------------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222"}', true);
select throws_ok(
  $$select public.record_change_impact('c1c1c1c1-0000-4000-8000-000000000001', 0, '0.5.0', 'native',
    '{}', '{}', '[]')$$,
  '42501', null, 'Sin acceso no se registra nada');
select is((select count(*)::int from public.change_impacts), 0, 'Ni se ve');
select is((select count(*)::int from public.client_key_figures), 0, 'Ni la caché');

-- Fuera de la ventana de 10 minutos se abre un registro nuevo --------------------------------------

reset role;
update public.change_impacts set updated_at = now() - interval '11 minutes' where actor_role = 'cliente';
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333"}', true);
set local role authenticated;
update public.budget_items set amount = 400 where concept = 'Mercado';
select isnt(
  public.record_change_impact('c1c1c1c1-0000-4000-8000-000000000001',
    (select value from marks where name = 'inicio'), '0.5.0', 'native',
    (select value from fixture where name = 'despues'), (select value from fixture where name = 'despues2'),
    (select value from fixture where name = 'deltas'),
    (select id from public.change_impacts where actor_role = 'cliente' order by created_at limit 1)),
  (select id from public.change_impacts where actor_role = 'cliente' order by created_at limit 1),
  'Pasados 10 minutos, el cambio abre un registro nuevo');

reset role;
select * from finish();
rollback;
