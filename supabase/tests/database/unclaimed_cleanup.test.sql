-- Borrado de cuentas sin perfil a los 7 días (migración unclaimed_account_cleanup). Solo datos
-- inventados; todo se deshace al final.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (id, email, aud, role, created_at) values
  ('11111111-1111-4111-8111-111111111111', 'asesora@example.com', 'authenticated', 'authenticated', now() - interval '30 days'),
  ('33333333-3333-4333-8333-333333333333', 'cliente@example.com', 'authenticated', 'authenticated', now() - interval '30 days'),
  ('55555555-5555-4555-8555-555555555555', 'suelta.vieja@example.com', 'authenticated', 'authenticated', now() - interval '8 days'),
  ('66666666-6666-4666-8666-666666666666', 'suelta.nueva@example.com', 'authenticated', 'authenticated', now() - interval '6 days');
insert into public.advisors (id, user_id, display_name) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Asesora');
insert into public.clients (id, owner_user_id, display_name, country_code, base_currency, created_by) values
  ('c1c1c1c1-0000-4000-8000-000000000001', '33333333-3333-4333-8333-333333333333', 'Cliente', 'CO', 'COP',
   '11111111-1111-4111-8111-111111111111');

-- Al menos la de prueba: la base local puede tener otras cuentas sueltas de desarrollo.
select ok(private.delete_unclaimed_accounts() >= 1, 'Borra las cuentas sueltas');
select is(
  (select array_agg(email order by email) from auth.users
   where id in ('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333',
                '55555555-5555-4555-8555-555555555555', '66666666-6666-4666-8666-666666666666')),
  array['asesora@example.com', 'cliente@example.com', 'suelta.nueva@example.com']::varchar[],
  'Se va la cuenta sin perfil de más de 7 días; quedan la asesora, el cliente y la de 6 días');

set local role authenticated;
select throws_ok('select private.delete_unclaimed_accounts()', '42501', null,
  'Un usuario de la app no puede ejecutar el borrado');
reset role;

select is(
  (select schedule from cron.job where jobname = 'delete-unclaimed-accounts'), '0 8 * * *',
  'La tarea corre todos los días a las 08:00 UTC');

select * from finish();
rollback;
