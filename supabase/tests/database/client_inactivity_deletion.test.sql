-- Perfiles inactivos y borrado a pedido del cliente (migración client_inactivity_deletion, plan 15).
-- Solo datos inventados; todo se deshace al final.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- Asesora A con acceso a todo, asesor B sin acceso, dos clientes con cuenta, un borrador y un
-- perfil invitado.
insert into auth.users (id, email, aud, role) values
  ('11111111-1111-4111-8111-111111111111', 'asesora.a@example.com', 'authenticated', 'authenticated'),
  ('22222222-2222-4222-8222-222222222222', 'asesor.b@example.com', 'authenticated', 'authenticated'),
  ('33333333-3333-4333-8333-333333333333', 'cliente.uno@example.com', 'authenticated', 'authenticated'),
  ('44444444-4444-4444-8444-444444444444', 'cliente.dos@example.com', 'authenticated', 'authenticated');
insert into public.advisors (id, user_id, display_name) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Asesora A'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'Asesor B');
insert into public.clients (id, owner_user_id, display_name, country_code, base_currency, status, created_by) values
  ('c1c1c1c1-0000-4000-8000-000000000001', '33333333-3333-4333-8333-333333333333', 'Cliente Uno', 'CO', 'COP',
   'activo', '11111111-1111-4111-8111-111111111111'),
  ('c2c2c2c2-0000-4000-8000-000000000002', '44444444-4444-4444-8444-444444444444', 'Cliente Dos', 'CO', 'COP',
   'activo', '11111111-1111-4111-8111-111111111111'),
  ('c3c3c3c3-0000-4000-8000-000000000003', null, 'Borrador', 'CO', 'COP', 'borrador',
   '11111111-1111-4111-8111-111111111111'),
  ('c4c4c4c4-0000-4000-8000-000000000004', null, 'Invitado', 'CO', 'COP', 'borrador',
   '11111111-1111-4111-8111-111111111111');
insert into public.advisor_client_access (advisor_id, client_id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'c1c1c1c1-0000-4000-8000-000000000001'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'c2c2c2c2-0000-4000-8000-000000000002'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'c3c3c3c3-0000-4000-8000-000000000003'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'c4c4c4c4-0000-4000-8000-000000000004');
insert into public.invitations (client_id, advisor_id, email, token_hash) values
  ('c4c4c4c4-0000-4000-8000-000000000004', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'invitado@example.com',
   sha256(convert_to('token-invitado', 'UTF8')));
insert into public.incomes (client_id, name, kind, currency, amount) values
  ('c1c1c1c1-0000-4000-8000-000000000001', 'Sueldo', 'laboral', 'COP', 5000000),
  ('c3c3c3c3-0000-4000-8000-000000000003', 'Sueldo', 'laboral', 'COP', 3000000);

-- Inactividad --------------------------------------------------------------------------------------

select has_column('public', 'clients', 'inactive_at', 'Los perfiles tienen fecha de inactividad');
select is((select count(*)::int from public.clients where inactive_at is not null), 0,
  'Todos los perfiles empiezan activos');

select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
set local role authenticated;
select lives_ok(
  $$update public.clients set inactive_at = '2000-01-01' where id = 'c1c1c1c1-0000-4000-8000-000000000001'$$,
  'La asesora desactiva un perfil activo');
reset role;
select is((select inactive_at from public.clients where id = 'c1c1c1c1-0000-4000-8000-000000000001'), now(),
  'La fecha la pone la base, no quien desactiva');

select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
set local role authenticated;
update public.clients set inactive_at = '2030-01-01' where id = 'c1c1c1c1-0000-4000-8000-000000000001';
reset role;
select is((select inactive_at from public.clients where id = 'c1c1c1c1-0000-4000-8000-000000000001'), now(),
  'Desactivar otra vez no cambia la fecha');
select is(
  (select actor_role from public.audit_log
   where table_name = 'clients' and client_id = 'c1c1c1c1-0000-4000-8000-000000000001'
     and 'inactive_at' = any (changed_cols)),
  'asesor', 'El historial registra quién lo desactivó');

