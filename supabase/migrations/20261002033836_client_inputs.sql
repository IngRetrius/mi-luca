-- Datos de entrada del cliente para F2: tasas de cambio, supuestos del caso, ingresos, meses de
-- seguridad social, historia de ingreso variable y presupuesto; y parámetros por país, versionados.
-- Modelo: docs/03-modelo-de-datos.md, secciones 3.2 a 3.4 y 5. Diferencias con el borrador en la
-- sección 11 de ese documento.
--
-- Como en F1: RLS decide las filas, los privilegios por columna deciden qué escribe `authenticated`,
-- `anon` no tiene acceso y cada tabla deja historial. Dueño y asesor con acceso editan los datos de
-- hecho; el criterio profesional (supuestos del caso, nivel básico, parámetros) solo el asesor.

create extension if not exists btree_gist with schema extensions;

-- 1. Disparadores genéricos -----------------------------------------------------------------------

-- Quién y cuándo cambió la fila por última vez. Sin usuario (clave secreta) queda vacío.
create function private.stamp_update()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := (select auth.uid());
  return new;
end;
$$;

-- Multimoneda (RN-017): un importe en una moneda distinta de la base necesita la tasa del cliente.
-- Argumentos: las columnas de moneda de la fila.
create function private.check_currency()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_col text;
  v_currency text;
begin
  foreach v_col in array tg_argv loop
    v_currency := to_jsonb(new) ->> v_col;
    if v_currency is not null
       and v_currency <> (select c.base_currency from public.clients c where c.id = new.client_id)
       and not exists (
         select 1 from public.client_fx_rates r
         where r.client_id = new.client_id and r.currency = v_currency
       ) then
      raise exception 'Falta la tasa de cambio de % para este cliente', v_currency using errcode = '23514';
    end if;
  end loop;
  return new;
end;
$$;

-- 2. Tasas de cambio del cliente ------------------------------------------------------------------

-- La tasa que recibe el cliente (no un parámetro del país): unidades de moneda base por 1 unidad.
create table public.client_fx_rates (
  client_id    uuid not null references public.clients (id) on delete cascade,
  currency     char(3) not null check (currency ~ '^[A-Z]{3}$'),
  rate_to_base numeric(18, 8) not null check (rate_to_base > 0),
  as_of        date not null,
  note         text check (length(note) <= 500),
  updated_at   timestamptz not null default now(),
  updated_by   uuid,                                -- sin FK, como el historial
  primary key (client_id, currency)
);

-- No hay tasa para la moneda base, y no se borra la tasa de una moneda en uso (RN-017).
create function private.guard_fx_rate()
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
                  where h.client_id = old.client_id and h.currency = old.currency) then
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

-- 3. Supuestos del caso ---------------------------------------------------------------------------

-- Criterio del asesor. Sin fila, o con columnas vacías, valen los valores por defecto. Las demás
-- columnas del borrador (porcentajes, rendimientos, colchón) llegan con sus módulos.
create table public.case_settings (
  client_id          uuid primary key references public.clients (id) on delete cascade,
  cutoff_date        date,                        -- vacía = hoy, como =TODAY() en la plantilla
  flow_year          smallint check (flow_year between 2000 and 2100), -- vacío = año siguiente al corte
  compatibility_mode boolean not null default false, -- true = reproduce la plantilla 2.2 sin correcciones
  pension_enabled    boolean not null default false, -- lo activa el asesor por cliente; el país no lo decide
  updated_at         timestamptz not null default now(),
  updated_by         uuid
);

-- 4. Ingresos -------------------------------------------------------------------------------------

create table public.incomes (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references public.clients (id) on delete cascade,
  name              text not null check (btrim(name) <> '' and length(name) <= 120),
  kind              text not null check (kind in ('laboral', 'renta', 'pension', 'otro')),
  currency          char(3) not null check (currency ~ '^[A-Z]{3}$'),
  amount            numeric(18, 2) not null check (amount >= 0),
  is_net            boolean not null default true,
  -- Pagos de cada mes, de enero a diciembre (RN-011): 0, 1 o más (la prima, H-22).
  payments_by_month smallint[] not null default '{1,1,1,1,1,1,1,1,1,1,1,1}'
                      check (array_ndims(payments_by_month) = 1 and cardinality(payments_by_month) = 12
                             and array_position(payments_by_month, null) is null
                             and 0 <= all (payments_by_month) and 9 >= all (payments_by_month)),
  allocation        text not null default 'general' check (allocation in ('general', 'ahorro_total')),
  lost_in_scenario  text check (lost_in_scenario in ('a', 'b', 'c')),   -- modo nativo (H-07)
  note              text check (length(note) <= 1000),
  sort_order        int not null default 0,
  updated_at        timestamptz not null default now(),
  updated_by        uuid
);
create index incomes_client_id_idx on public.incomes (client_id);

