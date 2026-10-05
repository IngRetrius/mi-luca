-- F7: datos de la ficha de continuidad (P-A16, Anexo C del protocolo) que no salen del plan: si hay
-- testamento, si se revisaron los beneficiarios y las decisiones tomadas. El resto de la ficha se
-- arma al verla con los datos del cliente; no se guarda una copia (ADR 0021).
--
-- Una fila por cliente. La escribe el asesor; el cliente la puede leer porque son datos suyos.
-- Null en las dos preguntas es "sin dato", distinto de "no".

create table public.continuity_notes (
  client_id              uuid primary key references public.clients (id) on delete cascade,
  has_will               boolean,
  beneficiaries_reviewed boolean,
  decisions              text not null default '' check (length(decisions) <= 4000),
  updated_at             timestamptz not null default now(),
  updated_by             uuid
);

create trigger continuity_notes_stamp before insert or update on public.continuity_notes
  for each row execute function private.stamp_update();
create trigger continuity_notes_audit after insert or update or delete on public.continuity_notes
  for each row execute function private.audit_row('client_id', 'updated_by');

-- RLS (matriz de permisos): el asesor escribe; el cliente y el asesor leen.
alter table public.continuity_notes enable row level security;
revoke all on public.continuity_notes from anon, authenticated;
-- El guardado es un upsert: PostgREST actualiza también la llave, por eso va en el permiso.
grant select,
  insert (client_id, has_will, beneficiaries_reviewed, decisions),
  update (client_id, has_will, beneficiaries_reviewed, decisions)
  on public.continuity_notes to authenticated;
create policy continuity_notes_select on public.continuity_notes for select to authenticated
  using (private.can_access(client_id));
create policy continuity_notes_insert on public.continuity_notes for insert to authenticated
  with check (private.is_advisor_of(client_id));
create policy continuity_notes_update on public.continuity_notes for update to authenticated
  using (private.is_advisor_of(client_id)) with check (private.is_advisor_of(client_id));
