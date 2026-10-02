-- Umbrales fiscales que aplican a cada cliente (RN-031). Es criterio del asesor y se marca caso por
-- caso: el país solo publica el valor (`country_parameters`), no decide a quién aplica (03-modelo,
-- principio 10). Cada elemento es la clave de un parámetro, por ejemplo 'tax.dependent_income_limit'.

alter table public.case_settings
  add column fiscal_threshold_keys text[] not null default '{}'
    check (array_position(fiscal_threshold_keys, null) is null
           and cardinality(fiscal_threshold_keys) <= 10);

grant insert (fiscal_threshold_keys), update (fiscal_threshold_keys) on public.case_settings to authenticated;
