-- Datos de entrada de F3: supuestos del plan, bancos y bolsillos, bolsillo de cada partida, cuentas
-- por cobrar, prueba de realidad y activos (su parte líquida se reparte en los bolsillos).
-- Modelo: docs/03-modelo-de-datos.md, secciones 3.3 y 3.4. Diferencias con el borrador en la
-- sección 11 de ese documento.
--
-- Mismas reglas que en F2: RLS decide las filas, los privilegios por columna deciden qué escribe
-- `authenticated`, `anon` no tiene acceso y cada tabla deja historial. Bancos, bolsillos, cobros,
-- saldos de la prueba de realidad y activos son datos de hecho (dueño y asesor con acceso); los
-- supuestos del plan y el % de cada cobro que va a inversión, criterio del asesor.

-- 1. Parámetros de la metodología -----------------------------------------------------------------

-- Valores por defecto de la plantilla 2.2 (hoja Supuestos) y del protocolo (fuentes internas I1 e
-- I2 de docs/fuentes.md). El asesor puede fijar otro valor por cliente en `case_settings`.
insert into public.country_parameters
  (country_code, key, value, unit, valid_from, source_name, consulted_at, notes)
values
  (null, 'method.expensive_debt_threshold', '0.2', 'ratio', '2026-01-01',
   'Protocolo, sección 8.3; plantilla 2.2, Supuestos!C22', '2026-10-02',
   'Tasa efectiva anual desde la que una deuda es cara. Orientativo: ajustar a las tasas vigentes.'),
  (null, 'method.pct_surplus_invest_confirmed', '0.7', 'ratio', '2026-01-01',
   'Protocolo, sección 8.7; plantilla 2.2, Supuestos!C23', '2026-10-02',
   'Parte del sobrante que va a inversión con la prueba de realidad confirmada.'),
  (null, 'method.pct_surplus_invest_pending', '0.5', 'ratio', '2026-01-01',
   'Protocolo, secciones 6.2 y 8.7; plantilla 2.2, Supuestos!C24', '2026-10-02',
   'Parte del sobrante que va a inversión mientras la prueba de realidad no se confirma.'),
  (null, 'method.pct_surplus_to_debt', '0.9', 'ratio', '2026-01-01',
   'Protocolo, sección 9; plantilla 2.2, Supuestos!C25', '2026-10-02',
   'Parte del sobrante que va a deudas cuando hay deuda cara.'),
  (null, 'method.pct_excess_to_invest', '0.5', 'ratio', '2026-01-01',
   'Protocolo, sección 8.4; plantilla 2.2, Supuestos!C26', '2026-10-02',
   'Parte del excedente del saldo actual que va a inversión (o a la deuda cara, si existe).');

-- 2. Supuestos del plan ---------------------------------------------------------------------------

-- Vacías = el parámetro vigente de la metodología (los meses de fondo, el del tipo de cliente).
-- El colchón va en la moneda base del cliente.
alter table public.case_settings
  add column emergency_months_override    numeric(4, 1) check (emergency_months_override > 0
                                                               and emergency_months_override <= 24),
  add column expensive_debt_threshold     numeric(6, 4) check (expensive_debt_threshold between 0 and 1),
  add column pct_surplus_invest_confirmed numeric(5, 4) check (pct_surplus_invest_confirmed between 0 and 1),
  add column pct_surplus_invest_pending   numeric(5, 4) check (pct_surplus_invest_pending between 0 and 1),
  add column pct_surplus_to_debt          numeric(5, 4) check (pct_surplus_to_debt between 0 and 1),
  add column pct_excess_to_invest         numeric(5, 4) check (pct_excess_to_invest between 0 and 1),
  add column operating_cushion            numeric(18, 2) not null default 0 check (operating_cushion >= 0);

