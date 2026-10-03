-- Seguimiento de créditos cuota a cuota (F4): los datos de la hoja "Crédito" de la plantilla de
-- créditos y las marcas de pago del cliente (RN-095, RN-096, RN-099). Con `first_installment_date`
-- la deuda está en seguimiento: su saldo y su cuota del diagnóstico salen de la tabla del crédito.

-- 1. Datos del crédito ----------------------------------------------------------------------------

-- En seguimiento, `balance` es el saldo al inicio de la tabla, `min_payment` la cuota del banco con
-- seguros (0 = calcularla con el plazo) y `annual_rate` la tasa efectiva anual.
alter table public.debts
  add column first_installment_date   date,
  add column first_installment_number int not null default 1 check (first_installment_number between 1 and 600),
  add column total_installments       int check (total_installments between 1 and 600),
  add column insurance_in_payment     numeric(18, 2) not null default 0 check (insurance_in_payment >= 0),
  add column original_amount          numeric(18, 2) check (original_amount > 0),
  add column extra_from_installment   int check (extra_from_installment between 1 and 600),
  add column frech_points             numeric(6, 4) check (frech_points > 0 and frech_points <= 1),
  add column frech_until_installment  int check (frech_until_installment between 1 and 600),
  add constraint frech_needs_until check ((frech_points is null) = (frech_until_installment is null)),
  add constraint extra_installment_needs_extra check (accepts_extra or extra_from_installment is null),
  add constraint installments_from_first check (
    total_installments is null or total_installments >= first_installment_number);

-- Llave compuesta para que una marca no apunte a la deuda de otro cliente.
alter table public.debts add constraint debts_id_client_id_key unique (id, client_id);

grant insert (first_installment_date, first_installment_number, total_installments, insurance_in_payment,
    original_amount, extra_from_installment, frech_points, frech_until_installment),
  update (first_installment_date, first_installment_number, total_installments, insurance_in_payment,
    original_amount, extra_from_installment, frech_points, frech_until_installment)
  on public.debts to authenticated;

-- 2. Marcas de pago -------------------------------------------------------------------------------

-- Lo que el cliente marca en cada cuota: pagada (con la fecha real), cuota distinta ese mes y
-- abono extra. Importes en la moneda de la deuda.
create table public.debt_installments (
  debt_id            uuid not null,
  client_id          uuid not null references public.clients (id) on delete cascade,
  installment_number int not null check (installment_number between 1 and 1000),
  paid               boolean not null default false,
  paid_on            date,
  custom_payment     numeric(18, 2) check (custom_payment > 0),
  extra_payment      numeric(18, 2) check (extra_payment > 0),
  updated_at         timestamptz not null default now(),
  updated_by         uuid,
  primary key (debt_id, installment_number),
  foreign key (debt_id, client_id) references public.debts (id, client_id) on delete cascade,
  constraint paid_on_needs_paid check (paid or paid_on is null)
);
create index debt_installments_debt_id_client_id_idx on public.debt_installments (debt_id, client_id);
create index debt_installments_client_id_idx on public.debt_installments (client_id);

create trigger debt_installments_stamp before insert or update on public.debt_installments
  for each row execute function private.stamp_update();
create trigger debt_installments_audit after insert or update or delete on public.debt_installments
  for each row execute function private.audit_row('client_id', 'updated_by');

alter table public.debt_installments enable row level security;

revoke all on public.debt_installments from anon, authenticated;

grant select, insert (debt_id, client_id, installment_number, paid, paid_on, custom_payment, extra_payment),
  update (paid, paid_on, custom_payment, extra_payment),
  delete on public.debt_installments to authenticated;
create policy debt_installments_select on public.debt_installments for select to authenticated
  using (private.can_access(client_id));
create policy debt_installments_insert on public.debt_installments for insert to authenticated
  with check (private.can_access(client_id));
create policy debt_installments_update on public.debt_installments for update to authenticated
  using (private.can_access(client_id)) with check (private.can_access(client_id));
create policy debt_installments_delete on public.debt_installments for delete to authenticated
  using (private.can_access(client_id));
