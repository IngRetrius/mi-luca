# 0009. Inicio de sesión con Google y con correo y contraseña; Apple aplazado

- Estado: Aceptada (decisión del asesor; cambia la regla "solo Google y Apple" del encargo)
- Fecha: 2026-09-28

## Contexto

El encargo pedía entrar solo con Google y Apple, sin contraseñas. Sign in with Apple exige la membresía de Apple Developer (99 USD al año) [F3], un Services ID, una clave `.p8` y regenerar el secreto cada 6 meses [F2]. El asesor decidió aplazar Apple y ofrecer, además de Google, un formulario normal de correo y contraseña.

Restricciones que siguen vigentes:

- La app instalada en iOS no comparte sesión con Safari [F4]: cualquier inicio de sesión debe poder completarse dentro de la app.
- El acceso es solo por invitación y la invitación se vincula por token (ADR 0005).
- No hay segundo factor por ahora (`02-arquitectura.md`, sección 5.5).
- El correo incluido de Supabase no llega a direcciones fuera del equipo [F14].

## Decisión

Dos métodos: Google (OAuth con PKCE) y correo con contraseña de Supabase Auth. Apple queda aplazado, no descartado: se puede agregar sin cambiar el modelo, porque la invitación no depende del correo.

Reglas del método de correo:

1. **Alta solo desde una invitación.** Quien abre una invitación vigente y acepta el consentimiento puede crear su contraseña. El servidor verifica el token y crea la cuenta con la API de administración (`auth.admin.createUser` con `email_confirm: true`), que usa la clave secreta y solo corre en el servidor. El correo es el de la invitación y no se cambia en ese paso: el token llegó a ese buzón, así que ya prueba que el cliente lo controla y no hace falta otro correo de confirmación. Luego se inicia la sesión y se ejecuta `accept_invitation(token)`.
2. **Registro público por correo cerrado.** Nadie crea una cuenta con correo sin pasar por el paso 1. El gancho "antes de crear usuario" (función de Postgres) rechaza toda alta con `app_metadata.provider = 'email'` [F24]; las altas con Google siguen pasando. Verificado el 28/09/2026 con Supabase local (Auth v2.197.0):
   - `[auth.email] enable_signup = false` **no sirve**: apaga el proveedor de correo entero, también el inicio de sesión y la recuperación.
   - Con el gancho, un registro público se rechaza con 403 aunque envíe una marca de invitación en sus metadatos, porque el usuario no puede escribir `app_metadata`.
   - Las altas de la API de administración no pasan por el gancho, así que el paso 1 funciona sin excepciones.
   - Inicio de sesión con contraseña y solicitud de recuperación responden bien.

   El gancho y su migración se crean en F1. Hasta entonces, un registro ajeno en el proyecto remoto quedaría sin confirmar y no podría entrar: el proyecto exige confirmar el correo (visto en su configuración el 28/09/2026) y el correo incluido solo llega al equipo [F14]. Tampoco hay datos que ver.
3. **Recuperación con un código de 6 dígitos, no con un enlace.** El correo de recuperación lleva `{{ .Token }}` y el cliente escribe el código dentro de la app [F35]. Un enlace se abriría en Safari y no en la app instalada [F4], y algunos filtros de correo consumen los enlaces al revisarlos [F35].
4. **Política de contraseña.** Sin reglas de composición y con rechazo de contraseñas filtradas (HaveIBeenPwned, incluido en Supabase Pro) [F34][F36]. Máximo de al menos 64 caracteres; se permite pegar y usar gestores de contraseñas [F36]. Longitud mínima: 8 caracteres, por decisión del asesor al resolver la pregunta E5 el 28/09/2026. El NIST pide 15 cuando la contraseña es el único factor [F36]; el rechazo de contraseñas filtradas y los límites de intentos compensan en parte.
5. **La contraseña no pasa por tablas ni registros de MiLuca.** Supabase Auth guarda solo un hash bcrypt con sal [F34]. El servidor recibe la contraseña en el formulario de alta y la entrega a Supabase sin guardarla ni escribirla en registros. La regla de privacidad de `CLAUDE.md` (no guardar contraseñas del cliente) se mantiene: MiLuca no tiene columnas para contraseñas.
6. **El asesor entra con Google** mientras no haya segundo factor, con la verificación en dos pasos activa en su cuenta de Google, porque su cuenta ve los datos de todos los clientes.

## Consecuencias

- Se ahorran 99 USD al año y la tarea de regenerar el secreto de Apple cada 6 meses.
- Un cliente sin cuenta de Google puede entrar sin crearla.
- El correo con contraseña funciona dentro de la app instalada sin redirecciones. La prueba de sesión en iOS (`02-arquitectura.md`, 5.4) sigue siendo necesaria para Google, pero ya no bloquea a todos los clientes.
- MiLuca pasa a tener contraseñas que proteger: límites de intentos por IP de Supabase Auth, rechazo de filtradas (requiere Pro, que ya se contrata antes del primer dato real) y CAPTCHA (Turnstile, compatible con Supabase) si aparecen abusos.
- El SMTP propio (Resend) es indispensable desde F1 también para la recuperación.
- La clave secreta de Supabase se usa en el servidor: variable `SUPABASE_SECRET_KEY`, sin prefijo `NEXT_PUBLIC_`, en un módulo con `import 'server-only'`.
- Estimación: sale la configuración de Apple de F0 y F1 y entran el alta con contraseña y la recuperación con código. Se compensa; las horas del plan no cambian.

## Alternativas consideradas

- **Código o enlace por correo en cada inicio de sesión, sin contraseña:** evita guardar contraseñas, pero obliga a abrir el correo cada vez, y el enlace se abre en Safari y no en la app instalada [F4].
- **`inviteUserByEmail` de Supabase:** crea la cuenta al invitar, antes de que el cliente acepte el tratamiento de datos, y su enlace inicia sesión en el navegador donde se abre.
- **Mantener Apple:** costo y mantenimiento sin una necesidad confirmada. Se reevalúa si algún cliente lo pide.
