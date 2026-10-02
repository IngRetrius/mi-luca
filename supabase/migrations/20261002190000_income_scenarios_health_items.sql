-- Decisiones de ADR 0011 que tocan la base:
-- 1. H-07: un ingreso puede marcarse como estable (`ninguno`): no se pierde en ningún escenario
--    del fondo de emergencia (por ejemplo, el aporte fijo de un familiar o un arriendo seguro).
-- 2. C20: los gastos con datos de salud se marcan (`is_health`). Si el cliente retira su
--    consentimiento de datos de salud (o lo negó), esos gastos conservan el importe, que el plan
--    necesita, pero pierden el detalle sensible: categoría "Salud y bienestar", concepto "Salud" y
--    sin nota. La base lo hace al retirar, también en el historial, y en todo gasto de salud que se
--    registre después (RGPD, arts. 7.3, 9 y 17.1.b; Ley 1581, art. 8 e).

-- 1. Ingreso estable -------------------------------------------------------------------------------

alter table public.incomes drop constraint incomes_lost_in_scenario_check;
alter table public.incomes add constraint incomes_lost_in_scenario_check
  check (lost_in_scenario in ('a', 'b', 'c', 'ninguno'));

-- 2. Gastos con datos de salud ---------------------------------------------------------------------

alter table public.budget_items add column is_health boolean not null default false;
grant insert (is_health), update (is_health) on public.budget_items to authenticated;

-- ¿El cliente retiró o negó su consentimiento de datos de salud? Cuenta el último registrado. Un
-- perfil sin consentimientos (borrador del asesor, antes de la invitación) no se toca.
create function private.health_consent_refused(p_client uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((
    select not (c.granted and c.withdrawn_at is null)
    from public.consents c
    join public.legal_texts t on t.id = c.legal_text_id
    where c.client_id = p_client and t.kind = 'datos_sensibles'
    order by c.recorded_at desc
    limit 1
  ), false);
$$;

-- Un gasto de salud sin consentimiento vigente se guarda sin detalle.
create function private.anonymize_health_item()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.is_health and private.health_consent_refused(new.client_id) then
    new.category := 'Salud y bienestar';
    new.concept := 'Salud';
    new.note := null;
  end if;
  return new;
end;
$$;

create trigger budget_items_anonymize_health before insert or update on public.budget_items
  for each row execute function private.anonymize_health_item();

-- Al retirar el consentimiento: anonimiza los gastos de salud del cliente y quita el detalle que
-- quedó en el historial (los valores anteriores y nuevos de esas filas).
create function private.erase_health_details()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.withdrawn_at is null or old.withdrawn_at is not null then
    return null;
  end if;
  if (select t.kind from public.legal_texts t where t.id = new.legal_text_id) <> 'datos_sensibles' then
    return null;
  end if;
  -- El disparador anterior pone el texto genérico (el consentimiento ya figura como retirado).
  update public.budget_items b set note = null
  where b.client_id = new.client_id and b.is_health;
  update public.audit_log l
  set old_values = l.old_values - 'category' - 'concept' - 'note',
      new_values = l.new_values - 'category' - 'concept' - 'note'
  where l.client_id = new.client_id
    and l.table_name = 'budget_items'
    and l.row_pk ->> 'id' in (
      select b.id::text from public.budget_items b where b.client_id = new.client_id and b.is_health
    );
  return null;
end;
$$;

create trigger consents_erase_health_details after update of withdrawn_at on public.consents
  for each row execute function private.erase_health_details();
