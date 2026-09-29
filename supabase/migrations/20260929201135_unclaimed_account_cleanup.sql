-- Tarea diaria que borra las cuentas sin perfil a los 7 días (02-arquitectura, 5.3; criterio de
-- F1). Una cuenta sin perfil nace cuando alguien entra con Google sin invitación: no ve datos
-- (P-G02) y no debe quedarse guardada. No se tocan asesores ni dueños de un perfil.

create function private.delete_unclaimed_accounts(p_older_than interval default interval '7 days')
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_deleted integer;
begin
  delete from auth.users u
  where u.created_at < now() - p_older_than
    and not exists (select 1 from public.advisors a where a.user_id = u.id)
    and not exists (select 1 from public.clients c where c.owner_user_id = u.id)
    -- Quien creó perfiles o dejó consentimientos no es una cuenta suelta: se revisa a mano.
    and not exists (select 1 from public.clients c where c.created_by = u.id)
    and not exists (select 1 from public.consents k where k.user_id = u.id);
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke execute on function private.delete_unclaimed_accounts(interval) from public, anon, authenticated;

-- Supabase Cron (docs de Supabase, "Install"). Todos los días a las 08:00 UTC (03:00 en Bogotá).
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

select cron.schedule(
  'delete-unclaimed-accounts',
  '0 8 * * *',
  $$select private.delete_unclaimed_accounts()$$
);
