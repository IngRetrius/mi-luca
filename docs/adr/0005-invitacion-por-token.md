# 0005. Invitación por token, no por coincidencia de correo

- Estado: Propuesta
- Fecha: 2026-09-28

## Contexto

El asesor crea el perfil del cliente y lo invita por correo. El cliente entra con Google o Apple. Con Apple, el cliente puede ocultar su correo y la cuenta queda con una dirección de relay privado distinta de la invitada [F2]. Además, `inviteUserByEmail` de Supabase autentica por enlace de correo, y la decisión es entrar solo con Google o Apple.

## Decisión

La app genera un token aleatorio de un solo uso (en la base solo se guarda su hash), lo envía por correo y, tras el inicio de sesión, la función `accept_invitation(token)` vincula la cuenta al perfil. El correo de la invitación no se usa para vincular y se borra al aceptar.

## Consecuencias

- Funciona con correo oculto de Apple y con cualquier correo de Google.
- Las cuentas que entran sin invitación quedan sin acceso y se borran a los 7 días.
- La app envía sus propios correos (Resend).

## Alternativas consideradas

- Vincular por correo: falla con el relay de Apple.
- `inviteUserByEmail`: agrega un método de acceso por correo que se decidió no tener.
