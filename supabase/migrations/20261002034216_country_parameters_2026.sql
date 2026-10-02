-- Primeros parámetros por país, con fuente y fecha de consulta (docs/fuentes.md). Solo los que ya
-- se verificaron en la fuente oficial; los de la metodología (porcentajes, umbrales del semáforo)
-- llegan con los módulos que los usan. Una versión nueva cierra la anterior con `valid_to`.
--
-- Qué parámetros aplican a cada cliente se decide por cliente, no por su país (03-modelo,
-- principio 10): por ejemplo, el límite de rentas del descendiente solo aplica si el asesor lo
-- marca para ese caso.

insert into public.country_parameters
  (country_code, key, value, unit, valid_from, source_name, source_url, consulted_at, notes)
values
  ('ES', 'tax.dependent_income_limit', '8000', 'EUR', '2015-01-01',
   'Ley 35/2006 del IRPF, art. 58.1 (redacción de la Ley 26/2014), BOE',
   'https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764#a58', '2026-10-01',
   'Rentas anuales del descendiente, excluidas las exentas, para el mínimo por descendientes: menor de 25 años o con discapacidad y que conviva con el contribuyente. Fuente F30.'),
  ('CO', 'minimum_wage', '1750905', 'COP', '2026-01-01',
   'Decreto 1469 de 2025, art. 1 (Diario Oficial 53.350)',
   'https://normativa.colpensiones.gov.co/colpensiones/compilacion/docs/decreto_1469_2025.htm', '2026-10-01',
   'Salario mínimo legal mensual 2026. Suspendido y restablecido por el Consejo de Estado en 2026 sin cambio de valor; nulidad en trámite. Fuente F45.');
