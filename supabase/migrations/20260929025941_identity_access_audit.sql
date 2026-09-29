-- Identidad, acceso e invitaciones (F1), con RLS, historial de cambios y guardas de columnas.
-- Modelo: docs/03-modelo-de-datos.md, secciones 3.1, 3.5 (audit_log), 4 y 5. Las diferencias con
-- el borrador están en la sección 11 de ese documento.
--
-- Defensa en dos capas: RLS decide qué filas ve y cambia cada usuario, y los privilegios por columna
-- deciden qué columnas puede escribir el rol `authenticated`. `anon` no tiene acceso a nada. Los
-- cambios que vinculan cuentas o dan acceso solo pasan por funciones `security definer`.

-- 1. Esquema privado ------------------------------------------------------------------------------

create schema private;
revoke all on schema private from public;
-- Las políticas RLS llaman a funciones de este esquema con el rol del usuario. La API no lo expone.
grant usage on schema private to authenticated;
alter default privileges in schema private revoke execute on functions from public;

-- 2. Países ---------------------------------------------------------------------------------------

create table public.countries (
  code             char(2) primary key check (code ~ '^[A-Z]{2}$'),
  name             text not null,
  default_currency char(3) not null check (default_currency ~ '^[A-Z]{3}$'),
  default_locale   text not null,
  pension_module   text check (pension_module in ('co', 'es_info')),
  enabled          boolean not null default true
);

-- Catálogo que necesita producción; por eso va aquí y no en seed/ (db push no carga semillas).
insert into public.countries (code, name, default_currency, default_locale, pension_module) values
  ('CO', 'Colombia', 'COP', 'es-CO', 'co'),
  ('ES', 'España', 'EUR', 'es-ES', 'es_info');

-- 3. Asesores, clientes, acceso e invitaciones ----------------------------------------------------

create table public.advisors (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null unique references auth.users (id) on delete restrict,
  display_name text not null check (btrim(display_name) <> ''),
  brand_name   text,
  created_at   timestamptz not null default now()
);

create function private.current_advisor_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select a.id from public.advisors a where a.user_id = (select auth.uid());
$$;

