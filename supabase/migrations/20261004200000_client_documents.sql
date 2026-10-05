-- F7: carta de cierre y notas para el cliente (P-A13). El texto lleva marcadores de cifras
-- ({{sobrante_anual}}) que la app cambia por los valores del motor: en vivo mientras es borrador o
-- notas publicadas, y fijos dentro del plan entregado (`plan_deliveries.documents`).
--
-- Diferencias con el borrador del modelo: el texto va por secciones (`content`, un objeto con el
-- texto de cada parte de la carta; las notas tienen una sola, `body`), hay uno de cada tipo por
-- cliente, y la carta no se publica sola: llega al cliente con el plan entregado.

create table public.client_documents (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients (id) on delete cascade,
  kind         text not null check (kind in ('notas', 'carta')),
  status       text not null default 'borrador' check (status in ('borrador', 'publicado')),
  content      jsonb not null default '{}' check (jsonb_typeof(content) = 'object'
                 and octet_length(content::text) <= 100000),
  published_at timestamptz,                      -- lo pone la base al publicar
  updated_at   timestamptz not null default now(),
  updated_by   uuid,
  unique (client_id, kind),
  -- La carta se entrega con el plan; solo las notas se publican aparte.
  check (kind = 'notas' or status = 'borrador')
);

create function private.stamp_document_publication()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.status = 'publicado' then
    -- Cada vez que se publica (o se vuelve a guardar publicado con otro texto) es una publicación
    -- nueva, para que el cliente sepa que hay algo nuevo.
    if tg_op = 'INSERT' or old.status <> 'publicado' or new.content is distinct from old.content then
      new.published_at := now();
    else
      new.published_at := old.published_at;
    end if;
  else
    new.published_at := null;
  end if;
  return new;
end;
$$;

create trigger client_documents_publication before insert or update on public.client_documents
  for each row execute function private.stamp_document_publication();
create trigger client_documents_stamp before insert or update on public.client_documents
  for each row execute function private.stamp_update();
create trigger client_documents_audit after insert or update or delete on public.client_documents
  for each row execute function private.audit_row('client_id', 'updated_by');

-- RLS (matriz de permisos): el asesor escribe; el cliente solo lee lo publicado.
alter table public.client_documents enable row level security;
revoke all on public.client_documents from anon, authenticated;
grant select, insert (client_id, kind, status, content), update (status, content), delete
  on public.client_documents to authenticated;
create policy client_documents_select on public.client_documents for select to authenticated
  using (private.is_advisor_of(client_id)
         or (private.is_client_owner(client_id) and status = 'publicado'));
create policy client_documents_insert on public.client_documents for insert to authenticated
  with check (private.is_advisor_of(client_id));
create policy client_documents_update on public.client_documents for update to authenticated
  using (private.is_advisor_of(client_id)) with check (private.is_advisor_of(client_id));
create policy client_documents_delete on public.client_documents for delete to authenticated
  using (private.is_advisor_of(client_id));
