-- Gancho que cierra el registro público (ADR 0009, regla 2).
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

select is(
  private.before_user_created('{"user":{"app_metadata":{"provider":"google","providers":["google"]}}}'),
  '{}'::jsonb, 'Las altas con Google pasan');
select is(
  private.before_user_created('{"user":{"app_metadata":{"provider":"email","providers":["email"]}}}')
    -> 'error' ->> 'http_code',
  '403', 'Las altas por correo se rechazan');
select is(
  private.before_user_created('{"user":{"app_metadata":{"provider":"phone","providers":["phone"]}}}')
    -> 'error' ->> 'http_code',
  '403', 'Las altas por teléfono se rechazan');
select is(
  private.before_user_created('{"user":{}}') -> 'error' ->> 'http_code',
  '403', 'Sin proveedor, el alta se rechaza');
select ok(has_function_privilege('supabase_auth_admin', 'private.before_user_created(jsonb)', 'execute'),
  'Supabase Auth puede llamar al gancho');
select ok(not has_function_privilege('authenticated', 'private.before_user_created(jsonb)', 'execute'),
  'Los usuarios no pueden llamar al gancho');
select ok(not has_function_privilege('anon', 'private.before_user_created(jsonb)', 'execute'),
  'Los visitantes no pueden llamar al gancho');

select * from finish();
rollback;