grant insert (emergency_months_override, expensive_debt_threshold, pct_surplus_invest_confirmed,
    pct_surplus_invest_pending, pct_surplus_to_debt, pct_excess_to_invest, operating_cushion),
  update (emergency_months_override, expensive_debt_threshold, pct_surplus_invest_confirmed,
    pct_surplus_invest_pending, pct_surplus_to_debt, pct_excess_to_invest, operating_cushion)
  on public.case_settings to authenticated;

-- 3. Bancos y bolsillos ---------------------------------------------------------------------------

-- Solo el nombre de la entidad (regla 9 de CLAUDE.md): sin números de cuenta.
create table public.banks (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.clients (id) on delete cascade,
  name           text not null check (btrim(name) <> '' and length(name) <= 80),
  max_pockets    smallint check (max_pockets between 1 and 99),   -- límite de bolsillos del banco (RN-073)
  is_remunerated boolean not null default false,
  note           text check (length(note) <= 500),
  sort_order     int not null default 0,
  updated_at     timestamptz not null default now(),
  updated_by     uuid,
  unique (client_id, name),
  unique (id, client_id)                                            -- para las llaves compuestas
);
create index banks_client_id_idx on public.banks (client_id);

-- El fondo de emergencia y los meses sin ingreso tienen un bolsillo cada uno, con meta y saldo que
-- sugiere el motor; los generales reciben las partidas del presupuesto y un saldo inicial.
create table public.pockets (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients (id) on delete cascade,
  bank_id         uuid,
  kind            text not null default 'general'
                    check (kind in ('emergencia', 'meses_sin_ingreso', 'general')),
  name            text not null check (btrim(name) <> '' and length(name) <= 60),
  purpose         text check (length(purpose) <= 300),
  when_used       text check (length(when_used) <= 200),
  currency        char(3) not null check (currency ~ '^[A-Z]{3}$'),  -- la de su cuenta
  initial_balance numeric(18, 2) check (initial_balance >= 0),
  sort_order      int not null default 0,
  updated_at      timestamptz not null default now(),
  updated_by      uuid,
  unique (client_id, name),
  unique (id, client_id),
  check (kind = 'general' or initial_balance is null),
  -- El banco es del mismo cliente; al borrarlo, el bolsillo queda sin banco.
  foreign key (bank_id, client_id) references public.banks (id, client_id) on delete set null (bank_id)
);
create index pockets_client_id_idx on public.pockets (client_id);
create index pockets_bank_id_idx on public.pockets (bank_id);
create unique index pockets_one_special_per_kind on public.pockets (client_id, kind) where kind <> 'general';

-- Bolsillo de cada partida (RN-027). No es obligatorio en la base: una partida tipo bolsillo sin
-- bolsillo es un pendiente que bloquea la entrega (control de calidad), no un error al guardar.
alter table public.budget_items
  add column pocket_id uuid,
  add foreign key (pocket_id, client_id) references public.pockets (id, client_id)
    on delete set null (pocket_id);
create index budget_items_pocket_id_idx on public.budget_items (pocket_id);

grant insert (pocket_id), update (pocket_id) on public.budget_items to authenticated;

-- 4. Cuentas por cobrar ---------------------------------------------------------------------------

-- Dinero que le deben al cliente (RN-060). Saldo y cuota en la moneda del cobro.
create table public.receivables (
  id                 uuid primary key default gen_random_uuid(),
  client_id          uuid not null references public.clients (id) on delete cascade,
  debtor_label       text not null check (btrim(debtor_label) <> '' and length(debtor_label) <= 60),
  currency           char(3) not null check (currency ~ '^[A-Z]{3}$'),
  balance            numeric(18, 2) not null check (balance > 0),
  monthly_payment    numeric(18, 2) not null check (monthly_payment > 0),
  first_payment_date date,
  pct_to_investment  numeric(5, 4) not null default 1 check (pct_to_investment between 0 and 1),
  note               text check (length(note) <= 500),
  sort_order         int not null default 0,
  updated_at         timestamptz not null default now(),
  updated_by         uuid
);
create index receivables_client_id_idx on public.receivables (client_id);

