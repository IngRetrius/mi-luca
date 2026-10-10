# 0033. Tema claro u oscuro elegido por la persona

- Estado: Aceptada (pedido del 09/10/2026). Amplía el ADR 0022, cuya forma de guardar el idioma repite, y el 0026: el landing carga además las opciones del tema.
- Fecha: 2026-10-09

## Contexto

La app ya tenía los dos temas en `packages/ui` (`lightTheme` y `darkTheme`, con la prueba de contraste AA en los dos) y siempre seguía al equipo con `prefers-color-scheme`. No había forma de elegir: quien tiene el celular en oscuro y prefiere leer su plan en claro, o al revés, no podía. El 09/10/2026 se pidió que cada persona elija.

Buenas prácticas consultadas: tres estados, con el del equipo por defecto y una elección que manda sobre él hasta que se vuelva a seguirlo [F83] [F86]; que el navegador conozca el tema antes de pintar, para que no haya destello del otro [F83]; `color-scheme` con el tema, para que los controles nativos, el autocompletado y las barras de desplazamiento lo sigan [F84]; `theme-color` con el fondo del tema.

Restricciones: las mismas del idioma (ADR 0022). Debe servir antes de entrar, una preferencia del equipo no justifica una migración, las pantallas funcionan sin JavaScript y todas las páginas ya pasan por el servidor por la cookie del idioma.

## Decisión

- **Tres opciones.** Automático (la de siempre: sigue al equipo y cambia con él), Claro y Oscuro, bajo el rótulo "Tema" ("Theme"). **Supuesto:** "Automático" se entiende sin saber qué es el "sistema" (G20).
- **Dónde se guarda.** En una cookie `miluca-theme` por equipo, como el idioma: `light` o `dark`, por un año, `httpOnly` y `sameSite=lax`. Automático la borra. No va a la base.
- **Sin destello.** El layout raíz lee la cookie (`getThemePreference`, una vez por petición) y pinta `<html data-theme>` en el HTML del servidor [F85]. La hoja de los temas (`themeStylesheet`, en `packages/ui`) pone el claro en `:root`, el oscuro con `prefers-color-scheme: dark` salvo con `data-theme=light`, y el oscuro con `data-theme=dark`. No hace falta un script en `<head>` y no hay diferencias de hidratación. En Automático, si el equipo cambia de modo, la página lo sigue sola con CSS.
- **Controles y barra del navegador.** `color-scheme` va con los colores: `light dark` en Automático, y `light` o `dark` con un tema fijo. `generateViewport` pone en `theme-color` el fondo del tema elegido, o uno por modo en Automático (`themeColors`) [F85].
- **Selector.** `ThemeSwitcher` va junto al de idioma en `InterfacePreferences`: Entrar, la bienvenida de la invitación, el inicio y Privacidad y datos del cliente, la lista de clientes del asesor y el pie del landing. Los dos comparten `PreferenceForm` y `PreferenceOption`: un formulario con acción de servidor (`setTheme`) y botones con `aria-pressed`, que funciona sin JavaScript. Con JavaScript, `applyTheme` cambia `data-theme` al tocar, sin esperar al servidor, y apaga las transiciones un instante para que los botones no cambien de color después que el fondo; la opción se marca mientras se guarda (`useFormStatus`).
- **Lo que no cambia.** Los colores y sus contrastes, el PDF, los correos, la imagen para compartir y el manifiesto de la PWA.

## Consecuencias

- Todo color nuevo se agrega a los dos temas en `tokens.ts`. `theme.test.ts` exige que el oscuro defina las mismas variables que el claro y `tokens.test.ts`, el contraste de cada par.
- Ningún color se ata al equipo por fuera de la hoja de los temas: nada de `prefers-color-scheme` suelto ni de variantes `dark:` de Tailwind. Si algún día se usa `dark:`, hay que definir la variante con `data-theme` (`@custom-variant`).
- El landing carga un poco más de JavaScript (las opciones del tema) y sigue funcionando sin él.
- El logo de Entrar, del inicio del cliente y de la invitación es el icono de la app, con fondo blanco: en el tema oscuro se ve como un cuadro blanco. Ya pasaba con el equipo en oscuro; queda como pendiente (G21).
- La prueba de extremo a extremo `tema.spec.ts` cubre seguir al equipo, elegir un tema que manda sobre él, recordarlo, el HTML del servidor y el selector sin JavaScript.

## Alternativas consideradas

- **localStorage con un script en `<head>`**, como next-themes y la guía de web.dev [F83]. Sirve para páginas estáticas. Aquí todas las páginas ya pasan por el servidor, y con la cookie el servidor manda el tema desde el primer byte, sin script ni `suppressHydrationWarning`.
- **next-themes.** Resuelve lo mismo con localStorage y un script, y no lee la elección en el servidor. Sería una dependencia más para unas 60 líneas.
- **Guardarlo en el perfil.** Seguiría a la persona entre equipos, pero no sirve antes de entrar y pide una migración; además, cada equipo puede querer el suyo. Se puede sumar después sin cambiar la cookie, como con el idioma.
- **Un botón que alterna entre claro y oscuro.** Más compacto, pero no deja volver a seguir al equipo.
- **Tres radios en un `fieldset`.** Es la semántica que se recomienda para opciones excluyentes [F86], pero sin JavaScript necesita un botón de aplicar, y junto al selector de idioma habría dos controles distintos para lo mismo. Los botones con `aria-pressed` se anuncian como pulsados y funcionan igual con y sin JavaScript.
- **Esperar al servidor para cambiar el tema.** Es más simple, pero el tema cambiaba un momento después del toque y los botones, que tienen transición de color, cambiaban después que el fondo.
