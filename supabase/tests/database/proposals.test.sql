-- F7: propuesta del asesor (ADR 0024). Matriz de permisos (docs/03-modelo-de-datos.md, sección 5).
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
insert into public.budget_items (id, client_id, category, concept, currency, amount, frequency) values
  ('b1b1b1b1-0000-4000-8000-000000000001', 'c1c1c1c1-0000-4000-8000-000000000001', 'Ocio', 'Salidas',
   'COP', 200000, 'mensual'),
  ('b1b1b1b1-0000-4000-8000-000000000002', 'c1c1c1c1-0000-4000-8000-000000000001', 'Ocio', 'Suscripción B',
   'COP', 45000, 'mensual'),
  ('b1b1b1b1-0000-4000-8000-000000000003', 'c1c1c1c1-0000-4000-8000-000000000001', 'Ocio', 'Gimnasio',
   'COP', 120000, 'mensual'),
  ('b1b1b1b1-0000-4000-8000-000000000004', 'c1c1c1c1-0000-4000-8000-000000000001', 'Ocio', 'Revistas',
   'COP', 30000, 'mensual'),
  ('b3b3b3b3-0000-4000-8000-000000000001', 'c3c3c3c3-0000-4000-8000-000000000003', 'Ocio', 'Cine',
   'COP', 60000, 'mensual');

select ok((select relrowsecurity from pg_class where oid = 'public.proposals'::regclass),
  'Las propuestas tienen RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.proposal_adjustments'::regclass),
  'Los ajustes tienen RLS');
select ok(not has_function_privilege('anon', 'public.apply_proposal(uuid, jsonb, jsonb, jsonb)', 'execute'),
  'Sin sesión no se aplica una propuesta');

set local role anon;
select throws_ok('select * from public.proposals', '42501', null, 'anon no lee propuestas');
select throws_ok('select * from public.proposal_adjustments', '42501', null, 'anon no lee ajustes');
reset role;

-- Asesora A arma la propuesta --------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
set local role authenticated;

select lives_ok(
  $$insert into public.proposals (client_id) values ('c1c1c1c1-0000-4000-8000-000000000001')$$,
  'La asesora crea una propuesta en borrador');
reset role;
select set_config('test.proposal', (select id::text from public.proposals
  where client_id = 'c1c1c1c1-0000-4000-8000-000000000001'), true);
set local role authenticated;
select throws_ok(
  $$insert into public.proposals (client_id) values ('c1c1c1c1-0000-4000-8000-000000000001')$$,
  '23505', null, 'Solo hay una propuesta en borrador por cliente');
select throws_ok(
  $$update public.proposals set status = 'aplicada', applied_at = now()$$,
  '42501', null, 'Nadie marca una propuesta como aplicada desde la API');

select lives_ok(
  $$insert into public.proposal_adjustments (proposal_id, client_id, budget_item_id, kind, amount,
      concept, currency, frequency, from_amount, reason, sort_order) values
    (current_setting('test.proposal')::uuid, 'c1c1c1c1-0000-4000-8000-000000000001',
     'b1b1b1b1-0000-4000-8000-000000000001', 'ajustar', 150000,
     'Salidas', 'COP', 'mensual', 200000, 'Dos salidas menos y llegas al viaje', 0),
    (current_setting('test.proposal')::uuid, 'c1c1c1c1-0000-4000-8000-000000000001',
     'b1b1b1b1-0000-4000-8000-000000000002', 'quitar', null,
     'Suscripción B', 'COP', 'mensual', 45000, null, 1),
    (current_setting('test.proposal')::uuid, 'c1c1c1c1-0000-4000-8000-000000000001',
     'b1b1b1b1-0000-4000-8000-000000000003', 'ajustar', 80000,
     'Gimnasio', 'COP', 'mensual', 120000, null, 2)$$,
  'Agrega ajustes: cambiar el valor y quitar un gasto');
select throws_ok(
  $$insert into public.proposal_adjustments (proposal_id, client_id, budget_item_id, kind, amount,
      concept, currency) values
    (current_setting('test.proposal')::uuid, 'c1c1c1c1-0000-4000-8000-000000000001',
     'b1b1b1b1-0000-4000-8000-000000000004', 'quitar', 10000, 'Revistas', 'COP')$$,
  '23514', null, 'Quitar no lleva valor nuevo');