-- El cliente de un perfil inactivo sigue con sus datos, pero no cambia la inactividad.
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333"}', true);
set local role authenticated;
select is((select count(*)::int from public.incomes where client_id = 'c1c1c1c1-0000-4000-8000-000000000001'),
  1, 'El cliente de un perfil inactivo sigue viendo sus datos');
select lives_ok(
  $$update public.clients set dependents_count = 2 where id = 'c1c1c1c1-0000-4000-8000-000000000001'$$,
  'y cambiándolos');
select throws_ok(
  $$update public.clients set inactive_at = null where id = 'c1c1c1c1-0000-4000-8000-000000000001'$$,
  '42501', 'El campo inactive_at solo lo puede cambiar el asesor', 'El cliente no se reactiva');
reset role;

select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222"}', true);
set local role authenticated;
update public.clients set inactive_at = null where id = 'c1c1c1c1-0000-4000-8000-000000000001';
reset role;
select isnt((select inactive_at from public.clients where id = 'c1c1c1c1-0000-4000-8000-000000000001'), null,
  'Un asesor sin acceso no lo reactiva');

set local role anon;
select throws_ok(
  $$update public.clients set inactive_at = null where id = 'c1c1c1c1-0000-4000-8000-000000000001'$$,
  '42501', null, 'anon tampoco');
reset role;

select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
set local role authenticated;
select lives_ok(
  $$update public.clients set inactive_at = null where id = 'c1c1c1c1-0000-4000-8000-000000000001'$$,
  'La asesora lo reactiva');
reset role;
select is((select inactive_at from public.clients where id = 'c1c1c1c1-0000-4000-8000-000000000001'), null,
  'Reactivado, queda sin fecha');
select is((select dependents_count::int from public.clients where id = 'c1c1c1c1-0000-4000-8000-000000000001'),
  2, 'y con todos sus datos');

-- Un asesor al que el cliente le retiró el acceso no lo desactiva.
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-8444-444444444444"}', true);
set local role authenticated;
update public.advisor_client_access set status = 'revoked'
  where client_id = 'c2c2c2c2-0000-4000-8000-000000000002';
reset role;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
set local role authenticated;
update public.clients set inactive_at = now() where id = 'c2c2c2c2-0000-4000-8000-000000000002';
reset role;
select is((select inactive_at from public.clients where id = 'c2c2c2c2-0000-4000-8000-000000000002'), null,
  'Sin acceso, la asesora no lo desactiva');
update public.advisor_client_access set status = 'active', revoked_at = null, revoked_by = null
  where client_id = 'c2c2c2c2-0000-4000-8000-000000000002';

-- Invitaciones de un perfil inactivo.
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
set local role authenticated;
update public.clients set inactive_at = now() where id = 'c4c4c4c4-0000-4000-8000-000000000004';
reset role;
select is(
  (select count(*)::int from public.invitations
   where client_id = 'c4c4c4c4-0000-4000-8000-000000000004' and revoked_at is not null and email is null),
  1, 'Desactivar anula la invitación pendiente y borra su correo');
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
set local role authenticated;
select throws_ok(
  $$insert into public.invitations (client_id, token_hash)
    values ('c4c4c4c4-0000-4000-8000-000000000004', sha256(convert_to('token-nuevo', 'UTF8')))$$,
  '42501', null, 'Un perfil inactivo no se invita');
update public.clients set inactive_at = null where id = 'c4c4c4c4-0000-4000-8000-000000000004';
select lives_ok(
  $$insert into public.invitations (client_id, token_hash)
    values ('c4c4c4c4-0000-4000-8000-000000000004', sha256(convert_to('token-nuevo', 'UTF8')))$$,
  'Reactivado, se invita otra vez');
reset role;

-- Borrado ------------------------------------------------------------------------------------------

set local role anon;
select throws_ok($$select public.delete_client('c3c3c3c3-0000-4000-8000-000000000003')$$, '42501', null,
  'anon no borra perfiles');
reset role;

select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222"}', true);
set local role authenticated;
select throws_ok($$select public.delete_client('c3c3c3c3-0000-4000-8000-000000000003')$$, '42501', null,
  'Un asesor sin acceso no borra un borrador');
