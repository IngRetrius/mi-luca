-- F7: propuesta del asesor (P-A25, ADR 0024). El asesor arma ajustes a los gastos del presupuesto
-- (cambiar el valor por pago o quitar el gasto), cada uno con su porqué; el cliente decide cada uno
-- y lo aceptado pasa al presupuesto con una tarea por ajuste. Mientras es borrador no toca los
-- datos: la app aplica los ajustes sobre las filas antes de calcular.
--
-- Solo el asesor del cliente ve y escribe. Una propuesta aplicada queda fija: nadie la cambia ni la
-- borra desde la API, y se va con el perfil.

-- 1. Llave compuesta del gasto ---------------------------------------------------------------------

-- Un ajuste no puede apuntar al gasto de otro cliente.
alter table public.budget_items add constraint budget_items_id_client_key unique (id, client_id);

-- 2. Tablas ---------------------------------------------------------------------------------------

create table public.proposals (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.clients (id) on delete cascade,
  status         text not null default 'borrador' check (status in ('borrador', 'aplicada')),
  -- Cifras clave al aplicar: las de antes y las del plan con lo aceptado.
  before_figures jsonb check (before_figures is null or jsonb_typeof(before_figures) = 'object'),
  after_figures  jsonb check (after_figures is null or jsonb_typeof(after_figures) = 'object'),
  applied_at     timestamptz,
  applied_by     uuid,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  updated_by     uuid,
  unique (id, client_id),
  check ((status = 'aplicada') = (applied_at is not null))
);
create index proposals_client_id_idx on public.proposals (client_id);
-- Una sola propuesta en borrador por cliente; las aplicadas quedan como registro.
create unique index proposals_one_draft on public.proposals (client_id) where status = 'borrador';

create table public.proposal_adjustments (
  id             uuid primary key default gen_random_uuid(),
  proposal_id    uuid not null,
  client_id      uuid not null references public.clients (id) on delete cascade,
  -- Null si el gasto ya no existe (lo borró alguien o lo quitó la propia propuesta al aplicarse).
  budget_item_id uuid,
  kind           text not null check (kind in ('ajustar', 'quitar')),
  amount         numeric(18, 2) check (amount >= 0),             -- valor nuevo por pago; null al quitar
  -- Del gasto al proponer y al aplicar: el registro se lee aunque el gasto ya no exista.
  concept        text not null check (btrim(concept) <> '' and length(concept) <= 120),
  currency       char(3) not null check (currency ~ '^[A-Z]{3}$'),
  frequency      text check (frequency in ('semanal', 'quincenal', 'mensual', 'bimestral', 'trimestral',
                   'cada_4_meses', 'semestral', 'anual', 'cada_2_anos', 'por_duracion',
                   'meses_seguridad_social')),
  from_amount    numeric(18, 2) check (from_amount >= 0),
  reason         text check (length(reason) <= 500),             -- el porqué; nota de la tarea
  decision       text not null default 'pendiente'
                   check (decision in ('pendiente', 'aceptado', 'descartado')),
  applied        boolean not null default false,                 -- lo pone apply_proposal
  sort_order     int not null default 0,
  updated_at     timestamptz not null default now(),
  updated_by     uuid,
  unique (proposal_id, budget_item_id),
  check ((kind = 'quitar') = (amount is null)),
  foreign key (proposal_id, client_id) references public.proposals (id, client_id) on delete cascade,
  foreign key (budget_item_id, client_id) references public.budget_items (id, client_id)
    on delete set null (budget_item_id)
);
create index proposal_adjustments_client_id_idx on public.proposal_adjustments (client_id);
create index proposal_adjustments_budget_item_idx on public.proposal_adjustments (budget_item_id, client_id);

-- 3. Disparadores ---------------------------------------------------------------------------------

