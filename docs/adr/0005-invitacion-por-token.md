# 0005. Invitación por token, no por coincidencia de correo

- Estado: Aceptada el 02/10/2026 (el asesor delegó la decisión; implementada y en uso)
- Fecha: 2026-09-28

## Contexto

El asesor crea el perfil del cliente y lo invita por correo. El cliente entra con Google o con correo y contraseña (ADR 0009). La cuenta de Google puede tener un correo distinto del invitado y, si más adelante se agrega Apple, el cliente puede ocultar su correo con una dirección de relay privado [F2]. Además, `inviteUserByEmail` de Supabase crea la cuenta al invitar, antes de que el cliente acepte el tratamiento de datos.

## Decisión

La app genera un token aleatorio de un solo uso (en la base solo se guarda su hash), lo envía por correo y, tras el inicio de sesión, la función `accept_invitation(token)` vincula la cuenta al perfil. El correo de la invitación no se usa para vincular y se borra al aceptar. Con correo y contraseña, la cuenta se crea con el correo de la invitación (ADR 0009), pero el vínculo sigue siendo el token.

## Consecuencias

- Funciona con cualquier cuenta de Google y, si se agrega Apple, con su correo oculto.
- Las cuentas que entran sin invitación quedan sin acceso y se borran a los 7 días.
- La app envía sus propios correos (Resend).

## Alternativas consideradas

- Vincular por correo: falla si la cuenta de Google usa otro correo, y con el relay de Apple.
- `inviteUserByEmail`: crea la cuenta antes del consentimiento y su enlace inicia sesión en el navegador donde se abre, que en iOS no es la app instalada.
