-- Meses de fondo de emergencia sugeridos por tipo de cliente (RN-004), parámetro común de la
-- metodología. Fuente interna: plantilla 2.2, hoja Listas (H2:I7), y protocolo, sección 4 (I1, I2
-- de docs/fuentes.md). El asesor puede fijar otro valor por cliente cuando llegue el fondo (F3).

insert into public.country_parameters
  (country_code, key, value, unit, valid_from, source_name, consulted_at, notes)
values
  (null, 'method.emergency_months_by_client_type',
   '{"empleado": 3, "contratista": 4, "independiente_variable": 6, "pensionado": 3, "rentista": 4, "mixto": 4}',
   'months', '2026-01-01',
   'Plantilla de asesoría financiera 2.2, hoja Listas (H2:I7); protocolo, sección 4', '2026-10-02',
   'Meses de lo esencial. Fuentes internas I1 e I2.');