select throws_ok(
  $$insert into public.proposal_adjustments (proposal_id, client_id, budget_item_id, kind, amount,
      concept, currency) values
    (current_setting('test.proposal')::uuid, 'c1c1c1c1-0000-4000-8000-000000000001',
     'b1b1b1b1-0000-4000-8000-000000000001', 'ajustar', 100000, 'Salidas', 'COP')$$,
  '23505', null, 'Un ajuste por gasto en cada propuesta');
select throws_ok(
  $$insert into public.proposal_adjustments (proposal_id, client_id, budget_item_id, kind, amount,
      concept, currency) values
    (current_setting('test.proposal')::uuid, 'c1c1c1c1-0000-4000-8000-000000000001',
     'b3b3b3b3-0000-4000-8000-000000000001', 'quitar', null, 'Cine', 'COP')$$,
  '23503', null, 'Un ajuste no apunta al gasto de otro cliente');
select throws_ok(
  $$update public.proposal_adjustments set reason = repeat('a', 501)
    where concept = 'Salidas'$$,
  '23514', null, 'El porqué tiene un límite de 500 caracteres');
select lives_ok(
  $$update public.proposal_adjustments set decision = 'aceptado'
    where concept in ('Salidas', 'Suscripción B')$$,
  'Anota que el cliente acepta dos ajustes');
select throws_ok(
  $$update public.proposal_adjustments set applied = true$$,
  '42501', null, 'La marca de aplicado solo la pone apply_proposal');

-- Asesor B y el cliente no ven la propuesta --------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222"}', true);
select is((select count(*)::int from public.proposals), 0, 'Otro asesor no ve la propuesta');
select is((select count(*)::int from public.proposal_adjustments), 0, 'Ni sus ajustes');
select throws_ok(
  $$insert into public.proposals (client_id) values ('c1c1c1c1-0000-4000-8000-000000000001')$$,
  '42501', null, 'Otro asesor no arma propuestas para ese cliente');
select throws_ok(
  $$select public.apply_proposal(current_setting('test.proposal')::uuid, '{}', '{}', '[]')$$,
  'P0002', null, 'Otro asesor no la aplica');

select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333"}', true);
select is((select count(*)::int from public.proposals), 0, 'El cliente no ve la propuesta en borrador');
select throws_ok(
  $$insert into public.proposals (client_id) values ('c1c1c1c1-0000-4000-8000-000000000001')$$,
  '42501', null, 'El cliente no arma propuestas');
select throws_ok(
  $$select public.apply_proposal(current_setting('test.proposal')::uuid, '{}', '{}', '[]')$$,
  'P0002', null, 'El cliente no la aplica');

-- La asesora aplica lo aceptado -------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
select throws_ok(
  $$select public.apply_proposal(current_setting('test.proposal')::uuid, '[]', '{}', '[]')$$,
  '22023', null, 'Las cifras tienen que ser objetos');
select lives_ok(
  $$select public.apply_proposal(current_setting('test.proposal')::uuid,
      '{"annualSurplus": 1000}', '{"annualSurplus": 2140}',
      '[{"title": "Ajustar Salidas a 150.000 (mensual)", "note": "Dos salidas menos y llegas al viaje",
         "due_date": "2026-11-04", "sort_order": 0},
        {"title": "Dejar de pagar Suscripción B", "due_date": "2026-11-04", "sort_order": 1}]')$$,
  'Aplica la propuesta');
select is((select amount from public.budget_items where id = 'b1b1b1b1-0000-4000-8000-000000000001'),
  150000::numeric, 'El gasto aceptado queda con el valor nuevo');
select is((select count(*)::int from public.budget_items where id = 'b1b1b1b1-0000-4000-8000-000000000002'),
  0, 'El gasto que se quita se borra');
select is((select amount from public.budget_items where id = 'b1b1b1b1-0000-4000-8000-000000000003'),
  120000::numeric, 'Lo pendiente no se aplica');
select results_eq(
  $$select applied, budget_item_id is null, concept, from_amount from public.proposal_adjustments
    where proposal_id = current_setting('test.proposal')::uuid order by sort_order$$,
  $$values (true, false, 'Salidas'::text, 200000::numeric), (true, true, 'Suscripción B', 45000),
           (false, false, 'Gimnasio', 120000)$$,
  'El registro marca lo aplicado y guarda el gasto borrado por su concepto y valor');
