-- Inversión, patrimonio, metas y seguros (F5). Matriz de permisos (docs/03-modelo-de-datos.md,
-- sección 5): metas, seguros, inversiones y respuestas del perfil de riesgo los editan cliente y
-- asesor; los ajustes de capacidad, la posición en el rango, los supuestos de la proyección, la
-- edad de retiro y los datos del seguro de vida son criterio del asesor.

-- 1. Parámetros de la metodología ----------------------------------------------------------------

-- Valores por defecto de la plantilla 2.2 y del protocolo (fuentes internas I1 e I2 de
-- docs/fuentes.md). El asesor puede fijar otro valor por cliente en `case_settings`.
insert into public.country_parameters
  (country_code, key, value, unit, valid_from, source_name, consulted_at, notes)
values
  (null, 'method.real_return_growth', '0.05', 'ratio', '2026-01-01',
   'Protocolo, sección 8.7; plantilla 2.2, Supuestos!C27', '2026-10-03',
   'Rendimiento real anual supuesto del tramo de crecimiento. Ilustrativo, no garantizado.'),
  (null, 'method.real_return_stability', '0.015', 'ratio', '2026-01-01',
   'Protocolo, sección 8.7; plantilla 2.2, Supuestos!C28', '2026-10-03',
   'Rendimiento real anual supuesto del tramo de estabilidad. Ilustrativo, no garantizado.'),
  (null, 'method.growth_glide_step', '0.02', 'ratio', '2026-01-01',
   'Protocolo, sección 8.7.2; plantilla 2.2, Supuestos!C30', '2026-10-03',
   'Puntos que baja cada año el % en crecimiento en los 10 años antes del retiro.'),
  (null, 'method.growth_floor', '0.1', 'ratio', '2026-01-01',
   'Protocolo, sección 8.7.2; plantilla 2.2, Supuestos!C31', '2026-10-03',
   'Piso del % en crecimiento.'),
  (null, 'method.growth_ranges',
   '[{"from_age": 0, "conservador": [0.4, 0.55], "moderado": [0.6, 0.75], "tolerante": [0.8, 0.9]},
     {"from_age": 35, "conservador": [0.3, 0.45], "moderado": [0.5, 0.65], "tolerante": [0.7, 0.8]},
     {"from_age": 50, "conservador": [0.2, 0.35], "moderado": [0.4, 0.55], "tolerante": [0.55, 0.7]},
     {"from_age": 60, "conservador": [0.1, 0.25], "moderado": [0.25, 0.4], "tolerante": [0.4, 0.55]}]',
   'ratio', '2026-01-01',
   'Protocolo, sección 8.7.2; plantilla 2.2, Inversión!B36:I39', '2026-10-03',
   'Rango orientativo en crecimiento por tramo de edad y perfil.'),
  (null, 'method.retirement_age_by_sex', '{"mujer": 57, "hombre": 62}', 'years', '2026-01-01',
   'Plantilla 2.2, Supuestos!C29', '2026-10-03',
   'Supuesto: edad de retiro esperada por defecto, la de la plantilla (sin sexo, 57). El asesor fija la de cada cliente; F6 la revisa con los parámetros de pensión de cada país (pregunta B16).');

-- 2. Supuestos del caso --------------------------------------------------------------------------

-- Vacías = el parámetro vigente de la metodología. El gasto a cubrir del seguro de vida va en la
-- moneda base; vacío es el gasto anual del presupuesto, y los años, 10 con personas a cargo (H-10).
alter table public.case_settings
  add column real_return_growth    numeric(6, 4) check (real_return_growth between -0.5 and 0.5),
  add column real_return_stability numeric(6, 4) check (real_return_stability between -0.5 and 0.5),
  add column retirement_age        smallint check (retirement_age between 30 and 100),
  add column growth_glide_step     numeric(5, 4) check (growth_glide_step between 0 and 1),
  add column growth_floor          numeric(5, 4) check (growth_floor between 0 and 1),
  add column life_support_years    numeric(4, 1) check (life_support_years between 0 and 60),
  add column life_annual_to_cover  numeric(18, 2) check (life_annual_to_cover >= 0),
  add column insurance_pocket_id   uuid,
  add foreign key (insurance_pocket_id, client_id) references public.pockets (id, client_id)
    on delete set null (insurance_pocket_id);