-- Calculadora de ingreso base (RN-013): lo recibido en cada uno de los últimos 12 meses.
create table public.variable_income_history (
  client_id   uuid not null references public.clients (id) on delete cascade,
  month_index smallint not null check (month_index between 1 and 12),
  currency    char(3) not null check (currency ~ '^[A-Z]{3}$'),
  amount      numeric(18, 2) not null check (amount >= 0),
  updated_at  timestamptz not null default now(),
  updated_by  uuid,
  primary key (client_id, month_index)
);

-- Meses en que se paga seguridad social (RN-021, `Ingresos!G17:R17`). Sin fila, los 12.
create table public.social_security_months (
  client_id         uuid primary key references public.clients (id) on delete cascade,
  payments_by_month smallint[] not null default '{1,1,1,1,1,1,1,1,1,1,1,1}'
                      check (array_ndims(payments_by_month) = 1 and cardinality(payments_by_month) = 12
                             and array_position(payments_by_month, null) is null
                             and 0 <= all (payments_by_month) and 9 >= all (payments_by_month)),
  updated_at        timestamptz not null default now(),
  updated_by        uuid
);

-- 5. Presupuesto ----------------------------------------------------------------------------------

-- Las filas automáticas (cuotas, seguros nuevos, metas) no se guardan: las calcula el motor
-- (RN-028). El bolsillo de cada partida llega en F3 con bancos y bolsillos.
create table public.budget_items (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients (id) on delete cascade,
  category      text not null check (btrim(category) <> '' and length(category) <= 60),
  concept       text not null check (btrim(concept) <> '' and length(concept) <= 120),
  currency      char(3) not null check (currency ~ '^[A-Z]{3}$'),
  amount        numeric(18, 2) check (amount >= 0),               -- valor por pago
  frequency     text check (frequency in ('semanal', 'quincenal', 'mensual', 'bimestral', 'trimestral',
                  'cada_4_meses', 'semestral', 'anual', 'cada_2_anos', 'por_duracion', 'meses_seguridad_social')),
  duration_days numeric(8, 2) check (duration_days > 0),           -- solo para "por duración"
  expense_type  text check (expense_type in ('directo', 'bolsillo', 'seg_social', 'deuda', 'ahorro')),
  essential     boolean not null default false,
  payer         text not null default 'cliente' check (payer in ('cliente', 'familia', 'tercero')),
  payer_label   text check (length(payer_label) <= 60),          -- por ejemplo "sus padres"
  scope         text not null default 'presupuesto' check (scope in ('presupuesto', 'referencia_familiar')),
  is_temporary  boolean not null default false,                  -- por ejemplo, la matrícula
  basic_amount  numeric(18, 2) check (basic_amount >= 0),         -- nivel básico, por pago; solo el asesor
  is_proposed   boolean not null default false,                  -- valor propuesto por el asesor (P5.3)
  note          text check (length(note) <= 1000),
  sort_order    int not null default 0,
  updated_at    timestamptz not null default now(),
  updated_by    uuid
);
create index budget_items_client_id_idx on public.budget_items (client_id);

-- Nivel básico y marca de propuesto: criterio del asesor (matriz de permisos). Guarda propia porque
-- `is_proposed` tiene valor por defecto y la guarda genérica rechazaría todo alta del cliente.
create function private.guard_budget_item_advisor_columns()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null or private.is_advisor_of(new.client_id) then
    return new;
  end if;
  if (tg_op = 'INSERT' and (new.basic_amount is not null or new.is_proposed))
     or (tg_op = 'UPDATE' and (new.basic_amount is distinct from old.basic_amount
                               or new.is_proposed is distinct from old.is_proposed)) then
    raise exception 'El nivel básico y la marca de propuesto solo los cambia el asesor' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- 6. Parámetros por país, versionados -------------------------------------------------------------

