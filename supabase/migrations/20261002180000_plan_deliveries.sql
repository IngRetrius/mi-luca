-- Planes entregados (RN-137; 03-modelo, sección 3.5): una foto inmutable del caso el día de la
-- entrega, con las entradas, los resultados del motor, las cifras clave y el control de calidad.
-- Sirve para que el cliente vea su plan y para comparar "lo entregado" con "lo de hoy".
--
-- Diferencias con el borrador: sin PDF ni documentos todavía (llegan en F7; `documents` queda vacío
-- y `pdf_path` nulo), con el modo de cálculo, y sin llave foránea en `delivered_by`, como el
-- historial: la entrega se conserva aunque se borre la cuenta del asesor.

create table public.plan_deliveries (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.clients (id) on delete cascade,
  delivered_at   timestamptz not null default now(),
  delivered_by   uuid,                                       -- lo pone la base
  label          text not null check (btrim(label) <> '' and length(label) <= 80),
  cutoff_date    date not null,
  engine_version text not null check (engine_version ~ '^\d+\.\d+\.\d+$'),
  mode           text not null check (mode in ('compatible', 'native')),
  parameter_ids  uuid[] not null default '{}',              -- versiones exactas de country_parameters
  inputs         jsonb not null check (jsonb_typeof(inputs) = 'object'),   -- la entrada del motor (CaseInput)
  labels         jsonb not null default '{}' check (jsonb_typeof(labels) = 'object'), -- nombres que muestran las pantallas (bolsillos)
  results        jsonb not null check (jsonb_typeof(results) = 'object'),
  key_figures    jsonb not null check (jsonb_typeof(key_figures) = 'object'),
  documents      jsonb not null default '{}' check (jsonb_typeof(documents) = 'object'),
  qc_report      jsonb not null check (jsonb_typeof(qc_report) = 'object'), -- con las notas del asesor
  pdf_path       text,
  sha256         text not null default ''                    -- lo pone la base (el disparador reemplaza el vacío)
);
create index plan_deliveries_client_id_delivered_at_idx
  on public.plan_deliveries (client_id, delivered_at desc);

-- Un plan entregado no cambia: la base pone quién y cuándo, y sella entradas, nombres, resultados
-- y documentos con su sha256. Una corrección es una entrega nueva.
create function private.seal_plan_delivery()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'Un plan entregado no se cambia; entrega una versión nueva' using errcode = '55000';
  end if;
  new.delivered_at := now();
  new.delivered_by := (select auth.uid());
  new.sha256 := encode(
    sha256(convert_to(new.inputs::text || new.labels::text || new.results::text || new.documents::text,
      'UTF8')),
    'hex'
  );
  return new;
end;
$$;

create trigger plan_deliveries_seal before insert or update on public.plan_deliveries
  for each row execute function private.seal_plan_delivery();
-- El historial guarda la entrega sin copiar las fotos grandes (ya están en la fila, que no cambia).
create trigger plan_deliveries_audit after insert or update or delete on public.plan_deliveries
  for each row execute function private.audit_row('client_id', 'inputs', 'labels', 'results',
    'key_figures', 'documents', 'qc_report');

-- RLS: el cliente y el asesor con acceso la ven; solo el asesor entrega; nadie la cambia ni la
-- borra desde la API (se va con el perfil cuando el cliente pide el borrado).
alter table public.plan_deliveries enable row level security;
revoke all on public.plan_deliveries from anon, authenticated;
grant select, insert (client_id, label, cutoff_date, engine_version, mode, parameter_ids, inputs,
    labels, results, key_figures, documents, qc_report)
  on public.plan_deliveries to authenticated;
create policy plan_deliveries_select on public.plan_deliveries for select to authenticated
  using (private.can_access(client_id));
create policy plan_deliveries_insert on public.plan_deliveries for insert to authenticated
  with check (private.is_advisor_of(client_id));
