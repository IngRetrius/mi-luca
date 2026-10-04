-- F7: control mensual (RN-133) y plan de acción (RN-134).
-- Matriz de permisos (docs/03-modelo-de-datos.md, sección 5): el control mensual lo escriben el
-- cliente y el asesor; las tareas las crea, fecha y borra el asesor, y el cliente cambia su estado y
-- su nota.

-- 1. Control mensual ------------------------------------------------------------------------------

-- Gasto real de una categoría del presupuesto en un mes. Un registro por categoría y mes; 0 es un
-- mes registrado sin gasto. La categoría es el texto de `budget_items.category` (o de una fila
-- automática: Deudas, Seguros, Metas).
create table public.monthly_control_entries (
  client_id  uuid not null references public.clients (id) on delete cascade,
  year       smallint not null check (year between 2000 and 2100),
  month      smallint not null check (month between 1 and 12),
  category   text not null check (btrim(category) <> '' and length(category) <= 60),
  currency   char(3) not null check (currency ~ '^[A-Z]{3}$'),
  amount     numeric(18, 2) not null check (amount >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid,
  primary key (client_id, year, month, category)
);

-- 2. Plan de acción -------------------------------------------------------------------------------

create table public.action_items (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.clients (id) on delete cascade,
  -- Tarea sugerida de la que nace (ACTION_TEMPLATES del motor); null si la escribió el asesor.
  suggestion_key text check (suggestion_key in ('create_pockets', 'automate_transfers',
                   'record_actual_spending', 'complete_reality_check', 'pay_debts_in_order',
                   'quote_insurance', 'review_beneficiaries', 'consult_accountant', 'pension_projection',
                   'will_and_family_folder', 'investment_profile', 'review_30_days', 'review_90_days',
                   'annual_review')),
  title          text not null check (btrim(title) <> '' and length(title) <= 200),
  priority       text not null check (priority in ('alta', 'media', 'baja')),
  owner_role     text not null check (owner_role in ('cliente', 'asesor', 'contador', 'abogado',
                   'aseguradora', 'administradora_pensiones')),
  due_date       date,
  status         text not null default 'pendiente' check (status in ('pendiente', 'en_curso', 'hecho')),
  note           text check (length(note) <= 500),
  completed_at   timestamptz,
  completed_by   uuid,
  sort_order     int not null default 0,
  updated_at     timestamptz not null default now(),
  updated_by     uuid,
  -- Cada sugerencia se agrega una vez (las escritas a mano no llevan llave y no chocan).
  unique (client_id, suggestion_key)
);
create index action_items_client_id_idx on public.action_items (client_id);

-- Fecha y autor de la tarea hecha: los pone la base, no quien escribe.
create function private.stamp_action_item_completion()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.status = 'hecho' then
    if tg_op = 'INSERT' or old.status <> 'hecho' then
      new.completed_at := now();
      new.completed_by := (select auth.uid());
    else
      new.completed_at := old.completed_at;
      new.completed_by := old.completed_by;
    end if;
  else
    new.completed_at := null;
    new.completed_by := null;
  end if;
  return new;
end;
$$;

-- 3. Monedas en uso -------------------------------------------------------------------------------

-- La tasa de una moneda en uso no se borra (RN-017): ahora también el control mensual.
create or replace function private.guard_fx_rate()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    -- Al borrar el perfil, sus importes se van con él.
    if not exists (select 1 from public.clients c where c.id = old.client_id) then
      return old;
    end if;
    if exists (select 1 from public.incomes i where i.client_id = old.client_id and i.currency = old.currency)
       or exists (select 1 from public.budget_items b where b.client_id = old.client_id and b.currency = old.currency)
       or exists (select 1 from public.variable_income_history h
                  where h.client_id = old.client_id and h.currency = old.currency)
       or exists (select 1 from public.pockets p where p.client_id = old.client_id and p.currency = old.currency)
       or exists (select 1 from public.receivables r where r.client_id = old.client_id and r.currency = old.currency)
       or exists (select 1 from public.reality_check q where q.client_id = old.client_id and q.currency = old.currency)
       or exists (select 1 from public.assets a where a.client_id = old.client_id and a.currency = old.currency)
       or exists (select 1 from public.debts d where d.client_id = old.client_id and d.currency = old.currency)
       or exists (select 1 from public.goals g where g.client_id = old.client_id
                  and (g.currency = old.currency or (g.uses_trip_calculator and g.trip_currency = old.currency)))
       or exists (select 1 from public.insurances s where s.client_id = old.client_id and s.currency = old.currency)
       or exists (select 1 from public.investments v where v.client_id = old.client_id and v.currency = old.currency)
       or exists (select 1 from public.monthly_control_entries m
                  where m.client_id = old.client_id and m.currency = old.currency) then
      raise exception 'La moneda % está en uso; cambia esos importes antes de borrar su tasa', old.currency
        using errcode = '23503';
    end if;
    return old;
  end if;
  if new.currency = (select c.base_currency from public.clients c where c.id = new.client_id) then
    raise exception 'La moneda base no lleva tasa de cambio' using errcode = '23514';
  end if;
  return new;
end;
$$;

-- 4. Disparadores ---------------------------------------------------------------------------------

create trigger monthly_control_entries_currency before insert or update of currency
  on public.monthly_control_entries
  for each row execute function private.check_currency('currency');
create trigger monthly_control_entries_stamp before insert or update on public.monthly_control_entries
  for each row execute function private.stamp_update();
create trigger monthly_control_entries_audit after insert or update or delete on public.monthly_control_entries
  for each row execute function private.audit_row('client_id', 'updated_by');

-- El cliente solo cambia estado y nota; lo demás es criterio del asesor.
create trigger action_items_guard_advisor_columns before insert or update on public.action_items
  for each row execute function private.guard_advisor_columns('suggestion_key', 'title', 'priority',
    'owner_role', 'due_date', 'sort_order');
create trigger action_items_completion before insert or update on public.action_items
  for each row execute function private.stamp_action_item_completion();
create trigger action_items_stamp before insert or update on public.action_items
  for each row execute function private.stamp_update();
create trigger action_items_audit after insert or update or delete on public.action_items
  for each row execute function private.audit_row('client_id', 'updated_by', 'completed_by');

-- 5. RLS, políticas y privilegios -----------------------------------------------------------------

alter table public.monthly_control_entries enable row level security;
alter table public.action_items enable row level security;

revoke all on public.monthly_control_entries, public.action_items from anon, authenticated;

-- La pantalla guarda el mes con upsert, que actualiza todas las columnas que envía; la política
-- vuelve a exigir el acceso al cliente de la fila resultante.
grant select, insert (client_id, year, month, category, currency, amount),
  update (client_id, year, month, category, currency, amount), delete
  on public.monthly_control_entries to authenticated;
create policy monthly_control_entries_select on public.monthly_control_entries for select to authenticated
  using (private.can_access(client_id));
create policy monthly_control_entries_insert on public.monthly_control_entries for insert to authenticated
  with check (private.can_access(client_id));
create policy monthly_control_entries_update on public.monthly_control_entries for update to authenticated
  using (private.can_access(client_id)) with check (private.can_access(client_id));
create policy monthly_control_entries_delete on public.monthly_control_entries for delete to authenticated
  using (private.can_access(client_id));

grant select, insert (client_id, suggestion_key, title, priority, owner_role, due_date, status, note,
    sort_order),
  update (title, priority, owner_role, due_date, status, note, sort_order), delete
  on public.action_items to authenticated;
create policy action_items_select on public.action_items for select to authenticated
  using (private.can_access(client_id));
create policy action_items_insert on public.action_items for insert to authenticated
  with check (private.is_advisor_of(client_id));
create policy action_items_update on public.action_items for update to authenticated
  using (private.can_access(client_id)) with check (private.can_access(client_id));
create policy action_items_delete on public.action_items for delete to authenticated
  using (private.is_advisor_of(client_id));