-- Vigencia sin solapes por clave. Una versión publicada no cambia: solo se cierra (valid_to) o se
-- anota. Los valores llegan en migraciones con su fuente (docs/fuentes.md).
create table public.country_parameters (
  id           uuid primary key default gen_random_uuid(),
  country_code char(2) references public.countries (code),        -- vacío = parámetro común
  key          text not null check (key ~ '^[a-z0-9_]+(\.[a-z0-9_]+)*$'),
  value        jsonb not null,
  unit         text check (length(unit) <= 20),
  valid_from   date not null,
  valid_to     date,                                               -- vacío = vigente
  source_name  text not null check (btrim(source_name) <> ''),
  source_url   text check (source_url ~ '^https://'),
  consulted_at date not null,
  notes        text check (length(notes) <= 1000),
  created_by   uuid default auth.uid(),
  created_at   timestamptz not null default now(),
  check (valid_to is null or valid_to > valid_from),
  constraint country_parameters_no_overlap exclude using gist (
    (coalesce(country_code, '--')) with =,
    key with =,
    daterange(valid_from, valid_to) with &&
  )
);
create index country_parameters_country_code_idx on public.country_parameters (country_code);

-- Valor vigente en una fecha (la de corte del cliente); el del país gana sobre el común.
create function public.parameter_at(p_country text, p_key text, p_on date)
returns public.country_parameters
language sql stable set search_path = ''
as $$
  select p.* from public.country_parameters p
  where p.key = p_key
    and (p.country_code = p_country or p.country_code is null)
    and p.valid_from <= p_on and (p.valid_to is null or p.valid_to > p_on)
  order by (p.country_code is null)
  limit 1;
$$;

revoke execute on function public.parameter_at(text, text, date) from public, anon;
grant execute on function public.parameter_at(text, text, date) to authenticated;

-- 7. Disparadores ---------------------------------------------------------------------------------

create trigger client_fx_rates_guard before insert or update or delete on public.client_fx_rates
  for each row execute function private.guard_fx_rate();
create trigger client_fx_rates_stamp before insert or update on public.client_fx_rates
  for each row execute function private.stamp_update();
create trigger client_fx_rates_audit after insert or update or delete on public.client_fx_rates
  for each row execute function private.audit_row('client_id', 'updated_by');

create trigger case_settings_stamp before insert or update on public.case_settings
  for each row execute function private.stamp_update();
create trigger case_settings_audit after insert or update or delete on public.case_settings
  for each row execute function private.audit_row('client_id', 'updated_by');

create trigger incomes_currency before insert or update of currency on public.incomes
  for each row execute function private.check_currency('currency');
create trigger incomes_stamp before insert or update on public.incomes
  for each row execute function private.stamp_update();
create trigger incomes_audit after insert or update or delete on public.incomes
  for each row execute function private.audit_row('client_id', 'updated_by');

create trigger variable_income_history_currency before insert or update of currency
  on public.variable_income_history
  for each row execute function private.check_currency('currency');
create trigger variable_income_history_stamp before insert or update on public.variable_income_history
  for each row execute function private.stamp_update();
create trigger variable_income_history_audit after insert or update or delete on public.variable_income_history
  for each row execute function private.audit_row('client_id', 'updated_by');

create trigger social_security_months_stamp before insert or update on public.social_security_months
  for each row execute function private.stamp_update();
create trigger social_security_months_audit after insert or update or delete on public.social_security_months
  for each row execute function private.audit_row('client_id', 'updated_by');

create trigger budget_items_guard_advisor_columns before insert or update on public.budget_items
  for each row execute function private.guard_budget_item_advisor_columns();
create trigger budget_items_currency before insert or update of currency on public.budget_items
  for each row execute function private.check_currency('currency');
create trigger budget_items_stamp before insert or update on public.budget_items
  for each row execute function private.stamp_update();
create trigger budget_items_audit after insert or update or delete on public.budget_items
  for each row execute function private.audit_row('client_id', 'updated_by');

create trigger country_parameters_audit after insert or update or delete on public.country_parameters
  for each row execute function private.audit_row('');

-- 8. RLS, políticas y privilegios (matriz de la sección 5) ----------------------------------------

alter table public.client_fx_rates enable row level security;
alter table public.case_settings enable row level security;
alter table public.incomes enable row level security;
alter table public.variable_income_history enable row level security;
alter table public.social_security_months enable row level security;
alter table public.budget_items enable row level security;
alter table public.country_parameters enable row level security;

revoke all on
  public.client_fx_rates,
  public.case_settings,
  public.incomes,
  public.variable_income_history,
  public.social_security_months,
  public.budget_items,
  public.country_parameters
from anon, authenticated;

-- Tasas: dato de hecho (la tasa que recibe el cliente); dueño y asesor con acceso.
grant select, insert (client_id, currency, rate_to_base, as_of, note),
  update (rate_to_base, as_of, note), delete on public.client_fx_rates to authenticated;
create policy client_fx_rates_select on public.client_fx_rates for select to authenticated
  using (private.can_access(client_id));