select results_eq(
  $$select title, owner_role, priority, due_date, note from public.action_items order by sort_order$$,
  $$values ('Ajustar Salidas a 150.000 (mensual)'::text, 'cliente'::text, 'media'::text,
            '2026-11-04'::date, 'Dos salidas menos y llegas al viaje'::text),
           ('Dejar de pagar Suscripción B', 'cliente', 'media', '2026-11-04', null)$$,
  'Cada ajuste aceptado crea su tarea para el cliente, con el porqué como nota');
select results_eq(
  $$select status, applied_by, after_figures ->> 'annualSurplus' from public.proposals
    where id = current_setting('test.proposal')::uuid$$,
  $$values ('aplicada'::text, '11111111-1111-4111-8111-111111111111'::uuid, '2140'::text)$$,
  'La propuesta queda aplicada, con quién la aplicó y sus cifras');

select results_eq(
  $$select a.concept, a.decision, a.amount from public.proposal_adjustments a
    join public.proposals p on p.id = a.proposal_id where p.status = 'borrador'$$,
  $$values ('Gimnasio'::text, 'pendiente'::text, 80000::numeric)$$,
  'Lo pendiente pasa a una propuesta nueva en borrador, para seguir conversándolo');

-- Lo aplicado queda fijo ----------------------------------------------------------------------------

select throws_ok(
  $$select public.apply_proposal(current_setting('test.proposal')::uuid, '{}', '{}', '[]')$$,
  'P0002', null, 'No se aplica dos veces');
select is_empty(
  $$update public.proposal_adjustments set decision = 'descartado'
    where proposal_id = current_setting('test.proposal')::uuid returning id$$,
  'Los ajustes de una propuesta aplicada no cambian');
select is_empty(
  $$delete from public.proposals where id = current_setting('test.proposal')::uuid returning id$$,
  'Una propuesta aplicada no se borra');
select throws_ok(
  $$insert into public.proposal_adjustments (proposal_id, client_id, budget_item_id, kind, concept,
      currency) values
    (current_setting('test.proposal')::uuid, 'c1c1c1c1-0000-4000-8000-000000000001',
     'b1b1b1b1-0000-4000-8000-000000000004', 'quitar', 'Revistas', 'COP')$$,
  '42501', null, 'Ni se le agregan ajustes');
select lives_ok(
  $$delete from public.budget_items where id = 'b1b1b1b1-0000-4000-8000-000000000001'$$,
  'Borrar un gasto con un ajuste aplicado sigue funcionando');
select is((select count(*)::int from public.proposal_adjustments
           where concept = 'Salidas' and budget_item_id is null),
  1, 'El ajuste queda sin gasto, con su concepto');

-- Una propuesta nueva, y un gasto que cambió de moneda -----------------------------------------------

reset role;
select set_config('test.draft', (select id::text from public.proposals
  where client_id = 'c1c1c1c1-0000-4000-8000-000000000001' and status = 'borrador'), true);
set local role authenticated;
select lives_ok(
  $$insert into public.proposal_adjustments (proposal_id, client_id, budget_item_id, kind, amount,
      concept, currency, decision) values
    (current_setting('test.draft')::uuid, 'c1c1c1c1-0000-4000-8000-000000000001',
     'b1b1b1b1-0000-4000-8000-000000000004', 'ajustar', 10, 'Revistas', 'USD', 'aceptado')$$,
  'Un ajuste propuesto en otra moneda que la del gasto');
select throws_ok(
  $$select public.apply_proposal(current_setting('test.draft')::uuid, '{}', '{}', '[]')$$,
  '22023', null, 'No se aplica si el gasto cambió de moneda');
select is((select status from public.proposals where id = current_setting('test.draft')::uuid),
  'borrador', 'Y la propuesta sigue en borrador');
select lives_ok(
  $$delete from public.proposals where id = current_setting('test.draft')::uuid$$,
  'Una propuesta en borrador se descarta');

reset role;
select ok((select count(*) from public.audit_log where table_name in ('proposals', 'proposal_adjustments')
  and client_id = 'c1c1c1c1-0000-4000-8000-000000000001') > 0,
  'La propuesta y sus ajustes quedan en el historial');
select lives_ok(
  $$delete from public.clients where id = 'c1c1c1c1-0000-4000-8000-000000000001'$$,
  'Borrar el perfil se lleva también las propuestas aplicadas');

select * from finish();
rollback;
