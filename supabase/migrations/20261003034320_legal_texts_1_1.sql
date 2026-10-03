-- Textos legales aprobados por el responsable del tratamiento (decisión A7), generados por
-- tools/legal-texts/build_migration.py desde docs/legal/textos/ (tratamiento-datos-co.md, tratamiento-datos-es.md).
-- Un texto publicado no se cambia: una corrección es una versión nueva.

insert into public.legal_texts (kind, country_code, version, title, body_markdown) values
  ('tratamiento_datos', 'CO', $texto$1.1$texto$, $texto$Aviso de privacidad$texto$,
   $texto$Al marcar la casilla, autorizo a Juan Camilo Perea Possos, responsable de MiLuca, a usar mis datos personales para prestarme el servicio de planificación financiera: calcular mi plan y permitir que el asesor que me invitó lo prepare y le haga seguimiento.

Qué datos se usan:
- Nombre, correo, fecha de nacimiento y país.
- Mis datos financieros: ingresos, gastos, ahorros, deudas, metas, patrimonio, seguros y pensión.

MiLuca nunca pide números de cuenta, de tarjeta ni de documento, ni contraseñas de bancos. No vende mis datos ni los usa para publicidad. Se guardan en servidores de Supabase y Vercel en Estados Unidos. Para registrar mis gastos, mi asesor puede usar Claude, de Anthropic, en Estados Unidos: lee sus notas solo para proponer qué anotar, no las usa para entrenar sus modelos y las borra en 30 días.

Puedo consultar, corregir o pedir que se borren mis datos, y retirar esta autorización, escribiendo a retrius2001@gmail.com. Desde la app puedo quitarle el acceso a mi asesor cuando quiera. También puedo acudir a la Superintendencia de Industria y Comercio.$texto$),
  ('tratamiento_datos', 'ES', $texto$1.1$texto$, $texto$Aviso de privacidad$texto$,
   $texto$Al marcar la casilla, acepto que Juan Camilo Perea Possos, responsable de MiLuca, use mis datos personales para prestarme el servicio de planificación financiera que pido: calcular mi plan y permitir que el asesor que me invitó lo prepare y le haga seguimiento.

Qué datos se usan:
- Nombre, correo, fecha de nacimiento y país.
- Mis datos financieros: ingresos, gastos, ahorros, deudas, metas, patrimonio, seguros y pensión.

MiLuca nunca pide números de cuenta, de tarjeta ni de documento, ni contraseñas de bancos. No vende mis datos ni los usa para publicidad. Se guardan en servidores de Supabase y Vercel en Estados Unidos, con las cláusulas contractuales tipo de la Comisión Europea. Para registrar mis gastos, mi asesor puede usar Claude, de Anthropic, en Estados Unidos, también con las cláusulas contractuales tipo: lee sus notas solo para proponer qué anotar, no las usa para entrenar sus modelos y las borra en 30 días.

Los datos se conservan mientras tenga mi cuenta. Puedo pedir acceso a ellos, corregirlos, llevármelos o que se borren escribiendo a retrius2001@gmail.com. Desde la app puedo quitarle el acceso a mi asesor cuando quiera. También puedo reclamar ante la Agencia Española de Protección de Datos.$texto$);
