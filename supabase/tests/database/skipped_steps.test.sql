-- Pasos omitidos (migración skipped_steps, ADR 0029): el asesor omite los pasos opcionales de una
-- etapa; el cliente los ve pero no los cambia. Solo datos inventados; todo se deshace al final.
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

select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
set local role authenticated;
select lives_ok(
  $$insert into public.case_settings (client_id) values ('c1c1c1c1-0000-4000-8000-000000000001')$$,
  'La asesora crea los supuestos del cliente');
select is((select skipped_steps from public.case_settings), array[]::text[],
  'Un cliente nuevo no tiene pasos omitidos');
select lives_ok(
  $$update public.case_settings set skipped_steps = '{debts,insurance}'$$,
  'La asesora omite las deudas y los seguros');
select is((select skipped_steps from public.case_settings), array['debts', 'insurance']::text[],
  'Y quedan guardados');
select throws_ok(
  $$update public.case_settings set skipped_steps = '{delivered}'$$,
  '23514', null, 'La entrega no se omite');
select throws_ok(
  $$update public.case_settings set skipped_steps = '{expenses}'$$,
  '23514', null, 'Los gastos no se omiten');

-- El cliente ve los pasos omitidos pero no los cambia
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333"}', true);
select is((select skipped_steps from public.case_settings), array['debts', 'insurance']::text[],
  'El cliente ve los pasos omitidos');
update public.case_settings set skipped_steps = '{}';
select is((select skipped_steps from public.case_settings), array['debts', 'insurance']::text[],
  'El cliente no los cambia (RLS no le deja la fila)');

-- Un asesor sin acceso no los ve
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222"}', true);
select is((select count(*)::int from public.case_settings), 0, 'Un asesor sin acceso no los ve');
reset role;

select * from finish();
rollback;
