-- Textos legales de prueba, solo para la base local (`supabase db reset`). No son textos legales:
-- los definitivos los aprueba el responsable del tratamiento (docs/legal/README.md) y llegan en una
-- migración.
-- La versión 0.x y el título lo dicen, para que nunca se confundan con los reales.

insert into public.legal_texts (kind, country_code, version, title, body_markdown) values
  ('tratamiento_datos', 'CO', '0.1-prueba', 'Tratamiento de datos (texto de prueba)',
   E'Texto de prueba para desarrollo local. No es la autorización de tratamiento de datos.\n\n'
   'El texto definitivo para Colombia sale de la Ley 1581 de 2012.'),
  ('datos_sensibles', 'CO', '0.1-prueba', 'Datos de salud (texto de prueba)',
   E'Texto de prueba para desarrollo local. No es la autorización para datos sensibles.\n\n'
   'Aceptarlo es facultativo.'),
  ('tratamiento_datos', 'ES', '0.1-prueba', 'Protección de datos (texto de prueba)',
   E'Texto de prueba para desarrollo local. No es la información del artículo 13 del RGPD.\n\n'
   'El texto definitivo para España sale del RGPD.'),
  ('datos_sensibles', 'ES', '0.1-prueba', 'Datos de salud (texto de prueba)',
   E'Texto de prueba para desarrollo local. No es el consentimiento explícito para datos de salud.\n\n'
   'Aceptarlo es facultativo.')
on conflict do nothing;
