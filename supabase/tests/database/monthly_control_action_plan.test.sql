-- F7: control mensual y plan de acción. Matriz de permisos (docs/03-modelo-de-datos.md, sección 5).
-- Solo datos inventados; todo se deshace.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- Asesora A con un perfil con dueño (Cliente Uno, COP); asesor B con su propio cliente.
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

select ok((select relrowsecurity from pg_class where oid = 'public.monthly_control_entries'::regclass),
  'El control mensual tiene RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.action_items'::regclass),
  'El plan de acción tiene RLS');

-- Visitante sin sesión -------------------------------------------------------------------------

set local role anon;
select throws_ok('select * from public.monthly_control_entries', '42501', null, 'anon no lee el control mensual');
select throws_ok('select * from public.action_items', '42501', null, 'anon no lee el plan de acción');
reset role;

-- Asesora A ------------------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
set local role authenticated;

select lives_ok(
  $$insert into public.action_items (client_id, suggestion_key, title, priority, owner_role, due_date) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'create_pockets', 'Crear los bolsillos', 'alta', 'cliente',
     '2026-10-05'),
    ('c1c1c1c1-0000-4000-8000-000000000001', null, 'Tarea del asesor', 'media', 'asesor', null)$$,
  'La asesora crea tareas sugeridas y escritas a mano');
select throws_ok(
  $$insert into public.action_items (client_id, suggestion_key, title, priority, owner_role) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'create_pockets', 'Otra vez', 'alta', 'cliente')$$,
  '23505', null, 'Cada sugerencia se agrega una sola vez');
select lives_ok(
  $$insert into public.action_items (client_id, title, priority, owner_role) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Otra tarea a mano', 'baja', 'contador')$$,
  'Las tareas a mano no chocan entre sí');
select throws_ok(
  $$insert into public.action_items (client_id, title, priority, owner_role) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Responsable inventado', 'alta', 'banco')$$,
  '23514', null, 'El responsable es uno de la lista');
select lives_ok(
  $$insert into public.monthly_control_entries (client_id, year, month, category, currency, amount) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 2026, 10, 'Vivienda', 'COP', 1200000)$$,
  'La asesora registra un gasto real');
select throws_ok(
  $$insert into public.monthly_control_entries (client_id, year, month, category, currency, amount) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 2026, 10, 'Viajes', 'USD', 100)$$,
  '23514', null, 'Una moneda sin tasa no se registra');
insert into public.client_fx_rates (client_id, currency, rate_to_base, as_of) values
  ('c1c1c1c1-0000-4000-8000-000000000001', 'USD', 4000, '2026-09-28');
select lives_ok(
  $$insert into public.monthly_control_entries (client_id, year, month, category, currency, amount) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 2026, 10, 'Viajes', 'USD', 100)$$,
  'Con la tasa, sí');
select throws_ok(
  $$delete from public.client_fx_rates where client_id = 'c1c1c1c1-0000-4000-8000-000000000001'
    and currency = 'USD'$$,
  '23503', null, 'La tasa de una moneda usada en el control mensual no se borra');
select throws_ok(
  $$insert into public.monthly_control_entries (client_id, year, month, category, currency, amount) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 2026, 13, 'Vivienda', 'COP', 1)$$,
  '23514', null, 'El mes va de 1 a 12');

-- Cliente Uno (dueño) --------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333"}', true);

select is((select count(*)::int from public.action_items), 3, 'El cliente ve sus tareas');
select lives_ok(
  $$update public.action_items set status = 'hecho', note = 'Listo'
    where suggestion_key = 'create_pockets'$$,
  'El cliente marca su tarea hecha con una nota');
select is(
  (select completed_by from public.action_items where suggestion_key = 'create_pockets'),
  '33333333-3333-4333-8333-333333333333'::uuid,
  'La base anota quién la terminó');
select ok((select completed_at is not null from public.action_items where suggestion_key = 'create_pockets'),
  'Y cuándo');
select lives_ok(
  $$update public.action_items set status = 'en_curso' where suggestion_key = 'create_pockets'$$,
  'El cliente la reabre');
select ok((select completed_at is null and completed_by is null from public.action_items
  where suggestion_key = 'create_pockets'), 'Al reabrirla se borran la fecha y el autor');