reset role;

select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-8444-444444444444"}', true);
set local role authenticated;
select throws_ok($$select public.delete_client('c1c1c1c1-0000-4000-8000-000000000001')$$, '42501', null,
  'Un cliente no borra el perfil de otro');
reset role;

select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
set local role authenticated;
select throws_ok($$select public.delete_client('c1c1c1c1-0000-4000-8000-000000000001')$$, '42501', null,
  'La asesora no borra un perfil que ya tiene dueño');
select throws_ok($$select public.delete_client('c9c9c9c9-0000-4000-8000-000000000009')$$, '42501', null,
  'Un perfil que no existe da el mismo error');
select throws_ok($$delete from public.clients where id = 'c3c3c3c3-0000-4000-8000-000000000003'$$, '42501', null,
  'Nadie borra perfiles con delete directo');
select is(
  public.delete_client('c3c3c3c3-0000-4000-8000-000000000003') ->> 'account_deleted', 'false',
  'La asesora borra un borrador, sin cuenta que borrar');
reset role;
select is((select count(*)::int from public.clients where id = 'c3c3c3c3-0000-4000-8000-000000000003'), 0,
  'El borrador ya no existe');
select is((select count(*)::int from public.incomes where client_id = 'c3c3c3c3-0000-4000-8000-000000000003'), 0,
  'ni sus datos');
select is((select count(*)::int from public.audit_log where client_id = 'c3c3c3c3-0000-4000-8000-000000000003'),
  0, 'ni su historial');
select is((select count(*)::int from public.notifications where kind = 'cliente_borro_cuenta'), 0,
  'Borrar un borrador no avisa a nadie');

-- Con documentos en Storage, se niega: la app los borra antes con la API de Storage.
insert into storage.objects (bucket_id, name) values
  ('client-files', 'c2c2c2c2-0000-4000-8000-000000000002/f1f1f1f1-0000-4000-8000-000000000001.pdf');
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-8444-444444444444"}', true);
set local role authenticated;
select throws_ok($$select public.delete_client('c2c2c2c2-0000-4000-8000-000000000002')$$, '55000', null,
  'Con documentos en Storage no se borra');
reset role;
select is((select count(*)::int from public.clients where id = 'c2c2c2c2-0000-4000-8000-000000000002'), 1,
  'y el perfil sigue');
set local storage.allow_delete_query = 'true';
delete from storage.objects where bucket_id = 'client-files';
reset storage.allow_delete_query;

-- El dueño borra su perfil, aunque esté inactivo.
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
set local role authenticated;
update public.clients set inactive_at = now() where id = 'c1c1c1c1-0000-4000-8000-000000000001';
reset role;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333"}', true);
set local role authenticated;
select is(
  public.delete_client('c1c1c1c1-0000-4000-8000-000000000001') ->> 'account_deleted', 'true',
  'El cliente borra su perfil y su cuenta');
reset role;
select is((select count(*)::int from public.clients where id = 'c1c1c1c1-0000-4000-8000-000000000001'), 0,
  'El perfil ya no existe');
select is((select count(*)::int from public.incomes where client_id = 'c1c1c1c1-0000-4000-8000-000000000001'), 0,
  'ni sus datos');
select is((select count(*)::int from public.audit_log where client_id = 'c1c1c1c1-0000-4000-8000-000000000001'),
  0, 'ni su historial');
select is((select count(*)::int from auth.users where id = '33333333-3333-4333-8333-333333333333'), 0,
  'ni su cuenta de acceso');
select is((select count(*)::int from auth.users where id in ('11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222', '44444444-4444-4444-8444-444444444444')), 3,
  'Las demás cuentas siguen');
select results_eq(
  $$select recipient_user_id, client_id, payload from public.notifications where kind = 'cliente_borro_cuenta'$$,
  $$values ('11111111-1111-4111-8111-111111111111'::uuid, null::uuid, '{}'::jsonb)$$,
  'Su asesora recibe un aviso sin el perfil ni su nombre; el asesor sin acceso, no');

select * from finish();
rollback;
