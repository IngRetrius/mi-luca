-- Avisos dentro de la app (03-modelo, 3.x `notifications`). Primer tipo: el cliente aceptó la
-- invitación, para el asesor que la envió. Los cambios del cliente con su antes y después llegan en
-- F2 (`cambio_del_cliente`). Sin datos del cliente en el aviso: la pantalla lee el nombre con RLS,
-- así que si el cliente retira el acceso, el asesor deja de ver de quién era.

create table public.notifications (
  id                uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users (id) on delete cascade,
  client_id         uuid references public.clients (id) on delete cascade,
  kind              text not null check (kind in ('invitacion_aceptada')),
  payload           jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  read_at           timestamptz
);
create index notifications_recipient_unread_idx on public.notifications (recipient_user_id, created_at desc)
  where read_at is null;
create index notifications_client_id_idx on public.notifications (client_id);

-- Marcar como visto: solo de vacío a la fecha que pone la base; no se desmarca.
create function private.guard_notification_read()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.read_at is distinct from old.read_at then
    if old.read_at is not null then
      raise exception 'El aviso ya se marcó como visto' using errcode = '55000';
    end if;
    new.read_at := now();
  end if;
  return new;
end;
$$;

create trigger notifications_guard_read before update on public.notifications
  for each row execute function private.guard_notification_read();

-- Al aceptar una invitación (accept_invitation pone accepted_at), avisa al asesor que la envió.
create function private.notify_invitation_accepted()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.accepted_at is null and new.accepted_at is not null then
    insert into public.notifications (recipient_user_id, client_id, kind)
    select a.user_id, new.client_id, 'invitacion_aceptada'
    from public.advisors a
    where a.id = new.advisor_id;
  end if;
  return null;
end;
$$;

create trigger invitations_notify_accepted after update of accepted_at on public.invitations
  for each row execute function private.notify_invitation_accepted();

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;

-- Cada quien ve y marca solo sus avisos. Nadie los crea desde la API.
grant select, update (read_at) on public.notifications to authenticated;
create policy notifications_select on public.notifications for select to authenticated
  using (recipient_user_id = (select auth.uid()));
create policy notifications_update on public.notifications for update to authenticated
  using (recipient_user_id = (select auth.uid()))
  with check (recipient_user_id = (select auth.uid()));