-- Una propuesta aplicada no cambia. Solo apply_proposal la actualiza (authenticated no tiene
-- `update`), y solo para pasarla de borrador a aplicada.
create function private.guard_applied_proposal()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if old.status = 'aplicada' then
    raise exception 'Una propuesta aplicada no se cambia; arma una nueva' using errcode = '55000';
  end if;
  return new;
end;
$$;

create trigger proposals_guard before update on public.proposals
  for each row execute function private.guard_applied_proposal();
create trigger proposals_stamp before insert or update on public.proposals
  for each row execute function private.stamp_update();
create trigger proposals_audit after insert or update or delete on public.proposals
  for each row execute function private.audit_row('client_id', 'updated_by', 'applied_by');

create trigger proposal_adjustments_stamp before insert or update on public.proposal_adjustments
  for each row execute function private.stamp_update();
create trigger proposal_adjustments_audit after insert or update or delete on public.proposal_adjustments
  for each row execute function private.audit_row('client_id', 'updated_by');

-- 4. Aplicar --------------------------------------------------------------------------------------

-- Pasa los ajustes aceptados al presupuesto (el valor nuevo o el gasto borrado), crea las tareas que
-- le pasa la app (sus textos van en el idioma de quien aplica), deja la propuesta aplicada con las
-- cifras de antes y después y lleva lo pendiente a una propuesta nueva. Todo o nada. `security definer` porque escribe la propuesta, que no
-- tiene `update` para nadie: comprueba que quien llama es asesor del cliente y filtra todo por él.
-- Los disparadores del presupuesto y de las tareas (historial, monedas, guardas) corren igual.
create function public.apply_proposal(p_proposal uuid, p_before jsonb, p_after jsonb, p_tasks jsonb)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_client uuid;
  v_next uuid;
  v_adjustment record;
  v_task jsonb;
begin
  select p.client_id into v_client
  from public.proposals p
  where p.id = p_proposal and p.status = 'borrador'
  for update;
  if v_client is null or not private.is_advisor_of(v_client) then
    raise exception 'La propuesta no existe o ya se aplicó' using errcode = 'P0002';
  end if;
  if jsonb_typeof(p_before) is distinct from 'object' or jsonb_typeof(p_after) is distinct from 'object'
     or jsonb_typeof(p_tasks) is distinct from 'array' then
    raise exception 'Datos con forma inválida' using errcode = '22023';
  end if;

  for v_adjustment in
    select a.id, a.kind, a.amount, a.currency, b.id as item_id, b.concept as item_concept,
           b.currency as item_currency, b.frequency as item_frequency, b.amount as item_amount
    from public.proposal_adjustments a
    join public.budget_items b on b.id = a.budget_item_id and b.client_id = a.client_id
    where a.proposal_id = p_proposal and a.client_id = v_client and a.decision = 'aceptado'
    order by a.sort_order, a.id
  loop
    if v_adjustment.kind = 'ajustar' and v_adjustment.item_currency <> v_adjustment.currency then
      raise exception 'El gasto % cambió de moneda; revisa su ajuste', v_adjustment.item_concept
        using errcode = '22023';
    end if;
    -- El registro guarda el gasto como estaba al aplicar.
    update public.proposal_adjustments
    set applied = true, concept = v_adjustment.item_concept, frequency = v_adjustment.item_frequency,
        from_amount = v_adjustment.item_amount
    where id = v_adjustment.id;
    if v_adjustment.kind = 'ajustar' then
      update public.budget_items set amount = v_adjustment.amount
      where id = v_adjustment.item_id and client_id = v_client;
    else
      delete from public.budget_items where id = v_adjustment.item_id and client_id = v_client;
    end if;
  end loop;

  for v_task in select value from jsonb_array_elements(p_tasks) loop
    insert into public.action_items (client_id, title, priority, owner_role, due_date, note, sort_order)
    values (v_client, v_task ->> 'title', 'media', 'cliente', (v_task ->> 'due_date')::date,
            nullif(v_task ->> 'note', ''), coalesce((v_task ->> 'sort_order')::int, 0));
  end loop;

  update public.proposals
  set status = 'aplicada', applied_at = now(), applied_by = (select auth.uid()),
      before_figures = p_before, after_figures = p_after
  where id = p_proposal;

  -- Lo que el cliente dejó pendiente pasa a una propuesta nueva, para seguir conversándolo. Lo
  -- descartado queda solo en el registro.
  if exists (select 1 from public.proposal_adjustments a
             where a.proposal_id = p_proposal and a.decision = 'pendiente'
               and a.budget_item_id is not null) then
    insert into public.proposals (client_id) values (v_client) returning id into v_next;
    insert into public.proposal_adjustments (proposal_id, client_id, budget_item_id, kind, amount,
      concept, currency, frequency, from_amount, reason, sort_order)
    select v_next, a.client_id, a.budget_item_id, a.kind, a.amount, a.concept, a.currency,
           a.frequency, a.from_amount, a.reason, a.sort_order
    from public.proposal_adjustments a
    where a.proposal_id = p_proposal and a.decision = 'pendiente' and a.budget_item_id is not null;
  end if;