-- El % a inversión es criterio del asesor (matriz de permisos). Guarda propia porque la columna
-- tiene valor por defecto: el cliente da de alta cobros con el valor por defecto.
create function private.guard_receivable_advisor_columns()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null or private.is_advisor_of(new.client_id) then
    return new;
  end if;
  if (tg_op = 'INSERT' and new.pct_to_investment <> 1)
     or (tg_op = 'UPDATE' and new.pct_to_investment is distinct from old.pct_to_investment) then
    raise exception 'El %% del cobro que va a inversión solo lo cambia el asesor' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- 5. Prueba de realidad ---------------------------------------------------------------------------

-- Saldos que da el cliente (RN-050): ahorro total hace N meses y hoy, en la misma moneda.
create table public.reality_check (
  client_id     uuid primary key references public.clients (id) on delete cascade,
  currency      char(3) not null check (currency ~ '^[A-Z]{3}$'),
  savings_n_ago numeric(18, 2) check (savings_n_ago >= 0),
  n_months      smallint check (n_months between 1 and 120),
  savings_today numeric(18, 2) check (savings_today >= 0),
  updated_at    timestamptz not null default now(),
  updated_by    uuid
);

-- 6. Activos --------------------------------------------------------------------------------------

-- Patrimonio sin inversiones ni cobros (tienen sus tablas). Lo líquido se reparte en bolsillos;
-- el patrimonio completo llega en F5.
create table public.assets (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references public.clients (id) on delete cascade,
  name             text not null check (btrim(name) <> '' and length(name) <= 80),
  asset_type       text not null check (asset_type in ('liquido', 'inmueble', 'vehiculo', 'otro')),
  currency         char(3) not null check (currency ~ '^[A-Z]{3}$'),
  value            numeric(18, 2) not null check (value >= 0),
  generates_income boolean not null default false,
  pocket_id        uuid,
  note             text check (length(note) <= 500),
  sort_order       int not null default 0,
  updated_at       timestamptz not null default now(),
  updated_by       uuid,
  foreign key (pocket_id, client_id) references public.pockets (id, client_id) on delete set null (pocket_id)
);
create index assets_client_id_idx on public.assets (client_id);
create index assets_pocket_id_idx on public.assets (pocket_id);

-- 7. Monedas en uso -------------------------------------------------------------------------------

-- La tasa de una moneda en uso no se borra (RN-017): ahora también bolsillos, cobros, prueba de
-- realidad y activos.
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
       or exists (select 1 from public.assets a where a.client_id = old.client_id and a.currency = old.currency) then
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

-- 8. Disparadores ---------------------------------------------------------------------------------

create trigger banks_stamp before insert or update on public.banks
  for each row execute function private.stamp_update();
create trigger banks_audit after insert or update or delete on public.banks
  for each row execute function private.audit_row('client_id', 'updated_by');

create trigger pockets_currency before insert or update of currency on public.pockets
  for each row execute function private.check_currency('currency');
create trigger pockets_stamp before insert or update on public.pockets
  for each row execute function private.stamp_update();
create trigger pockets_audit after insert or update or delete on public.pockets
  for each row execute function private.audit_row('client_id', 'updated_by');

create trigger receivables_guard_advisor_columns before insert or update on public.receivables
  for each row execute function private.guard_receivable_advisor_columns();
create trigger receivables_currency before insert or update of currency on public.receivables
  for each row execute function private.check_currency('currency');
create trigger receivables_stamp before insert or update on public.receivables
  for each row execute function private.stamp_update();
create trigger receivables_audit after insert or update or delete on public.receivables
  for each row execute function private.audit_row('client_id', 'updated_by');

create trigger reality_check_currency before insert or update of currency on public.reality_check
  for each row execute function private.check_currency('currency');
create trigger reality_check_stamp before insert or update on public.reality_check
  for each row execute function private.stamp_update();
create trigger reality_check_audit after insert or update or delete on public.reality_check
  for each row execute function private.audit_row('client_id', 'updated_by');

