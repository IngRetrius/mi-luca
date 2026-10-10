-- Documentos del cliente (ADR 0030): los extractos y soportes que el cliente sube antes de la
-- videollamada. Los archivos viven en el bucket privado `client-files`, en la carpeta de su perfil
-- (`{client_id}/{id}.{pdf|jpg|png}`), y son temporales: se borran cuando el asesor los revisa,
-- cuando el cliente los borra o a los 30 días. Aquí queda una fila sin contenido por archivo, sin
-- el nombre original (puede traer números). Nada de esto entra al cálculo.
--
-- Borrar un archivo es siempre con la API de Storage: borrar la fila de `storage.objects` en SQL
-- deja el archivo huérfano [F79]. Por eso la fila se marca primero y el archivo se borra después;
-- lo que quede sin fila activa lo quita el borrado diario (`client_files_orphans`).

-- 1. Bucket ---------------------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('client-files', 'client-files', false, 10485760,
        array['application/pdf', 'image/jpeg', 'image/png']);

-- La carpeta de un archivo es el perfil del cliente. Null si el primer tramo no es un uuid.
create function private.client_of_file(p_name text)
returns uuid
language sql immutable set search_path = ''
as $$
  select case
    when split_part(p_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(p_name, '/', 1)::uuid
  end;
$$;

-- 2. Tabla ----------------------------------------------------------------------------------------

create table public.client_files (
  id             uuid primary key,
  client_id      uuid not null references public.clients (id) on delete cascade,
  kind           text not null check (kind in ('tarjeta', 'cuenta', 'credito', 'ingresos', 'otro')),
  mime_type      text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  size_bytes     integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  storage_path   text not null unique,
  uploaded_by    uuid,
  uploaded_at    timestamptz not null default now(),
  expires_at     timestamptz not null default now() + interval '30 days',
  deleted_at     timestamptz,
  deleted_reason text check (deleted_reason in ('revisado', 'cliente', 'vencido')),
  updated_at     timestamptz not null default now(),
  updated_by     uuid,
  check ((deleted_at is null) = (deleted_reason is null)),
  -- La ruta es la carpeta del perfil y el id de la fila, con la extensión de su formato.
  check (storage_path = client_id::text || '/' || id::text || case mime_type
    when 'application/pdf' then '.pdf' when 'image/jpeg' then '.jpg' else '.png' end)
);
create index client_files_active_idx on public.client_files (client_id, uploaded_at desc)
  where deleted_at is null;
create index client_files_expires_idx on public.client_files (expires_at) where deleted_at is null;

-- La base pone quién, cuándo y el vencimiento; no deja más de 20 archivos activos por cliente. Lo
-- único que cambia después es el borrado, una sola vez y con el motivo de quien borra: el asesor
-- revisa, el cliente borra los suyos y el borrado diario (clave secreta, sin sesión) vence. Corre
-- como su dueño: la clave secreta no tiene permiso sobre el esquema `private`.
create function private.guard_client_file()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    if (select count(*) from public.client_files f
        where f.client_id = new.client_id and f.deleted_at is null) >= 20 then
      raise exception 'Ya hay 20 documentos activos para este cliente' using errcode = '23514';
    end if;
    new.uploaded_by := v_actor;
    new.uploaded_at := now();
    new.expires_at := now() + interval '30 days';
    new.deleted_at := null;
    new.deleted_reason := null;
    return new;
  end if;

  if (to_jsonb(new) - array['deleted_at', 'deleted_reason', 'updated_at', 'updated_by'])
     is distinct from (to_jsonb(old) - array['deleted_at', 'deleted_reason', 'updated_at', 'updated_by']) then
    raise exception 'Un documento solo se marca como borrado' using errcode = '55000';
  end if;
  if new.deleted_reason is not distinct from old.deleted_reason then
    new.deleted_at := old.deleted_at;
    return new;
  end if;
  if old.deleted_reason is not null or new.deleted_reason is null then
    raise exception 'El documento ya se borró' using errcode = '55000';
  end if;
  if (new.deleted_reason = 'revisado' and not private.is_advisor_of(new.client_id))
     or (new.deleted_reason = 'cliente' and not private.is_client_owner(new.client_id))
     or (new.deleted_reason = 'vencido' and v_actor is not null) then
    raise exception 'Motivo de borrado no permitido' using errcode = '42501';
  end if;
  new.deleted_at := now();
  return new;
end;
$$;

create trigger client_files_guard before insert or update on public.client_files
  for each row execute function private.guard_client_file();
create trigger client_files_stamp before insert or update on public.client_files
  for each row execute function private.stamp_update();
create trigger client_files_audit after insert or update or delete on public.client_files
  for each row execute function private.audit_row('client_id', 'updated_by');

-- RLS (matriz de permisos): el cliente registra lo que subió; él y su asesor lo ven y lo borran.
alter table public.client_files enable row level security;
revoke all on public.client_files from anon, authenticated;
grant select,
  insert (id, client_id, kind, mime_type, size_bytes, storage_path),
  update (deleted_reason)
  on public.client_files to authenticated;
create policy client_files_select on public.client_files for select to authenticated
  using (private.can_access(client_id));
create policy client_files_insert on public.client_files for insert to authenticated
  with check (private.is_client_owner(client_id));
create policy client_files_update on public.client_files for update to authenticated
  using (private.can_access(client_id)) with check (private.can_access(client_id));

-- 3. Storage --------------------------------------------------------------------------------------

-- El dueño sube solo a la carpeta de su perfil, con el nombre que espera la fila. El dueño y el
-- asesor con acceso descargan y borran. Sin política de actualización: no se sobrescribe.
create policy client_files_objects_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'client-files'
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(pdf|jpg|png)$'
    and private.is_client_owner(private.client_of_file(name))
  );