end;
$$;

revoke execute on function public.apply_proposal(uuid, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.apply_proposal(uuid, jsonb, jsonb, jsonb) to authenticated;

-- 5. RLS, políticas y privilegios -----------------------------------------------------------------

-- Solo el asesor del cliente (matriz de permisos): el cliente ve el resultado en su presupuesto y
-- sus tareas. Una propuesta en borrador se crea y se borra; nadie la actualiza desde la API.
alter table public.proposals enable row level security;
revoke all on public.proposals from anon, authenticated;
grant select, insert (client_id), delete on public.proposals to authenticated;
create policy proposals_select on public.proposals for select to authenticated
  using (private.is_advisor_of(client_id));
create policy proposals_insert on public.proposals for insert to authenticated
  with check (private.is_advisor_of(client_id) and status = 'borrador');
create policy proposals_delete on public.proposals for delete to authenticated
  using (private.is_advisor_of(client_id) and status = 'borrador');

-- Los ajustes se escriben solo mientras su propuesta está en borrador: lo aplicado queda fijo. Las
-- acciones de las llaves foráneas (borrar el gasto o el cliente) no pasan por RLS.
alter table public.proposal_adjustments enable row level security;
revoke all on public.proposal_adjustments from anon, authenticated;
grant select,
  insert (proposal_id, client_id, budget_item_id, kind, amount, concept, currency, frequency,
    from_amount, reason, decision, sort_order),
  -- Al editar, la app vuelve a copiar el gasto (concepto, moneda, frecuencia y valor de hoy).
  update (kind, amount, concept, currency, frequency, from_amount, reason, decision, sort_order),
  delete
  on public.proposal_adjustments to authenticated;
create policy proposal_adjustments_select on public.proposal_adjustments for select to authenticated
  using (private.is_advisor_of(client_id));
create policy proposal_adjustments_insert on public.proposal_adjustments for insert to authenticated
  with check (private.is_advisor_of(client_id) and exists (
    select 1 from public.proposals p
    where p.id = proposal_id and p.client_id = proposal_adjustments.client_id and p.status = 'borrador'));
create policy proposal_adjustments_update on public.proposal_adjustments for update to authenticated
  using (private.is_advisor_of(client_id) and exists (
    select 1 from public.proposals p
    where p.id = proposal_id and p.client_id = proposal_adjustments.client_id and p.status = 'borrador'))
  with check (private.is_advisor_of(client_id));
create policy proposal_adjustments_delete on public.proposal_adjustments for delete to authenticated
  using (private.is_advisor_of(client_id) and exists (
    select 1 from public.proposals p
    where p.id = proposal_id and p.client_id = proposal_adjustments.client_id and p.status = 'borrador'));