create table public.clients (
  id                    uuid primary key default gen_random_uuid(),
  owner_user_id         uuid unique references auth.users (id) on delete set null, -- null hasta aceptar
  display_name          text not null check (btrim(display_name) <> ''),
  form_of_address       text not null default 'tu' check (form_of_address in ('tu', 'usted')),
  country_code          char(2) not null references public.countries (code),
  base_currency         char(3) not null check (base_currency ~ '^[A-Z]{3}$'),
  locale                text not null default 'es',
  birth_date            date,
  sex                   text check (sex in ('mujer', 'hombre')),
  client_type           text check (client_type in
                          ('empleado', 'contratista', 'independiente_variable', 'pensionado', 'rentista', 'mixto')),
  dependents_count      smallint not null default 0 check (dependents_count >= 0),
  status                text not null default 'borrador'
                          check (status in ('borrador', 'invitado', 'activo', 'borrado_solicitado')),
  created_by            uuid not null references auth.users (id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deletion_requested_at timestamptz
);
create index clients_country_code_idx on public.clients (country_code);
create index clients_created_by_idx on public.clients (created_by);

create table public.advisor_client_access (
  advisor_id uuid not null references public.advisors (id),
  client_id  uuid not null references public.clients (id) on delete cascade,
  status     text not null default 'active' check (status in ('active', 'revoked')),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references auth.users (id) on delete set null,
  primary key (advisor_id, client_id),
  check ((status = 'revoked') = (revoked_at is not null))
);
create index advisor_client_access_client_id_idx on public.advisor_client_access (client_id);
create index advisor_client_access_revoked_by_idx on public.advisor_client_access (revoked_by);

create table public.invitations (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients (id) on delete cascade,
  advisor_id  uuid not null default private.current_advisor_id() references public.advisors (id),
  email       text check (length(email) <= 254),  -- solo para enviar; se borra al aceptar
  token_hash  bytea not null unique check (octet_length(token_hash) = 32), -- sha256 del token
  expires_at  timestamptz not null default now() + interval '7 days', -- C4 (Supuesto)
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index invitations_client_id_idx on public.invitations (client_id);
create index invitations_advisor_id_idx on public.invitations (advisor_id);
create index invitations_accepted_by_idx on public.invitations (accepted_by);

-- 4. Historial de cambios -------------------------------------------------------------------------

create table public.audit_log (
  id            bigint generated always as identity primary key,
  occurred_at   timestamptz not null default now(),
  actor_user_id uuid,
  actor_role    text check (actor_role in ('cliente', 'asesor', 'sistema')),
  client_id     uuid,                               -- sin FK: se borra aparte al suprimir datos
  table_name    text not null,
  row_pk        jsonb not null,
  action        text not null check (action in ('insert', 'update', 'delete')),
  old_values    jsonb,
  new_values    jsonb,
  changed_cols  text[]
);
create index audit_log_client_id_occurred_at_idx on public.audit_log (client_id, occurred_at desc);

-- 5. Funciones de apoyo para RLS (sección 4 del modelo) -------------------------------------------

create function private.is_client_owner(p_client uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.clients c
    where c.id = p_client and c.owner_user_id = (select auth.uid())
  );
$$;

create function private.is_advisor_of(p_client uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.advisor_client_access x
    join public.advisors a on a.id = x.advisor_id
    where x.client_id = p_client and x.status = 'active' and a.user_id = (select auth.uid())
  );
$$;

create function private.can_access(p_client uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.is_client_owner(p_client) or private.is_advisor_of(p_client);
$$;

-- El dueño de un perfil ve el nombre de los asesores que tienen o tuvieron acceso a él.
create function private.is_my_advisor(p_advisor uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.advisor_client_access x
    join public.clients c on c.id = x.client_id
    where x.advisor_id = p_advisor and c.owner_user_id = (select auth.uid())
  );
$$;

-- Un perfil sin dueño es el único que se puede invitar o borrar desde la app.
create function private.is_unclaimed(p_client uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.clients c where c.id = p_client and c.owner_user_id is null);
$$;

grant execute on function
  private.current_advisor_id(),
  private.is_client_owner(uuid),
  private.is_advisor_of(uuid),
  private.can_access(uuid),
  private.is_my_advisor(uuid),
  private.is_unclaimed(uuid)
to authenticated;

-- 6. Disparadores genéricos -----------------------------------------------------------------------

create function private.set_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Campos de criterio profesional dentro de tablas que también edita el cliente (sección 4.1).
-- Argumentos: las columnas que solo cambia el asesor. Sin usuario (clave secreta, tareas del
-- sistema) no aplica: RLS ya no protege esos caminos y el historial los registra como "sistema".
create function private.guard_advisor_columns()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_client uuid := (to_jsonb(new) ->> case when tg_table_name = 'clients' then 'id' else 'client_id' end)::uuid;
  v_col text;
begin
  if (select auth.uid()) is null or private.is_advisor_of(v_client) then
    return new;
  end if;
  foreach v_col in array tg_argv loop
    if (tg_op = 'INSERT' and coalesce(to_jsonb(new) -> v_col, 'null'::jsonb) <> 'null'::jsonb)
       or (tg_op = 'UPDATE' and (to_jsonb(new) -> v_col) is distinct from (to_jsonb(old) -> v_col)) then
      raise exception 'El campo % solo lo puede cambiar el asesor', v_col using errcode = '42501';
    end if;
  end loop;
  return new;
end;
$$;

-- Historial (sección 7 del modelo). Argumentos: la columna con el id del cliente ('' si la tabla no
-- cuelga de un cliente) y, después, las columnas que no se copian al historial.
create function private.audit_row()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_skip text[] := array['updated_at'] || tg_argv[1:];
  v_old jsonb;
  v_new jsonb;
  v_row jsonb;
  v_changed text[];
  v_pk jsonb;
begin
  if tg_op <> 'INSERT' then
    v_old := to_jsonb(old) - v_skip;
  end if;
  if tg_op <> 'DELETE' then
    v_new := to_jsonb(new) - v_skip;
  end if;
  v_row := coalesce(v_new, v_old);

  if tg_op = 'UPDATE' then
    select array_agg(n.key order by n.key) into v_changed
    from jsonb_each(v_new) n
    where n.value is distinct from v_old -> n.key;
    if v_changed is null then
      return null; -- solo cambiaron columnas excluidas
    end if;
  end if;

  select jsonb_object_agg(a.attname, v_row -> a.attname::text) into v_pk
  from pg_catalog.pg_index i
  join pg_catalog.pg_attribute a on a.attrelid = i.indrelid and a.attnum = any (i.indkey::int2[])
  where i.indrelid = tg_relid and i.indisprimary;

  insert into public.audit_log
    (actor_user_id, actor_role, client_id, table_name, row_pk, action, old_values, new_values, changed_cols)
  values (
    v_actor,
    case
      when v_actor is null then 'sistema'
      when exists (select 1 from public.advisors a where a.user_id = v_actor) then 'asesor'
      else 'cliente'
    end,
    nullif(v_row ->> tg_argv[0], '')::uuid,
    tg_table_name,
    v_pk,
    lower(tg_op),
    v_old,
    v_new,
    v_changed
  );
  return null;
end;
$$;

-- 7. Disparadores propios -------------------------------------------------------------------------

-- Fecha y autor de la revocación los pone la base, no quien actualiza.
create function private.track_access_status()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'revoked' then
      new.revoked_at := now();
      new.revoked_by := (select auth.uid());
    else
      new.revoked_at := null;
      new.revoked_by := null;
    end if;
  end if;
  return new;
end;
$$;

-- Una invitación solo se revoca una vez y mientras no se haya usado; la fecha la pone la base.
create function private.guard_invitation_update()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.revoked_at is distinct from old.revoked_at then
    if old.revoked_at is not null or old.accepted_at is not null then
      raise exception 'La invitación ya se usó o se revocó' using errcode = '22023';
    end if;
    new.revoked_at := now();
  end if;
  return new;
end;
$$;

create function private.mark_client_invited()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.clients c set status = 'invitado' where c.id = new.client_id and c.status = 'borrador';
  return null;
end;
$$;

create trigger clients_guard_advisor_columns before update on public.clients
  for each row execute function private.guard_advisor_columns(
    'display_name', 'form_of_address', 'country_code', 'base_currency', 'locale', 'client_type');
create trigger clients_set_updated_at before update on public.clients
  for each row execute function private.set_updated_at();
create trigger clients_audit after insert or update or delete on public.clients
  for each row execute function private.audit_row('id');

create trigger advisors_audit after insert or update or delete on public.advisors
  for each row execute function private.audit_row('');

create trigger advisor_client_access_track_status before update on public.advisor_client_access
  for each row execute function private.track_access_status();
create trigger advisor_client_access_audit after insert or update or delete on public.advisor_client_access
  for each row execute function private.audit_row('client_id');

create trigger invitations_guard_update before update on public.invitations
  for each row execute function private.guard_invitation_update();
create trigger invitations_mark_client_invited after insert on public.invitations
  for each row execute function private.mark_client_invited();
-- El hash del token y el correo no se copian: el correo se borra al aceptar y no debe quedar aquí.
create trigger invitations_audit after insert or update or delete on public.invitations
  for each row execute function private.audit_row('client_id', 'token_hash', 'email');

-- 8. Funciones que llama la app -------------------------------------------------------------------

-- El asesor crea el perfil y recibe acceso en la misma transacción. Es el único camino para crear
-- clientes: con un insert directo, el asesor aún no tendría acceso para leer la fila creada.
create function public.create_client(
  p_display_name    text,
  p_country_code    text,
  p_base_currency   text default null,
  p_form_of_address text default 'tu'
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_advisor uuid := private.current_advisor_id();
  v_country public.countries;
  v_client uuid;
begin
  if v_advisor is null then
    raise exception 'Solo un asesor puede crear perfiles de cliente' using errcode = '42501';
  end if;
  select * into v_country from public.countries c where c.code = p_country_code and c.enabled;
  if not found then
    raise exception 'País no disponible: %', p_country_code using errcode = '22023';
  end if;

  insert into public.clients (display_name, form_of_address, country_code, base_currency, locale, created_by)
  values (
    btrim(p_display_name),
    p_form_of_address,
    v_country.code,
    coalesce(upper(p_base_currency), v_country.default_currency),
    v_country.default_locale,
    (select auth.uid())
  )
  returning id into v_client;

  insert into public.advisor_client_access (advisor_id, client_id) values (v_advisor, v_client);
  return v_client;
end;
$$;

-- Sección 4.2 del modelo. El token llega en claro solo aquí; se compara su sha256.
create function public.accept_invitation(p_token text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_invitation public.invitations;
begin
  if v_user is null then
    raise exception 'Hace falta una sesión para aceptar la invitación' using errcode = '42501';
  end if;

  select * into v_invitation from public.invitations i
  where i.token_hash = sha256(convert_to(p_token, 'UTF8'))
    and i.accepted_at is null and i.revoked_at is null and i.expires_at > now()
  for update;
  if not found then
    raise exception 'Invitación no válida o vencida' using errcode = '22023';
  end if;

  if exists (select 1 from public.clients c where c.owner_user_id = v_user) then
    raise exception 'Esta cuenta ya está vinculada a otro perfil' using errcode = '23505';
  end if;
  if exists (select 1 from public.advisors a where a.user_id = v_user) then
    raise exception 'Una cuenta de asesor no puede aceptar una invitación de cliente' using errcode = '42501';
  end if;

  update public.clients c set owner_user_id = v_user, status = 'activo'
  where c.id = v_invitation.client_id and c.owner_user_id is null;
  if not found then
    raise exception 'Este perfil ya está vinculado a otra cuenta' using errcode = '23505';
  end if;

  insert into public.advisor_client_access (advisor_id, client_id)
  values (v_invitation.advisor_id, v_invitation.client_id)
  on conflict (advisor_id, client_id) do update set status = 'active';

  update public.invitations i set accepted_at = now(), accepted_by = v_user, email = null
  where i.id = v_invitation.id;
  -- Las demás invitaciones abiertas del perfil ya no sirven.
  update public.invitations i set revoked_at = now(), email = null
  where i.client_id = v_invitation.client_id and i.id <> v_invitation.id
    and i.accepted_at is null and i.revoked_at is null;

  return v_invitation.client_id;
end;
$$;

revoke execute on function
  public.create_client(text, text, text, text),
  public.accept_invitation(text)
from public, anon;
grant execute on function
  public.create_client(text, text, text, text),
  public.accept_invitation(text)
to authenticated;

-- 9. RLS, políticas y privilegios (matriz de la sección 5) ----------------------------------------

alter table public.countries enable row level security;
alter table public.advisors enable row level security;
alter table public.clients enable row level security;
alter table public.advisor_client_access enable row level security;
alter table public.invitations enable row level security;
alter table public.audit_log enable row level security;

revoke all on
  public.countries,
  public.advisors,
  public.clients,
  public.advisor_client_access,
  public.invitations,
  public.audit_log
from anon, authenticated;

-- Países: catálogo de lectura.
grant select on public.countries to authenticated;
create policy countries_select on public.countries for select to authenticated
  using (true);

-- Asesores: cada asesor ve y edita su nombre; el cliente ve el nombre de su asesor. Las filas se
-- crean a mano (supabase/README.md, "Primer asesor").
grant select, update (display_name, brand_name) on public.advisors to authenticated;
create policy advisors_select on public.advisors for select to authenticated
  using (user_id = (select auth.uid()) or private.is_my_advisor(id));
create policy advisors_update on public.advisors for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Clientes: dueño y asesor con acceso. El dueño solo cambia sus datos de hecho (disparador de
-- guarda); dueño, estado y autor no los cambia nadie desde la API.
grant select, delete on public.clients to authenticated;
grant update (display_name, form_of_address, country_code, base_currency, locale, birth_date, sex,
  client_type, dependents_count) on public.clients to authenticated;
create policy clients_select on public.clients for select to authenticated
  using (private.can_access(id));
create policy clients_update on public.clients for update to authenticated
  using (private.can_access(id))
  with check (private.can_access(id));
-- Supuesto (07, C12): el asesor borra un perfil solo mientras nadie lo haya aceptado.
create policy clients_delete on public.clients for delete to authenticated
  using (private.is_advisor_of(id) and owner_user_id is null);

-- Acceso del asesor: el asesor ve su fila; el dueño la ve y la revoca o la restablece. Nadie la crea
-- desde la API: nace en create_client o en accept_invitation.
grant select, update (status) on public.advisor_client_access to authenticated;
create policy advisor_client_access_select on public.advisor_client_access for select to authenticated
  using (advisor_id = (select private.current_advisor_id()) or private.is_client_owner(client_id));
create policy advisor_client_access_update on public.advisor_client_access for update to authenticated
  using (private.is_client_owner(client_id))
  with check (private.is_client_owner(client_id));

-- Invitaciones: solo el asesor con acceso, y solo para perfiles sin dueño. El asesor, el vencimiento
-- y el uso los pone la base; desde la API solo se crean y se revocan.
grant select, insert (client_id, email, token_hash), update (revoked_at) on public.invitations to authenticated;
create policy invitations_select on public.invitations for select to authenticated
  using (private.is_advisor_of(client_id));
create policy invitations_insert on public.invitations for insert to authenticated
  with check (
    private.is_advisor_of(client_id)
    and advisor_id = (select private.current_advisor_id())
    and private.is_unclaimed(client_id)
  );
create policy invitations_update on public.invitations for update to authenticated
  using (private.is_advisor_of(client_id))
  with check (private.is_advisor_of(client_id));

-- Historial: lectura para dueño y asesor con acceso; solo lo escribe private.audit_row.
grant select on public.audit_log to authenticated;
create policy audit_log_select on public.audit_log for select to authenticated
  using (private.can_access(client_id));
