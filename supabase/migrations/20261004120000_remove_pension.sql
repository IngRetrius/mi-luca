-- La pensión queda fuera de la plataforma (ADR 0016): sin análisis por cliente ni módulo por país.
-- Ninguna función, política ni disparador usa estas columnas; sus privilegios se van con ellas.
-- El historial (`audit_log`) conserva los valores anteriores tal como se registraron.

alter table public.case_settings drop column pension_enabled;
alter table public.countries drop column pension_module;
