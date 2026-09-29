-- Flujo de invitación (F1): textos legales, consentimientos, lectura de la invitación sin sesión y
-- aceptación con los consentimientos en la misma transacción (02-arquitectura, 5.3; 03-modelo, 3.1
-- y 4.2). Las diferencias con el borrador están en la sección 11 del modelo.
--
-- Los textos legales no se cargan aquí: los redacta y valida el abogado (docs/legal/README.md).
-- Mientras no haya un texto de tratamiento de datos vigente para el país, nadie puede aceptar una
-- invitación. En local, supabase/seed/ carga textos de prueba marcados como tales.

-- 1. Textos legales -------------------------------------------------------------------------------

create table public.legal_texts (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null check (kind in
                  ('privacidad', 'terminos', 'tratamiento_datos', 'datos_sensibles', 'alcance_asesoria')),
  country_code  char(2) references public.countries (code), -- null: vale para todos los países
  locale        text not null default 'es',
  version       text not null check (btrim(version) <> ''),
  title         text not null check (btrim(title) <> ''),
  body_markdown text not null check (btrim(body_markdown) <> ''),
  body_sha256   text not null,                              -- lo pone la base: prueba del texto aceptado
  published_at  timestamptz not null default now(),
  unique nulls not distinct (kind, country_code, locale, version)
);
create index legal_texts_country_code_idx on public.legal_texts (country_code);

-- Un texto publicado no cambia: el consentimiento apunta a él. Una corrección es una versión nueva.
create function private.seal_legal_text()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'Un texto legal publicado no se cambia; publica una versión nueva'
      using errcode = '55000';
  end if;
  new.body_sha256 := encode(sha256(convert_to(new.body_markdown, 'UTF8')), 'hex');
  return new;
end;
$$;

create trigger legal_texts_seal before insert or update on public.legal_texts
  for each row execute function private.seal_legal_text();

-- Versión vigente de cada tipo para un país: la más reciente ya publicada, y la del país antes que
-- la común. Solo español por ahora (la app no tiene otros idiomas).
create function public.current_legal_texts(p_country_code text)
returns setof public.legal_texts
language sql stable set search_path = ''
as $$
  select distinct on (t.kind) t.*
  from public.legal_texts t
  where t.published_at <= now()
    and t.locale = 'es'
    and (t.country_code = p_country_code or t.country_code is null)
  order by t.kind, t.country_code nulls last, t.published_at desc;
$$;

-- 2. Consentimientos ------------------------------------------------------------------------------

create table public.consents (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients (id) on delete cascade,
  user_id       uuid not null references auth.users (id),
  legal_text_id uuid not null references public.legal_texts (id),
  granted       boolean not null,
  recorded_at   timestamptz not null default now(),
  withdrawn_at  timestamptz,
  user_agent    text check (length(user_agent) <= 512)
);
create index consents_client_id_idx on public.consents (client_id);
create index consents_user_id_idx on public.consents (user_id);
create index consents_legal_text_id_idx on public.consents (legal_text_id);

create trigger consents_audit after insert or update or delete on public.consents
  for each row execute function private.audit_row('client_id');

-- 3. Invitación vista por quien tiene el enlace ---------------------------------------------------

-- P-C01 se abre sin sesión. Con el token (32 bytes aleatorios) se ve el estado de la invitación y,
-- solo si está vigente, lo que la pantalla necesita. No expone nada sin el token.
create function public.get_invitation(p_token text)
returns table (
  status          text,        -- 'valid', 'used', 'revoked', 'expired' o 'invalid'
  advisor_name    text,
  client_name     text,
  form_of_address text,
  country_code    text,
  email           text,
  expires_at      timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_invitation public.invitations;
begin
  if p_token is null or length(p_token) > 128 then
    return query select 'invalid', null, null, null, null, null, null::timestamptz;
    return;
  end if;
  select * into v_invitation from public.invitations i
  where i.token_hash = sha256(convert_to(p_token, 'UTF8'));
  if not found then
    return query select 'invalid', null, null, null, null, null, null::timestamptz;
  elsif v_invitation.accepted_at is not null then
    return query select 'used', null, null, null, null, null, null::timestamptz;
  elsif v_invitation.revoked_at is not null then
    return query select 'revoked', null, null, null, null, null, null::timestamptz;
  elsif v_invitation.expires_at <= now() then
    return query select 'expired', null, null, null, null, null, null::timestamptz;
  else
    return query
      select 'valid', a.display_name, c.display_name, c.form_of_address, c.country_code::text,
        v_invitation.email, v_invitation.expires_at
      from public.clients c
      join public.advisors a on a.id = v_invitation.advisor_id
      where c.id = v_invitation.client_id;
  end if;
end;
$$;

-- 4. Aceptar con consentimiento -------------------------------------------------------------------

-- Reemplaza la versión de la migración de identidad: ahora recibe los textos que la persona aceptó
-- en P-C02 y los registra en la misma transacción que el vínculo. El tratamiento de datos vigente
-- del país es obligatorio; los datos sensibles son facultativos y se registran aceptados o no.
drop function public.accept_invitation(text);

create function public.accept_invitation(
  p_token         text,
  p_granted_texts uuid[] default '{}',
  p_user_agent    text default null
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_invitation public.invitations;
  v_country text;
  v_required uuid;
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

  select c.country_code into v_country from public.clients c where c.id = v_invitation.client_id;
  select t.id into v_required from public.current_legal_texts(v_country) t
  where t.kind = 'tratamiento_datos';
  if v_required is null then
    raise exception 'No hay un texto de tratamiento de datos vigente para %', v_country
      using errcode = '55000';
  end if;
  p_granted_texts := coalesce(p_granted_texts, '{}');
  if not v_required = any (p_granted_texts) then
    raise exception 'Falta aceptar el tratamiento de datos vigente' using errcode = '23514';
  end if;

  update public.clients c set owner_user_id = v_user, status = 'activo'
  where c.id = v_invitation.client_id and c.owner_user_id is null;
  if not found then
    raise exception 'Este perfil ya está vinculado a otra cuenta' using errcode = '23505';
  end if;

  insert into public.consents (client_id, user_id, legal_text_id, granted, user_agent)
  select v_invitation.client_id, v_user, t.id, t.id = any (p_granted_texts), left(p_user_agent, 512)
  from public.current_legal_texts(v_country) t
  where t.kind in ('tratamiento_datos', 'datos_sensibles');

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

-- 5. Privilegios, RLS y políticas -----------------------------------------------------------------

revoke execute on function
  public.current_legal_texts(text),
  public.get_invitation(text),
  public.accept_invitation(text, uuid[], text)
from public;
grant execute on function public.current_legal_texts(text), public.get_invitation(text)
  to anon, authenticated;
grant execute on function public.accept_invitation(text, uuid[], text) to authenticated;

alter table public.legal_texts enable row level security;
alter table public.consents enable row level security;
revoke all on public.legal_texts, public.consents from anon, authenticated;

-- Textos legales: públicos una vez publicados (P-C02 se ve antes de tener cuenta). Solo se cargan
-- con migraciones o desde el panel; nadie los escribe desde la API.
grant select on public.legal_texts to anon, authenticated;
create policy legal_texts_select on public.legal_texts for select to anon, authenticated
  using (published_at <= now());

-- Consentimientos: los ven el dueño y el asesor con acceso (matriz, sección 5). Nacen en
-- accept_invitation; retirarlos llega con P-C11, cuando el abogado defina qué implica.
grant select on public.consents to authenticated;
create policy consents_select on public.consents for select to authenticated
  using (private.can_access(client_id));