create index case_settings_insurance_pocket_id_idx on public.case_settings (insurance_pocket_id);

grant insert (real_return_growth, real_return_stability, retirement_age, growth_glide_step, growth_floor,
    life_support_years, life_annual_to_cover, insurance_pocket_id),
  update (real_return_growth, real_return_stability, retirement_age, growth_glide_step, growth_floor,
    life_support_years, life_annual_to_cover, insurance_pocket_id)
  on public.case_settings to authenticated;

-- 3. Metas y calculadora de viaje ----------------------------------------------------------------

-- Una meta con fecha o que se repite (RN-100). Con calculadora de viaje, el valor sale de sus
-- conceptos en otra moneda más los costos en moneda base (RN-101).
create table public.goals (
  id                     uuid primary key default gen_random_uuid(),
  client_id              uuid not null references public.clients (id) on delete cascade,
  name                   text not null check (btrim(name) <> '' and length(name) <= 80),
  pocket_id              uuid,
  currency               char(3) not null check (currency ~ '^[A-Z]{3}$'),
  amount                 numeric(18, 2) check (amount >= 0),
  already_saved          numeric(18, 2) not null default 0 check (already_saved >= 0),
  repeat_every_years     numeric(4, 1) check (repeat_every_years > 0 and repeat_every_years <= 50),
  target_date            date,
  uses_trip_calculator   boolean not null default false,
  trip_currency          char(3) check (trip_currency ~ '^[A-Z]{3}$'),
  trip_lodging_tax_rate  numeric(5, 4) not null default 0 check (trip_lodging_tax_rate between 0 and 1),
  trip_cushion_rate      numeric(5, 4) not null default 0.05 check (trip_cushion_rate between 0 and 1),
  trip_base_costs        numeric(18, 2) not null default 0 check (trip_base_costs >= 0),
  note                   text check (length(note) <= 500),
  sort_order             int not null default 0,
  updated_at             timestamptz not null default now(),
  updated_by             uuid,
  unique (id, client_id),
  constraint trip_needs_currency check (not uses_trip_calculator or trip_currency is not null),
  foreign key (pocket_id, client_id) references public.pockets (id, client_id) on delete set null (pocket_id)
);
create index goals_client_id_idx on public.goals (client_id);
create index goals_pocket_id_idx on public.goals (pocket_id);

create table public.goal_trip_items (
  id          uuid primary key default gen_random_uuid(),
  goal_id     uuid not null,
  client_id   uuid not null references public.clients (id) on delete cascade,
  concept     text not null check (btrim(concept) <> '' and length(concept) <= 80),
  unit_value  numeric(18, 2) not null check (unit_value >= 0),
  quantity    numeric(10, 2) not null default 1 check (quantity >= 0),
  is_lodging  boolean not null default false,
  sort_order  int not null default 0,
  updated_at  timestamptz not null default now(),
  updated_by  uuid,
  foreign key (goal_id, client_id) references public.goals (id, client_id) on delete cascade
);
create index goal_trip_items_client_id_idx on public.goal_trip_items (client_id);
create index goal_trip_items_goal_id_idx on public.goal_trip_items (goal_id, client_id);

-- 4. Seguros --------------------------------------------------------------------------------------

-- Solo primas cotizadas (RN-102). Sin números de póliza; los beneficiarios, en una nota.
create table public.insurances (
  id                    uuid primary key default gen_random_uuid(),
  client_id             uuid not null references public.clients (id) on delete cascade,
  insurance_type        text not null check (insurance_type in ('hogar', 'arrendamiento',
                          'enfermedades_graves', 'renta_hospitalizacion', 'vida', 'complementario',
                          'desempleo', 'vehiculo', 'otro')),
  custom_name           text check (length(custom_name) <= 80),
  status                text check (status in ('si', 'no', 'cotizando')),
  beneficiaries_note    text check (length(beneficiaries_note) <= 300),
  currency              char(3) not null check (currency ~ '^[A-Z]{3}$'),
  annual_premium_quoted numeric(18, 2) check (annual_premium_quoted >= 0),
  note                  text check (length(note) <= 500),
  sort_order            int not null default 0,
  updated_at            timestamptz not null default now(),
  updated_by            uuid,
  constraint other_needs_name check (insurance_type <> 'otro' or btrim(coalesce(custom_name, '')) <> '')
);
create index insurances_client_id_idx on public.insurances (client_id);
create unique index insurances_one_per_type on public.insurances (client_id, insurance_type)
  where insurance_type <> 'otro';

