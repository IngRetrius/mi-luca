-- Perfiles inactivos y borrado a pedido del cliente (plan 15, ADR 0034). El asesor desactiva un
-- perfil cuando el cliente deja la asesoría y lo reactiva si vuelve: nada se borra. El borrado
-- completo lo pide el cliente, desde Privacidad y datos (delete_client) o por correo
-- (private.delete_client_data en el editor SQL). El asesor solo borra perfiles que nadie aceptó.

-- 1. Inactividad ----------------------------------------------------------------------------------

alter table public.clients add column inactive_at timestamptz;

-- Solo el asesor con acceso la cambia: se suma a las columnas de criterio profesional.
drop trigger clients_guard_advisor_columns on public.clients;
create trigger clients_guard_advisor_columns before update on public.clients
  for each row execute function private.guard_advisor_columns(
    'display_name', 'form_of_address', 'country_code', 'base_currency', 'locale', 'client_type',
    'inactive_at');

-- La fecha la pone la base: al desactivar, ahora (o la que ya tenía); al reactivar, vacía.
create function private.stamp_client_inactivity()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.inactive_at is distinct from old.inactive_at then
    new.inactive_at := case when new.inactive_at is not null then coalesce(old.inactive_at, now()) end;
  end if;
  return new;
end;
$$;

create trigger clients_stamp_inactivity before update of inactive_at on public.clients
  for each row execute function private.stamp_client_inactivity();

-- Al desactivar, la invitación pendiente deja de servir.
create function private.revoke_invitations_when_inactive()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.inactive_at is null and new.inactive_at is not null then
    update public.invitations i set revoked_at = now(), email = null
    where i.client_id = new.id and i.accepted_at is null and i.revoked_at is null;
  end if;
  return null;
end;
$$;

create trigger clients_revoke_invitations_when_inactive after update of inactive_at on public.clients
  for each row execute function private.revoke_invitations_when_inactive();

grant update (inactive_at) on public.clients to authenticated;

-- Un perfil inactivo no se invita: primero se reactiva.
create function private.is_inactive(p_client uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.clients c where c.id = p_client and c.inactive_at is not null);
$$;

grant execute on function private.is_inactive(uuid) to authenticated;

drop policy invitations_insert on public.invitations;
create policy invitations_insert on public.invitations for insert to authenticated
  with check (
    private.is_advisor_of(client_id)
    and advisor_id = (select private.current_advisor_id())
    and private.is_unclaimed(client_id)
    and not private.is_inactive(client_id)
  );

-- 2. Borrado desde la app -------------------------------------------------------------------------

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('invitacion_aceptada', 'cambio_del_cliente', 'documentos_subidos', 'cliente_borro_cuenta'));

-- El único camino para borrar un perfil desde la app. El dueño borra el suyo; el asesor con acceso,
-- solo un perfil que nadie aceptó. Borra lo mismo que private.delete_client_data (también la cuenta
-- del dueño) y, si borró el dueño, avisa a sus asesores sin decir quién era: guardar el nombre
-- contradice el borrado. Los documentos se borran antes con la API de Storage (ADR 0030).
create function public.delete_client(p_client_id uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_owner uuid;
  v_by_owner boolean;
  v_advisors uuid[];
  v_result jsonb;
begin
  -- Bloquea el perfil: nadie lo acepta mientras se decide si se puede borrar.
  select c.owner_user_id into v_owner from public.clients c where c.id = p_client_id for update;
  if not found then
    raise exception 'No se puede borrar este perfil' using errcode = '42501';
  end if;
  v_by_owner := v_owner is not null and v_owner = (select auth.uid());
  if not v_by_owner and not (v_owner is null and private.is_advisor_of(p_client_id)) then
    raise exception 'No se puede borrar este perfil' using errcode = '42501';
  end if;

  if v_by_owner then
    select array_agg(a.user_id) into v_advisors
    from public.advisor_client_access x
    join public.advisors a on a.id = x.advisor_id
    where x.client_id = p_client_id and x.status = 'active';
  end if;

  v_result := private.delete_client_data(p_client_id);

  if v_by_owner then
    insert into public.notifications (recipient_user_id, kind)
    select u, 'cliente_borro_cuenta' from unnest(coalesce(v_advisors, '{}')) as u;
  end if;
  return v_result;
end;
$$;

revoke execute on function public.delete_client(uuid) from public, anon;
grant execute on function public.delete_client(uuid) to authenticated;

-- Sin borrado directo: dejaba el historial del perfil en audit_log. La clave secreta y el editor SQL
-- siguen pudiendo.
drop policy clients_delete on public.clients;
revoke delete on public.clients from authenticated;
