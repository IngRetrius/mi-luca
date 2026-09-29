-- Registro público cerrado (ADR 0009, regla 2). Supabase Auth llama a esta función antes de crear
-- cualquier usuario ([auth.hook.before_user_created] en config.toml) y solo deja pasar las altas con
-- Google; las demás (correo, teléfono, anónimas) reciben un 403. Las cuentas con contraseña las crea
-- el servidor desde una invitación con la API de administración, que no pasa por el gancho.

create function private.before_user_created(event jsonb)
returns jsonb
language sql immutable set search_path = ''
as $$
  select case
    when event -> 'user' -> 'app_metadata' ->> 'provider' = 'google' then '{}'::jsonb
    else jsonb_build_object('error', jsonb_build_object(
      'http_code', 403,
      'message', 'El acceso es por invitación de tu asesor.'))
  end;
$$;

grant usage on schema private to supabase_auth_admin;
grant execute on function private.before_user_created(jsonb) to supabase_auth_admin;
revoke execute on function private.before_user_created(jsonb) from public, anon, authenticated;
