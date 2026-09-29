-- El cliente retira desde P-C11 su consentimiento para datos sensibles (salud). El RGPD pide que
-- retirarlo sea tan fácil como darlo (art. 7.3) y la Ley 1581 permite revocar la autorización
-- (art. 8 e). Solo el dueño del perfil, solo una vez y solo ese tipo de texto: el tratamiento de
-- datos general no se retira así, porque sin él no hay servicio; eso es pedir el borrado (F7).

create function private.guard_consent_withdrawal()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.withdrawn_at is distinct from old.withdrawn_at then
    if old.withdrawn_at is not null then
      raise exception 'Este consentimiento ya se retiró' using errcode = '55000';
    end if;
    if not old.granted then
      raise exception 'Solo se retira un consentimiento que se dio' using errcode = '55000';
    end if;
    if (select t.kind from public.legal_texts t where t.id = old.legal_text_id) <> 'datos_sensibles' then
      raise exception 'El tratamiento de datos se retira pidiendo el borrado de la cuenta'
        using errcode = '42501';
    end if;
    -- La fecha la pone la base, no quien actualiza.
    new.withdrawn_at := now();
  end if;
  return new;
end;
$$;

create trigger consents_guard_withdrawal before update on public.consents
  for each row execute function private.guard_consent_withdrawal();

grant update (withdrawn_at) on public.consents to authenticated;
create policy consents_update on public.consents for update to authenticated
  using (private.is_client_owner(client_id))
  with check (private.is_client_owner(client_id));
