-- Asesoría en tres etapas (ADR 0025): qué etapas tiene activas cada cliente y de qué etapa es cada
-- plan entregado. Las etapas ordenan la ficha, Mis datos y la entrega; el motor calcula siempre con
-- todo lo registrado, así que nada de esto cambia un resultado.

-- 1. Etapas activas -------------------------------------------------------------------------------

-- El núcleo (perfil, ingresos, monedas y supuestos) no es una etapa: siempre está. Sin fila de
-- supuestos, la app usa el valor por defecto, como con las demás columnas.
alter table public.case_settings
  add column active_stages text[] not null default '{presupuesto}'
    check (active_stages <@ array['presupuesto', 'deudas', 'patrimonio']::text[]);

-- Los clientes que ya existen se atendían con el plan completo: quedan con las tres etapas. Una fila
-- con las demás columnas vacías da la misma entrada al motor que no tener fila.
update public.case_settings set active_stages = '{presupuesto,deudas,patrimonio}';
insert into public.case_settings (client_id, active_stages)
select c.id, '{presupuesto,deudas,patrimonio}'
from public.clients c
where not exists (select 1 from public.case_settings s where s.client_id = c.id);

-- Solo el asesor escribe los supuestos (políticas de client_inputs); esto es criterio suyo.
grant insert (active_stages), update (active_stages) on public.case_settings to authenticated;

-- 2. Etapa de cada plan entregado -----------------------------------------------------------------

-- Las entregas anteriores eran del plan completo.
alter table public.plan_deliveries
  add column stage text not null default 'completo'
    check (stage in ('presupuesto', 'deudas', 'patrimonio', 'completo'));

grant insert (stage) on public.plan_deliveries to authenticated;

-- El sello cubre también la etapa, que decide qué secciones ve el cliente. Las entregas anteriores
-- conservan el sello con que se guardaron.
create or replace function private.seal_plan_delivery()
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
    sha256(convert_to(new.inputs::text || new.labels::text || new.results::text || new.documents::text
      || new.stage, 'UTF8')),
    'hex'
  );
  return new;
end;
$$;
