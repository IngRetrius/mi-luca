# 0022. Interfaz en español e inglés, elegida por la persona

- Estado: Aceptada (pedido del asesor del 04/10/2026). Reemplaza la decisión C13 ("el idioma va con el país") de `07-preguntas-abiertas.md`.
- Fecha: 2026-10-04

## Contexto

ADR 0006 dejó el producto en español y "preparado para más idiomas": todos los textos estaban en `packages/i18n/messages/es.json` y las pantallas los leían como `messages.es`. La decisión C13 ataba el idioma al país, y los dos países habilitados hablan español. El asesor pidió el 04/10/2026 la interfaz en español y en inglés, por ejemplo para clientes extranjeros que viven en España o en Colombia.

Restricciones: las rutas están en español (`/clientes`, `/mis-datos`) y las invitaciones ya enviadas y la PWA instalada dependen de ellas; los valores de catálogo y las categorías del presupuesto se guardan como texto en la base; el motor no sabe de idiomas.

## Decisión

- **Dos idiomas, mismos textos.** `messages/en.json` tiene exactamente las claves de `es.json`. El tipo `Messages` sale del español y `messages: Record<Language, Messages>` obliga al inglés a tener la misma forma; una prueba exige además los mismos marcadores (`{amount}`, `{date}`…). Las variantes de trato (`tu`, `usted`) existen también en inglés, con el mismo texto.
- **Quién elige.** Cada persona, en cada equipo: una cookie `miluca-lang` que pone el selector de idioma (Entrar, bienvenida de la invitación, inicio y Privacidad y datos del cliente, lista de clientes del asesor). Sin cookie, el primer idioma de la app en `Accept-Language`; si no hay, español. No va a la base. Sin idioma en la URL.
- **Cómo se leen los textos.** Los componentes de servidor y las acciones llaman a `getMessages()` (`src/server/i18n.ts`, una vez por petición con `React.cache`); los componentes de cliente siguen recibiendo sus textos por props. Los títulos de página usan `pageMetadata(clave)` con `pageTitle` en los mensajes. `<html lang>` sigue el idioma.
- **Formatos.** El locale de presentación es idioma más región del país del cliente (`en-CO`, `es-ES`, `displayLocale`). Las fechas y los meses salen en el idioma; los importes, porcentajes y campos numéricos siguen el formato del país en los dos idiomas (`numberLocale`), como en el banco del cliente y como se escriben los campos (`parseAmount`). Los nombres de país, con `Intl.DisplayNames`.
- **Datos guardados.** Las categorías conocidas del presupuesto y las automáticas del control mensual se guardan con su valor canónico en español (`canonicalCategory`) y se muestran en el idioma de quien mira (`categoryLabel`); así no se parte el presupuesto ni el control mensual si dos personas usan idiomas distintos. Lo que escribe la persona (conceptos, notas, nombres de bolsillos y tareas) queda como lo escribió. La lista de gastos típicos tiene nombres en inglés por país (`budget-catalog/en.ts`) y reconoce un concepto o un bolsillo por su nombre en cualquiera de los dos idiomas.
- **Trato y país de quien lee.** `getMessages()` le da a cada persona los textos para ella (`messagesFor`): a un cliente de usted, en usted también lo que no tiene variantes `{ tu, usted }` (los errores de los formularios, algunas ayudas y los avisos comunes, en `messages/es-usted.json`); a un cliente de España, con el vocabulario de España donde difiere de la base de Colombia (piso, coche, TAE, préstamo personal, asesor fiscal, en `messages/es-ES.json`). Son capas sobre `es.json` con solo los textos que cambian. El asesor y las pantallas sin sesión leen la base, en tú. El layout raíz, los títulos de página y lo que solo ve el asesor usan `getBaseMessages()`, que no espera a saber quién mira: si el layout raíz lo esperara, la redirección de una página llegaría antes que el layout y Safari a veces se queda sin redirigir; por eso los títulos de las pantallas del cliente van en primera persona ("Mis deudas"), que sirve en los dos tratos. Lo que se escribe para un cliente y queda guardado o se descarga (el alcance de la carta, las tareas sugeridas, el PDF) usa el país del caso aunque lo pida el asesor (`getCaseMessages`). Agregado el 05/10/2026 (G8, G9).
- **Agente de captura (ADR 0017).** Cada mensaje lleva `<idioma_de_respuesta>` y el agente responde en ese idioma; las instrucciones fijas no cambian, para que la caché del prefijo sirva en los dos. Las categorías que manda son las canónicas.
- **Lo que queda en español.** Los textos legales aprobados (vienen de `legal_texts`; en inglés se avisa que están en español y llevan `lang="es"`), los correos de Supabase Auth y de recuperación, el manifiesto de la PWA y los mensajes que solo ven los desarrolladores.

## Consecuencias

- Todo texto nuevo va en los dos archivos en el mismo cambio; la verificación de tipos falla si falta en inglés. Si le habla de tú a un cliente sin variantes, lleva además su versión en usted (una prueba lo exige para los errores), y si usa una palabra de Colombia, su versión de España.
- Leer la cookie hace dinámicas las páginas que no lo eran (Entrar, Recuperar). Todas las demás ya lo eran por la sesión.
- El plan entregado guarda los títulos de la carta y las tareas sugeridas con el idioma de quien entrega o las agrega: son registros fijos, como su texto.
- Agregar un idioma es agregar su archivo de mensajes, su entrada en `LANGUAGES` y los nombres del catálogo.

## Alternativas consideradas

- **Idioma en la URL (`/en/clientes`).** Lo que propone la guía de Next.js, pero cambia todas las rutas, rompe los enlaces de invitación y la PWA instalada, y duplica las pruebas de rutas.
- **Idioma guardado en el perfil.** Seguiría a la persona entre equipos, pero pide una migración y no sirve antes de entrar (Entrar, invitación). Se puede sumar después sin cambiar la cookie.
- **next-intl.** Lo previó la arquitectura, pero los textos ya viven en `packages/i18n` con tipos propios y el trato `tu`/`usted`; una librería más no resolvía nada que faltara.
- **Importes con el formato del idioma (`1,750,905` en inglés).** Más "inglés", pero el cliente vería cifras distintas a las de su banco y los campos se escribirían de dos formas.
