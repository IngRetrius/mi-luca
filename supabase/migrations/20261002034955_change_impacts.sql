-- Antes y después de cada cambio (03-modelo, sección 7): caché de cifras clave, registro de impacto
-- y aviso al asesor cuando cambia algo el cliente (pregunta C6: aviso al momento; el correo diario
-- llega cuando la app envíe correos).
--
-- Las cifras las calcula el motor en el servidor de la app. Las escribe solo `record_change_impact`,
-- que comprueba el acceso de quien llama y saca de la base quién es, su rol y qué filas cambió (el
-- historial). Nadie escribe estas tablas directamente desde la API.

create table public.client_key_figures (
  client_id      uuid primary key references public.clients (id) on delete cascade,
  computed_at    timestamptz not null default now(),
  engine_version text not null,
  mode           text not null check (mode in ('compatible', 'native')),
  figures        jsonb not null check (jsonb_typeof(figures) = 'object')
);

create table public.change_impacts (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.clients (id) on delete cascade,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),   -- último cambio agrupado
  actor_user_id  uuid not null,                         -- sin FK, como el historial
  actor_role     text not null check (actor_role in ('cliente', 'asesor')),
  audit_from_id  bigint not null,                       -- filas del historial agrupadas
  audit_to_id    bigint not null,
  engine_version text not null,
  before_figures jsonb not null check (jsonb_typeof(before_figures) = 'object'),
  after_figures  jsonb not null check (jsonb_typeof(after_figures) = 'object'),
  deltas         jsonb not null check (jsonb_typeof(deltas) = 'array'),   -- solo las cifras que cambiaron
  check (audit_to_id >= audit_from_id)
);
create index change_impacts_client_id_created_at_idx on public.change_impacts (client_id, created_at desc);

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('invitacion_aceptada', 'cambio_del_cliente'));

-- La app la llama después de guardar, con las cifras de antes y después que calculó el motor.
-- `p_audit_after` es el último id del historial del cliente antes de guardar; `p_impact`, el
-- registro abierto del mismo autor en los últimos 10 minutos, si lo hay (Supuesto de 03-modelo,
-- 7.2): así varios cambios seguidos quedan en un solo antes y después, con el antes del primero.
-- Devuelve el id del registro, o null si no cambió ningún dato o ninguna cifra.
create function public.record_change_impact(
  p_client         uuid,
  p_audit_after    bigint,
  p_engine_version text,
  p_mode           text,
  p_before         jsonb,
  p_after          jsonb,
  p_deltas         jsonb,
  p_impact         uuid default null
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_role text;
  v_from bigint;
  v_to bigint;
  v_impact uuid;
begin
  if v_actor is null or not private.can_access(p_client) then
    raise exception 'Sin acceso a este cliente' using errcode = '42501';
  end if;
  if jsonb_typeof(p_before) is distinct from 'object' or jsonb_typeof(p_after) is distinct from 'object'
     or jsonb_typeof(p_deltas) is distinct from 'array' or p_mode not in ('compatible', 'native') then
    raise exception 'Cifras con forma inválida' using errcode = '22023';
  end if;

  insert into public.client_key_figures (client_id, computed_at, engine_version, mode, figures)
  values (p_client, now(), p_engine_version, p_mode, p_after)
  on conflict (client_id) do update
    set computed_at = excluded.computed_at, engine_version = excluded.engine_version,
        mode = excluded.mode, figures = excluded.figures;

  -- Lo que cambió quien llama desde la marca: si no cambió nada, no hay antes y después.
  select min(l.id), max(l.id) into v_from, v_to
  from public.audit_log l
  where l.client_id = p_client and l.actor_user_id = v_actor and l.id > coalesce(p_audit_after, 0);
  if v_to is null then
    return null;
  end if;

  if p_impact is not null then
    update public.change_impacts i
    set after_figures = p_after, deltas = p_deltas, audit_to_id = v_to, updated_at = now(),
        engine_version = p_engine_version
    where i.id = p_impact and i.client_id = p_client and i.actor_user_id = v_actor
      and i.updated_at > now() - interval '10 minutes'
    returning i.id into v_impact;
    if found then
      return v_impact;
    end if;
  end if;

  if jsonb_array_length(p_deltas) = 0 then
    return null;
  end if;

  v_role := case when exists (select 1 from public.advisors a where a.user_id = v_actor)
                 then 'asesor' else 'cliente' end;
  insert into public.change_impacts (client_id, actor_user_id, actor_role, audit_from_id, audit_to_id,
    engine_version, before_figures, after_figures, deltas)
  values (p_client, v_actor, v_role, v_from, v_to, p_engine_version, p_before, p_after, p_deltas)
  returning id into v_impact;

  -- Si cambió algo el cliente, avisa a los asesores con acceso activo.
  if v_role = 'cliente' then
    insert into public.notifications (recipient_user_id, client_id, kind, payload)
    select a.user_id, p_client, 'cambio_del_cliente', jsonb_build_object('impact_id', v_impact)
    from public.advisor_client_access x
    join public.advisors a on a.id = x.advisor_id
    where x.client_id = p_client and x.status = 'active';
  end if;
  return v_impact;
end;
$$;

revoke execute on function public.record_change_impact(uuid, bigint, text, text, jsonb, jsonb, jsonb, uuid)
  from public, anon;
grant execute on function public.record_change_impact(uuid, bigint, text, text, jsonb, jsonb, jsonb, uuid)
  to authenticated;

alter table public.client_key_figures enable row level security;
alter table public.change_impacts enable row level security;
revoke all on public.client_key_figures, public.change_impacts from anon, authenticated;

-- Dueño y asesor con acceso los leen; solo los escribe record_change_impact.
grant select on public.client_key_figures, public.change_impacts to authenticated;
create policy client_key_figures_select on public.client_key_figures for select to authenticated
  using (private.can_access(client_id));
create policy change_impacts_select on public.change_impacts for select to authenticated
  using (private.can_access(client_id));