-- 5. Inversiones actuales -------------------------------------------------------------------------

-- La plataforma o el tipo, sin número de cuenta (regla 9 de CLAUDE.md). Sin tramo cuenta en el
-- total, no en crecimiento ni en estabilidad.
create table public.investments (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients (id) on delete cascade,
  name        text not null check (btrim(name) <> '' and length(name) <= 80),
  bucket      text check (bucket in ('crecimiento', 'estabilidad')),
  currency    char(3) not null check (currency ~ '^[A-Z]{3}$'),
  balance     numeric(18, 2) not null check (balance >= 0),
  note        text check (length(note) <= 500),
  sort_order  int not null default 0,
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);
create index investments_client_id_idx on public.investments (client_id);

-- 6. Perfil de riesgo -----------------------------------------------------------------------------

-- Respuestas del cliente (RN-112) y criterio del asesor: las dos condiciones de capacidad que la
-- plantilla deja cambiar (vacías = la sugerencia) y la posición en el rango (RN-114).
create table public.risk_profile (
  client_id                 uuid primary key references public.clients (id) on delete cascade,
  drop_reaction             text check (drop_reaction in ('venderia', 'esperaria', 'invertiria_mas')),
  experience                text check (experience in ('ninguna', 'algo', 'bastante')),
  horizon                   text check (horizon in ('menos_3', 'de_3_a_7', 'mas_7')),
  variable_income_override  boolean,
  dependents_override       boolean,
  range_position            numeric(5, 4) not null default 0.5 check (range_position between 0 and 1),
  updated_at                timestamptz not null default now(),
  updated_by                uuid
);

-- Guarda propia porque `range_position` tiene valor por defecto: el cliente responde sin tocarla.
create function private.guard_risk_profile_advisor_columns()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null or private.is_advisor_of(new.client_id) then
    return new;
  end if;
  if (tg_op = 'INSERT' and (new.variable_income_override is not null or new.dependents_override is not null
                            or new.range_position <> 0.5))
     or (tg_op = 'UPDATE' and (new.variable_income_override is distinct from old.variable_income_override
                               or new.dependents_override is distinct from old.dependents_override
                               or new.range_position is distinct from old.range_position)) then
    raise exception 'Los ajustes de capacidad y la posición en el rango los fija el asesor'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- 7. Monedas en uso -------------------------------------------------------------------------------

-- La tasa de una moneda en uso no se borra (RN-017): ahora también metas, seguros e inversiones.
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
       or exists (select 1 from public.investments v where v.client_id = old.client_id and v.currency = old.currency) then
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

create trigger goals_currency before insert or update of currency, trip_currency on public.goals
  for each row execute function private.check_currency('currency', 'trip_currency');
create trigger goals_stamp before insert or update on public.goals
  for each row execute function private.stamp_update();
create trigger goals_audit after insert or update or delete on public.goals
  for each row execute function private.audit_row('client_id', 'updated_by');

create trigger goal_trip_items_stamp before insert or update on public.goal_trip_items
  for each row execute function private.stamp_update();
create trigger goal_trip_items_audit after insert or update or delete on public.goal_trip_items
  for each row execute function private.audit_row('client_id', 'updated_by');

create trigger insurances_currency before insert or update of currency on public.insurances
  for each row execute function private.check_currency('currency');
create trigger insurances_stamp before insert or update on public.insurances
  for each row execute function private.stamp_update();
create trigger insurances_audit after insert or update or delete on public.insurances
  for each row execute function private.audit_row('client_id', 'updated_by');

create trigger investments_currency before insert or update of currency on public.investments
  for each row execute function private.check_currency('currency');
create trigger investments_stamp before insert or update on public.investments
  for each row execute function private.stamp_update();
create trigger investments_audit after insert or update or delete on public.investments
  for each row execute function private.audit_row('client_id', 'updated_by');

create trigger risk_profile_guard_advisor_columns before insert or update on public.risk_profile
  for each row execute function private.guard_risk_profile_advisor_columns();
