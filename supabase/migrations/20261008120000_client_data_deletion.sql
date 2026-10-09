-- Borrado de los datos de un cliente que lo pide (Ley 1581 de 2012, art. 8; RGPD, art. 17). La app no
-- lo llama: lo ejecuta el responsable desde el editor SQL del panel, con el procedimiento de
-- supabase/README.md (auditoría de lanzamiento, H5). No borra asesores ni datos de otros clientes.
create function private.delete_client_data(p_client_id uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_owner uuid;
  v_history integer;
  v_account integer := 0;
begin
  select c.owner_user_id into v_owner from public.clients c where c.id = p_client_id;
  if not found then
    raise exception 'No existe el cliente %', p_client_id using errcode = 'P0002';
  end if;

  -- 1. El perfil y todo lo que cuelga de él: las claves foráneas a clients borran en cascada.
  delete from public.clients c where c.id = p_client_id;

  -- 2. El historial no tiene clave foránea y acaba de recibir una copia de cada fila borrada.
  delete from public.audit_log a where a.client_id = p_client_id;
  get diagnostics v_history = row_count;

  -- 3. La cuenta de acceso, si la tenía y no es de un asesor.
  if v_owner is not null and not exists (select 1 from public.advisors a where a.user_id = v_owner) then
    delete from auth.users u where u.id = v_owner;
    get diagnostics v_account = row_count;
  end if;

  return jsonb_build_object(
    'client_id', p_client_id,
    'history_rows', v_history,
    'account_deleted', v_account = 1
  );
end;
$$;

revoke execute on function private.delete_client_data(uuid) from public, anon, authenticated;