create trigger assets_currency before insert or update of currency on public.assets
  for each row execute function private.check_currency('currency');
create trigger assets_stamp before insert or update on public.assets
  for each row execute function private.stamp_update();
create trigger assets_audit after insert or update or delete on public.assets
  for each row execute function private.audit_row('client_id', 'updated_by');

-- 9. RLS, políticas y privilegios (matriz de la sección 5) ----------------------------------------

alter table public.banks enable row level security;
alter table public.pockets enable row level security;
alter table public.receivables enable row level security;
alter table public.reality_check enable row level security;
alter table public.assets enable row level security;

revoke all on public.banks, public.pockets, public.receivables, public.reality_check, public.assets
  from anon, authenticated;

grant select, insert (client_id, name, max_pockets, is_remunerated, note, sort_order),
  update (name, max_pockets, is_remunerated, note, sort_order), delete on public.banks to authenticated;
create policy banks_select on public.banks for select to authenticated
  using (private.can_access(client_id));
create policy banks_insert on public.banks for insert to authenticated
  with check (private.can_access(client_id));
create policy banks_update on public.banks for update to authenticated
  using (private.can_access(client_id)) with check (private.can_access(client_id));
create policy banks_delete on public.banks for delete to authenticated
  using (private.can_access(client_id));

grant select, insert (client_id, bank_id, kind, name, purpose, when_used, currency, initial_balance,
    sort_order),
  update (bank_id, name, purpose, when_used, currency, initial_balance, sort_order), delete
  on public.pockets to authenticated;
create policy pockets_select on public.pockets for select to authenticated
  using (private.can_access(client_id));
create policy pockets_insert on public.pockets for insert to authenticated
  with check (private.can_access(client_id));
create policy pockets_update on public.pockets for update to authenticated
  using (private.can_access(client_id)) with check (private.can_access(client_id));
create policy pockets_delete on public.pockets for delete to authenticated
  using (private.can_access(client_id));

grant select, insert (client_id, debtor_label, currency, balance, monthly_payment, first_payment_date,
    pct_to_investment, note, sort_order),
  update (debtor_label, currency, balance, monthly_payment, first_payment_date, pct_to_investment, note,
    sort_order),
  delete on public.receivables to authenticated;
create policy receivables_select on public.receivables for select to authenticated
  using (private.can_access(client_id));
create policy receivables_insert on public.receivables for insert to authenticated
  with check (private.can_access(client_id));
create policy receivables_update on public.receivables for update to authenticated
  using (private.can_access(client_id)) with check (private.can_access(client_id));
create policy receivables_delete on public.receivables for delete to authenticated
  using (private.can_access(client_id));

grant select, insert (client_id, currency, savings_n_ago, n_months, savings_today),
  update (currency, savings_n_ago, n_months, savings_today), delete on public.reality_check to authenticated;
create policy reality_check_select on public.reality_check for select to authenticated
  using (private.can_access(client_id));
create policy reality_check_insert on public.reality_check for insert to authenticated
  with check (private.can_access(client_id));
create policy reality_check_update on public.reality_check for update to authenticated
  using (private.can_access(client_id)) with check (private.can_access(client_id));
create policy reality_check_delete on public.reality_check for delete to authenticated
  using (private.can_access(client_id));

grant select, insert (client_id, name, asset_type, currency, value, generates_income, pocket_id, note,
    sort_order),
  update (name, asset_type, currency, value, generates_income, pocket_id, note, sort_order), delete
  on public.assets to authenticated;
create policy assets_select on public.assets for select to authenticated
  using (private.can_access(client_id));
create policy assets_insert on public.assets for insert to authenticated
  with check (private.can_access(client_id));
create policy assets_update on public.assets for update to authenticated
  using (private.can_access(client_id)) with check (private.can_access(client_id));
create policy assets_delete on public.assets for delete to authenticated
  using (private.can_access(client_id));
