-- Ajustes de la revisión del asesor (docs/12-plan-de-mejoras-del-asesor.md, pasos D1 y D2; ADR 0027
-- y 0028): la marca de cuotas atrasadas en cada deuda y los parámetros de Colombia que pide el
-- protocolo (tasa de usura de referencia, sección 8.3; topes para declarar renta, sección 8.9).

-- 1. Cuotas atrasadas o reportes negativos (protocolo, pregunta 15 y sección 8.3, paso 10) --------
-- No cambia el cálculo: el control de calidad pide al asesor explicar el acuerdo de pago. Lo marcan
-- el cliente y el asesor, como el resto de la deuda.

alter table public.debts
  add column in_arrears boolean not null default false;

grant insert (in_arrears), update (in_arrears) on public.debts to authenticated;

-- 2. Parámetros de Colombia, con fuente y fecha de consulta (docs/fuentes.md F75 a F77) ----------
-- La tasa de usura cambia cada mes: la de octubre de 2026 vence el 1 de noviembre. La app muestra la
-- más reciente con su mes, y deja de marcar deudas "cerca de la usura" cuando venció. El
-- procedimiento para cargar la del mes siguiente está en supabase/README.md.
-- Los topes para declarar renta son los del año gravable 2026 en pesos (1.400 y 4.500 UVT con la UVT
-- de 2026): se marcan caso por caso en el perfil, como el de España (03-modelo, principio 10).

insert into public.country_parameters
  (country_code, key, value, unit, valid_from, valid_to, source_name, source_url, consulted_at, notes)
values
  ('CO', 'debt.usury_rate', '0.2859', 'EA', '2026-10-01', '2026-11-01',
   'Superintendencia Financiera de Colombia, Resolución 1472 de 2026',
   'https://www.superfinanciera.gov.co/publicaciones/10116267/superfinanciera-certifica-el-interes-bancario-corriente/',
   '2026-10-09',
   'Tasa de usura de crédito de consumo y ordinario, del 1 al 31 de octubre de 2026 (1,5 veces el interés bancario corriente certificado de 19,06 % EA). Fuente F75.'),
  ('CO', 'tax.filing_gross_income', '73323600', 'COP', '2026-01-01', '2027-01-01',
   'Estatuto Tributario, art. 592 (Decreto 624 de 1989, compilación DIAN) y Resolución DIAN 000238 de 2025',
   'https://normograma.dian.gov.co/dian/compilacion/docs/estatuto_tributario.htm',
   '2026-10-09',
   'Ingresos brutos del año gravable 2026 desde los que una persona natural no responsable de IVA debe declarar renta: 1.400 UVT con la UVT de 2026 (52.374). Fuentes F76 y F77.'),
  ('CO', 'tax.filing_purchases', '73323600', 'COP', '2026-01-01', '2027-01-01',
   'Estatuto Tributario, art. 594-3 (Decreto 624 de 1989, compilación DIAN) y Resolución DIAN 000238 de 2025',
   'https://normograma.dian.gov.co/dian/compilacion/docs/estatuto_tributario.htm',
   '2026-10-09',
   'Total de compras y consumos del año gravable 2026 desde el que se debe declarar renta: 1.400 UVT con la UVT de 2026. El mismo tope aplica a los consumos con tarjeta de crédito y a las consignaciones, que la plataforma no registra. Fuentes F76 y F77.'),
  ('CO', 'tax.filing_gross_assets', '235683000', 'COP', '2026-01-01', '2027-01-01',
   'Estatuto Tributario, art. 592 (Decreto 624 de 1989, compilación DIAN) y Resolución DIAN 000238 de 2025',
   'https://normograma.dian.gov.co/dian/compilacion/docs/estatuto_tributario.htm',
   '2026-10-09',
   'Patrimonio bruto al 31 de diciembre de 2026 desde el que se debe declarar renta: 4.500 UVT con la UVT de 2026 (52.374). Fuentes F76 y F77.');