select throws_ok(
  $$update public.action_items set due_date = '2027-01-01' where suggestion_key = 'create_pockets'$$,
  '42501', null, 'El cliente no cambia la fecha límite');
select throws_ok(
  $$update public.action_items set title = 'Otra cosa' where suggestion_key = 'create_pockets'$$,
  '42501', null, 'Ni el título');
select throws_ok(
  $$update public.action_items set completed_at = now()$$,
  '42501', null, 'Ni escribe la fecha de terminada');
select throws_ok(
  $$insert into public.action_items (client_id, title, priority, owner_role) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Tarea del cliente', 'alta', 'cliente')$$,
  '42501', null, 'El cliente no crea tareas');
delete from public.action_items where title = 'Tarea del asesor';
select is((select count(*)::int from public.action_items), 3, 'Ni las borra');

select lives_ok(
  $$insert into public.monthly_control_entries (client_id, year, month, category, currency, amount) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 2026, 10, 'Alimentación', 'COP', 0)$$,
  'El cliente registra un mes sin gasto en una categoría');
select lives_ok(
  $$update public.monthly_control_entries set amount = 1300000
    where category = 'Vivienda' and year = 2026 and month = 10$$,
  'Corrige lo que registró la asesora');
select lives_ok(
  $$insert into public.monthly_control_entries (client_id, year, month, category, currency, amount) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 2026, 10, 'Vivienda', 'COP', 1300000)
    on conflict (client_id, year, month, category) do update
    set client_id = excluded.client_id, year = excluded.year, month = excluded.month,
      category = excluded.category, currency = excluded.currency, amount = excluded.amount$$,
  'Guarda el mes con upsert, como la pantalla');
select throws_ok(
  $$update public.monthly_control_entries set client_id = 'c3c3c3c3-0000-4000-8000-000000000003'
    where category = 'Vivienda'$$,
  '42501', null, 'No pasa un registro a otro cliente');
select is(
  (select updated_by from public.monthly_control_entries where category = 'Vivienda'),
  '33333333-3333-4333-8333-333333333333'::uuid,
  'Queda quién lo cambió');
select throws_ok(
  $$insert into public.monthly_control_entries (client_id, year, month, category, currency, amount) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 2026, 10, 'Vivienda', 'COP', 5)$$,
  '23505', null, 'Un registro por categoría y mes');
select lives_ok(
  $$delete from public.monthly_control_entries where category = 'Alimentación'$$,
  'Y borra un registro');
select is(
  (select count(*)::int from public.audit_log where table_name = 'monthly_control_entries'
   and client_id = 'c1c1c1c1-0000-4000-8000-000000000001'),
  5, 'Cada cambio del control mensual queda en el historial (guardar lo mismo no cuenta)');

-- Asesor B sin acceso --------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222"}', true);
select is((select count(*)::int from public.action_items
  where client_id = 'c1c1c1c1-0000-4000-8000-000000000001'), 0, 'Un asesor sin acceso no ve las tareas');
select is((select count(*)::int from public.monthly_control_entries
  where client_id = 'c1c1c1c1-0000-4000-8000-000000000001'), 0, 'Ni el control mensual');
select throws_ok(
  $$insert into public.action_items (client_id, title, priority, owner_role) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 'Intruso', 'alta', 'cliente')$$,
  '42501', null, 'Ni crea tareas');
select throws_ok(
  $$insert into public.monthly_control_entries (client_id, year, month, category, currency, amount) values
    ('c1c1c1c1-0000-4000-8000-000000000001', 2026, 11, 'Vivienda', 'COP', 1)$$,
  '42501', null, 'Ni registra gastos');

-- Revocación -----------------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333"}', true);
update public.advisor_client_access set status = 'revoked'
where client_id = 'c1c1c1c1-0000-4000-8000-000000000001';
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
select is((select count(*)::int from public.action_items
  where client_id = 'c1c1c1c1-0000-4000-8000-000000000001'), 0,
  'Al revocar, la asesora deja de ver las tareas');
select is((select count(*)::int from public.monthly_control_entries
  where client_id = 'c1c1c1c1-0000-4000-8000-000000000001'), 0, 'Y el control mensual');

reset role;
select * from finish();
rollback;