create policy client_fx_rates_insert on public.client_fx_rates for insert to authenticated
  with check (private.can_access(client_id));
create policy client_fx_rates_update on public.client_fx_rates for update to authenticated
  using (private.can_access(client_id)) with check (private.can_access(client_id));
create policy client_fx_rates_delete on public.client_fx_rates for delete to authenticated
  using (private.can_access(client_id));

-- Supuestos del caso: el cliente los ve; solo el asesor los escribe. No se borran desde la API.
grant select, insert (client_id, cutoff_date, flow_year, compatibility_mode, pension_enabled),
  update (cutoff_date, flow_year, compatibility_mode, pension_enabled) on public.case_settings to authenticated;
create policy case_settings_select on public.case_settings for select to authenticated
  using (private.can_access(client_id));
create policy case_settings_insert on public.case_settings for insert to authenticated
  with check (private.is_advisor_of(client_id));
create policy case_settings_update on public.case_settings for update to authenticated
  using (private.is_advisor_of(client_id)) with check (private.is_advisor_of(client_id));

-- Ingresos, historia de ingreso variable y meses de seguridad social: dueño y asesor con acceso.
grant select, insert (client_id, name, kind, currency, amount, is_net, payments_by_month, allocation,
    lost_in_scenario, note, sort_order),
  update (name, kind, currency, amount, is_net, payments_by_month, allocation, lost_in_scenario, note,
    sort_order),
  delete on public.incomes to authenticated;
create policy incomes_select on public.incomes for select to authenticated
  using (private.can_access(client_id));
create policy incomes_insert on public.incomes for insert to authenticated
  with check (private.can_access(client_id));
create policy incomes_update on public.incomes for update to authenticated
  using (private.can_access(client_id)) with check (private.can_access(client_id));
create policy incomes_delete on public.incomes for delete to authenticated
  using (private.can_access(client_id));

grant select, insert (client_id, month_index, currency, amount), update (currency, amount), delete
  on public.variable_income_history to authenticated;
create policy variable_income_history_select on public.variable_income_history for select to authenticated
  using (private.can_access(client_id));
create policy variable_income_history_insert on public.variable_income_history for insert to authenticated
  with check (private.can_access(client_id));
create policy variable_income_history_update on public.variable_income_history for update to authenticated
  using (private.can_access(client_id)) with check (private.can_access(client_id));
create policy variable_income_history_delete on public.variable_income_history for delete to authenticated
  using (private.can_access(client_id));

grant select, insert (client_id, payments_by_month), update (payments_by_month)
  on public.social_security_months to authenticated;
create policy social_security_months_select on public.social_security_months for select to authenticated
  using (private.can_access(client_id));
create policy social_security_months_insert on public.social_security_months for insert to authenticated
  with check (private.can_access(client_id));
create policy social_security_months_update on public.social_security_months for update to authenticated
  using (private.can_access(client_id)) with check (private.can_access(client_id));

-- Presupuesto: dueño y asesor con acceso; nivel básico y "propuesto", solo el asesor (guarda).
grant select, insert (client_id, category, concept, currency, amount, frequency, duration_days,
    expense_type, essential, payer, payer_label, scope, is_temporary, basic_amount, is_proposed, note,
    sort_order),
  update (category, concept, currency, amount, frequency, duration_days, expense_type, essential, payer,
    payer_label, scope, is_temporary, basic_amount, is_proposed, note, sort_order),
  delete on public.budget_items to authenticated;
create policy budget_items_select on public.budget_items for select to authenticated
  using (private.can_access(client_id));
create policy budget_items_insert on public.budget_items for insert to authenticated
  with check (private.can_access(client_id));
create policy budget_items_update on public.budget_items for update to authenticated
  using (private.can_access(client_id)) with check (private.can_access(client_id));
create policy budget_items_delete on public.budget_items for delete to authenticated
  using (private.can_access(client_id));

-- Parámetros: datos públicos de la metodología y de cada país; los lee cualquier sesión. Los
-- publica un asesor (con más asesores, un rol administrador); de una versión solo se cambian el
-- cierre y la nota.
grant select, insert (country_code, key, value, unit, valid_from, valid_to, source_name, source_url,
    consulted_at, notes),
  update (valid_to, notes) on public.country_parameters to authenticated;
create policy country_parameters_select on public.country_parameters for select to authenticated
  using (true);
create policy country_parameters_insert on public.country_parameters for insert to authenticated
  with check ((select private.current_advisor_id()) is not null);
create policy country_parameters_update on public.country_parameters for update to authenticated
  using ((select private.current_advisor_id()) is not null)
  with check ((select private.current_advisor_id()) is not null);
