-- Pasos opcionales que el asesor omite en cada cliente (ADR 0029). Un paso omitido cuenta como hecho
-- en la ficha: un cliente sin deudas, sin seguros o sin metas puede terminar su etapa. Solo ordena la
-- ficha; el motor no lo lee, así que nada de esto cambia un resultado.

-- Los valores son los identificadores de paso de la app (`StageStepId`). Solo los opcionales: los
-- gastos, la tasa y la cuota de cada deuda, el control de calidad y la entrega no se omiten.
alter table public.case_settings
  add column skipped_steps text[] not null default '{}'
    check (skipped_steps <@ array['accounts', 'pockets', 'realityCheck', 'debts', 'assets',
      'insurance', 'goals', 'riskProfile']::text[]);

-- Solo el asesor escribe los supuestos (políticas de client_inputs); esto es criterio suyo.
grant insert (skipped_steps), update (skipped_steps) on public.case_settings to authenticated;