create trigger risk_profile_stamp before insert or update on public.risk_profile
  for each row execute function private.stamp_update();
create trigger risk_profile_audit after insert or update or delete on public.risk_profile
  for each row execute function private.audit_row('client_id', 'updated_by');

-- 9. RLS, políticas y privilegios (matriz de la sección 5) ----------------------------------------

alter table public.goals enable row level security;
alter table public.goal_trip_items enable row level security;
alter table public.insurances enable row level security;
alter table public.investments enable row level security;
alter table public.risk_profile enable row level security;

revoke all on public.goals, public.goal_trip_items, public.insurances, public.investments,
  public.risk_profile from anon, authenticated;

grant select, insert (client_id, name, pocket_id, currency, amount, already_saved, repeat_every_years,
    target_date, uses_trip_calculator, trip_currency, trip_lodging_tax_rate, trip_cushion_rate,
    trip_base_costs, note, sort_order),
  update (name, pocket_id, currency, amount, already_saved, repeat_every_years, target_date,
    uses_trip_calculator, trip_currency, trip_lodging_tax_rate, trip_cushion_rate, trip_base_costs, note,
    sort_order),
  delete on public.goals to authenticated;
create policy goals_select on public.goals for select to authenticated
  using (private.can_access(client_id));
create policy goals_insert on public.goals for insert to authenticated
  with check (private.can_access(client_id));
create policy goals_update on public.goals for update to authenticated
  using (private.can_access(client_id)) with check (private.can_access(client_id));
create policy goals_delete on public.goals for delete to authenticated
  using (private.can_access(client_id));

grant select, insert (goal_id, client_id, concept, unit_value, quantity, is_lodging, sort_order),
  update (concept, unit_value, quantity, is_lodging, sort_order), delete
  on public.goal_trip_items to authenticated;
create policy goal_trip_items_select on public.goal_trip_items for select to authenticated
  using (private.can_access(client_id));
create policy goal_trip_items_insert on public.goal_trip_items for insert to authenticated
  with check (private.can_access(client_id));
create policy goal_trip_items_update on public.goal_trip_items for update to authenticated
  using (private.can_access(client_id)) with check (private.can_access(client_id));
create policy goal_trip_items_delete on public.goal_trip_items for delete to authenticated
  using (private.can_access(client_id));

grant select, insert (client_id, insurance_type, custom_name, status, beneficiaries_note, currency,
    annual_premium_quoted, note, sort_order),
  update (insurance_type, custom_name, status, beneficiaries_note, currency, annual_premium_quoted, note,
    sort_order),
  delete on public.insurances to authenticated;
create policy insurances_select on public.insurances for select to authenticated
  using (private.can_access(client_id));
create policy insurances_insert on public.insurances for insert to authenticated
  with check (private.can_access(client_id));
create policy insurances_update on public.insurances for update to authenticated
  using (private.can_access(client_id)) with check (private.can_access(client_id));
create policy insurances_delete on public.insurances for delete to authenticated
  using (private.can_access(client_id));

grant select, insert (client_id, name, bucket, currency, balance, note, sort_order),
  update (name, bucket, currency, balance, note, sort_order), delete on public.investments to authenticated;
create policy investments_select on public.investments for select to authenticated
  using (private.can_access(client_id));
create policy investments_insert on public.investments for insert to authenticated
  with check (private.can_access(client_id));
create policy investments_update on public.investments for update to authenticated
  using (private.can_access(client_id)) with check (private.can_access(client_id));
create policy investments_delete on public.investments for delete to authenticated
  using (private.can_access(client_id));

grant select, insert (client_id, drop_reaction, experience, horizon, variable_income_override,
    dependents_override, range_position),
  update (drop_reaction, experience, horizon, variable_income_override, dependents_override, range_position),
  delete on public.risk_profile to authenticated;
create policy risk_profile_select on public.risk_profile for select to authenticated
  using (private.can_access(client_id));
create policy risk_profile_insert on public.risk_profile for insert to authenticated
  with check (private.can_access(client_id));
create policy risk_profile_update on public.risk_profile for update to authenticated
  using (private.can_access(client_id)) with check (private.can_access(client_id));
create policy risk_profile_delete on public.risk_profile for delete to authenticated
  using (private.can_access(client_id));
