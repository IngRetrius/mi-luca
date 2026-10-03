-- Deudas del diagnóstico (F4): el inventario y el método de pago de la hoja Deudas. Lo del
-- seguimiento cuota a cuota (plazo, seguros, FRECH, marcas de pago) llega con los créditos.
-- Matriz de permisos (docs/03-modelo-de-datos.md, sección 5): el inventario lo editan cliente y
-- asesor; el método y el orden manual son criterio del asesor.

-- 1. Método de pago -------------------------------------------------------------------------------

alter table public.case_settings
  add column debt_method text not null default 'avalancha'
    check (debt_method in ('avalancha', 'bola_de_nieve', 'manual'));

grant insert (debt_method), update (debt_method) on public.case_settings to authenticated;

-- 2. Deudas ---------------------------------------------------------------------------------------

-- Solo el nombre de la entidad (regla 9 de CLAUDE.md): sin números de crédito ni de tarjeta.
-- Saldo y cuota en la moneda de la deuda; la tasa es efectiva anual (0,28 es 28 %).
create table public.debts (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients (id) on delete cascade,
  name            text not null check (btrim(name) <> '' and length(name) <= 80),
  debt_type       text not null check (debt_type in ('tarjeta_credito', 'libre_inversion', 'vehiculo',
                    'hipotecario', 'libranza', 'informal', 'otro')),
  lender_name     text check (length(lender_name) <= 80),
  currency        char(3) not null check (currency ~ '^[A-Z]{3}$'),
  balance         numeric(18, 2) not null check (balance >= 0),
  annual_rate     numeric(8, 6) not null check (annual_rate between 0 and 10),
  min_payment     numeric(18, 2) not null check (min_payment >= 0),
  accepts_extra   boolean not null default true,
  extra_from_date date,
  manual_order    smallint check (manual_order between 1 and 99),
  note            text check (length(note) <= 500),
  sort_order      int not null default 0,
  updated_at      timestamptz not null default now(),
  updated_by      uuid,
  constraint extra_from_needs_extra check (accepts_extra or extra_from_date is null)
);
create index debts_client_id_idx on public.debts (client_id);

-- El orden manual es criterio del asesor: el cliente da de alta deudas sin lugar y no lo cambia.
create function private.guard_debt_advisor_columns()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null or private.is_advisor_of(new.client_id) then
    return new;
  end if;
  if (tg_op = 'INSERT' and new.manual_order is not null)
     or (tg_op = 'UPDATE' and new.manual_order is distinct from old.manual_order) then
    raise exception 'El orden de pago lo fija el asesor' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- 3. Monedas en uso -------------------------------------------------------------------------------

-- La tasa de una moneda en uso no se borra (RN-017): ahora también deudas.
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
       or exists (select 1 from public.debts d where d.client_id = old.client_id and d.currency = old.currency) then
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

create trigger debts_guard_advisor_columns before insert or update on public.debts
  for each row execute function private.guard_debt_advisor_columns();
create trigger debts_currency before insert or update of currency on public.debts
  for each row execute function private.check_currency('currency');
create trigger debts_stamp before insert or update on public.debts
  for each row execute function private.stamp_update();
create trigger debts_audit after insert or update or delete on public.debts
  for each row execute function private.audit_row('client_id', 'updated_by');

-- 5. RLS, políticas y privilegios -----------------------------------------------------------------

alter table public.debts enable row level security;

revoke all on public.debts from anon, authenticated;

grant select, insert (client_id, name, debt_type, lender_name, currency, balance, annual_rate, min_payment,
    accepts_extra, extra_from_date, manual_order, note, sort_order),
  update (name, debt_type, lender_name, currency, balance, annual_rate, min_payment, accepts_extra,
    extra_from_date, manual_order, note, sort_order),
  delete on public.debts to authenticated;
create policy debts_select on public.debts for select to authenticated
  using (private.can_access(client_id));
create policy debts_insert on public.debts for insert to authenticated
  with check (private.can_access(client_id));
create policy debts_update on public.debts for update to authenticated
  using (private.can_access(client_id)) with check (private.can_access(client_id));
create policy debts_delete on public.debts for delete to authenticated
  using (private.can_access(client_id));
