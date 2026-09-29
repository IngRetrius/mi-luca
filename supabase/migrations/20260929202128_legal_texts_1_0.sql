-- Textos legales aprobados por el responsable del tratamiento (decisión A7), generados por
-- tools/legal-texts/build_migration.py desde docs/legal/textos/ (datos-sensibles-co.md, datos-sensibles-es.md, tratamiento-datos-co.md, tratamiento-datos-es.md).
-- Un texto publicado no se cambia: una corrección es una versión nueva.

insert into public.legal_texts (kind, country_code, version, title, body_markdown) values
  ('datos_sensibles', 'CO', $texto$1.0$texto$, $texto$Datos de salud$texto$,
   $texto$Mi presupuesto puede incluir gastos de salud, como terapias, medicamentos o seguros médicos. Son datos sensibles.

Al marcar esta casilla, autorizo que se usen solo para calcular mi plan. Es opcional: si no lo autorizo, puedo registrar esos gastos con un nombre genérico, como "Salud".

Puedo retirar esta autorización cuando quiera desde "Privacidad y datos" en la app.$texto$),
  ('datos_sensibles', 'ES', $texto$1.0$texto$, $texto$Datos de salud$texto$,
   $texto$Mi presupuesto puede incluir gastos de salud, como terapias, medicamentos o seguros médicos. Son datos de categoría especial.

Al marcar esta casilla, doy mi consentimiento para que se usen solo para calcular mi plan. Es voluntario: si no lo doy, puedo registrar esos gastos con un nombre genérico, como "Salud".

Puedo retirarlo cuando quiera desde "Privacidad y datos" en la app.$texto$),
  ('tratamiento_datos', 'CO', $texto$1.0$texto$, $texto$Aviso de privacidad$texto$,
   $texto$Al marcar la casilla, autorizo a Juan Camilo Perea Possos, responsable de MiLuca, a usar mis datos personales para prestarme el servicio de planificación financiera: calcular mi plan y permitir que el asesor que me invitó lo prepare y le haga seguimiento.

Qué datos se usan:
- Nombre, correo, fecha de nacimiento y país.
- Mis datos financieros: ingresos, gastos, ahorros, deudas, metas, patrimonio, seguros y pensión.

MiLuca nunca pide números de cuenta, de tarjeta ni de documento, ni contraseñas de bancos. No vende mis datos ni los usa para publicidad. Se guardan en servidores de Supabase y Vercel en Estados Unidos.

Puedo consultar, corregir o pedir que se borren mis datos, y retirar esta autorización, escribiendo a retrius2001@gmail.com. Desde la app puedo quitarle el acceso a mi asesor cuando quiera. También puedo acudir a la Superintendencia de Industria y Comercio.$texto$),
  ('tratamiento_datos', 'ES', $texto$1.0$texto$, $texto$Aviso de privacidad$texto$,
   $texto$Al marcar la casilla, acepto que Juan Camilo Perea Possos, responsable de MiLuca, use mis datos personales para prestarme el servicio de planificación financiera que pido: calcular mi plan y permitir que el asesor que me invitó lo prepare y le haga seguimiento.

Qué datos se usan:
- Nombre, correo, fecha de nacimiento y país.
- Mis datos financieros: ingresos, gastos, ahorros, deudas, metas, patrimonio, seguros y pensión.

MiLuca nunca pide números de cuenta, de tarjeta ni de documento, ni contraseñas de bancos. No vende mis datos ni los usa para publicidad. Se guardan en servidores de Supabase y Vercel en Estados Unidos, con las cláusulas contractuales tipo de la Comisión Europea.

Los datos se conservan mientras tenga mi cuenta. Puedo pedir acceso a ellos, corregirlos, llevármelos o que se borren escribiendo a retrius2001@gmail.com. Desde la app puedo quitarle el acceso a mi asesor cuando quiera. También puedo reclamar ante la Agencia Española de Protección de Datos.$texto$);