create policy client_files_objects_select on storage.objects for select to authenticated
  using (bucket_id = 'client-files' and private.can_access(private.client_of_file(name)));
create policy client_files_objects_delete on storage.objects for delete to authenticated
  using (bucket_id = 'client-files' and private.can_access(private.client_of_file(name)));

-- Archivos sin fila activa (vencidos, revisados o subidos sin registrar) de más de una hora: los
-- borra con la API de Storage el borrado diario. Solo la clave secreta.
create function public.client_files_orphans()
returns setof text
language sql stable security definer set search_path = ''
as $$
  select o.name
  from storage.objects o
  where o.bucket_id = 'client-files'
    and o.created_at < now() - interval '1 hour'
    and not exists (
      select 1 from public.client_files f
      where f.storage_path = o.name and f.deleted_at is null
    )
  order by o.name
  limit 1000;
$$;
revoke execute on function public.client_files_orphans() from public, anon, authenticated;
grant execute on function public.client_files_orphans() to service_role;

-- 4. Aviso al asesor ------------------------------------------------------------------------------

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('invitacion_aceptada', 'cambio_del_cliente', 'documentos_subidos'));

-- Cuando el cliente sube un documento, avisa a sus asesores con acceso; uno sin leer por cliente.
create function private.notify_client_file()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_client_owner(new.client_id) then
    return null;
  end if;
  insert into public.notifications (recipient_user_id, client_id, kind)
  select a.user_id, new.client_id, 'documentos_subidos'
  from public.advisor_client_access x
  join public.advisors a on a.id = x.advisor_id
  where x.client_id = new.client_id and x.status = 'active'
    and not exists (
      select 1 from public.notifications n
      where n.recipient_user_id = a.user_id and n.client_id = new.client_id
        and n.kind = 'documentos_subidos' and n.read_at is null
    );
  return null;
end;
$$;

create trigger client_files_notify after insert on public.client_files
  for each row execute function private.notify_client_file();

-- 5. Paso omitible de la ficha (ADR 0029) -----------------------------------------------------------

alter table public.case_settings drop constraint case_settings_skipped_steps_check;
alter table public.case_settings add constraint case_settings_skipped_steps_check
  check (skipped_steps <@ array['documents', 'accounts', 'pockets', 'realityCheck', 'debts',
    'assets', 'insurance', 'goals', 'riskProfile']::text[]);

-- 6. Borrado de un cliente ------------------------------------------------------------------------

-- Igual que antes, pero se niega si quedan archivos del cliente en Storage: borrar la fila no
-- borra el archivo. Se borran antes con la API de Storage (supabase/README.md).
create or replace function private.delete_client_data(p_client_id uuid)
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

  if exists (
    select 1 from storage.objects o
    where o.bucket_id = 'client-files' and private.client_of_file(o.name) = p_client_id
  ) then
    raise exception 'El cliente % todavía tiene documentos en Storage', p_client_id
      using errcode = '55000',
            hint = 'Bórralos antes en Storage, carpeta ' || p_client_id || ' del bucket client-files.';
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
