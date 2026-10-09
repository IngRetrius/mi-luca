# 0026. Landing público en la raíz

- Estado: Aceptada (respuestas del asesor del 09/10/2026)
- Fecha: 2026-10-09

## Contexto

Quien llega a `mi-luca.vercel.app` por recomendación no encontraba nada que leer: la raíz llevaba a Entrar, que solo sirve a quien ya tiene invitación. El asesor pidió una página pública que diga qué es MiLuca, cómo funciona, quién está detrás y cómo escribirle, sin formularios ni datos guardados, publicada ya en el plan Hobby de Vercel, que no permite precios ni venta [F12]. La verificación de marca de Google pedirá más adelante una página de inicio y una política de privacidad públicas en el mismo dominio [F66]. El plan completo está en `11-plan-del-landing.md`.

## Decisión

- **La raíz decide por la sesión.** Sin sesión, `/` muestra el landing (P-G06); con sesión, cada rol sigue a su inicio como antes: el cliente ve el suyo en `/` y el asesor va a `/clientes`. El inicio del cliente pasa a `features/client-home` y la raíz solo elige qué mostrar.
- **La app instalada abre en Entrar** (`start_url: '/entrar'`), que con sesión sigue al inicio de cada rol: quien abre la PWA nunca ve el landing.
- **Privacidad pública en `/privacidad`** (P-G07): los avisos vigentes de cada país habilitado con `current_legal_texts`, que ya se podía llamar sin sesión. La de la app (`/privacidad-y-datos`, P-C11) no cambia.
- **Contacto sin datos guardados.** Dos botones que abren WhatsApp con un mensaje propio cada uno [F65], para saber de qué botón vino la conversación. El número va en la variable `CONTACT_WHATSAPP` (Vercel y `.env.local`), no en el repositorio, que es público; se lee en el servidor en cada petición. Sin la variable, los botones abren el correo del responsable.
- **Solo componentes de servidor** en `features/landing`, una sección por archivo, con los textos en `landing` y `publicPrivacy` (español e inglés). En el navegador no corre más que el selector de idioma, que también funciona sin JavaScript. Sin analítica, cookies de seguimiento ni peticiones a otros dominios.
- **Marca del logo solo en las páginas públicas.** Tokens nuevos `brand`, `on-brand`, `accent` y `on-accent` (`tokens.md`, sección 5): el marino del logo en títulos y botón principal y el naranja como acento, nunca como texto. La app sigue con la paleta 3.
- **Capturas regenerables.** `tools/landing-screenshots` arma un caso inventado en Supabase local, entrega sus reportes y fotografía tres pantallas del cliente en los dos idiomas, más la imagen para compartir el enlace. Las capturas se guardan ya en WebP y se sirven sin el optimizador de imágenes.
- **Indexación solo de lo público.** `robots.txt` deja indexar `/` y `/privacidad` y `sitemap.xml` las lista, con el dominio de producción de Vercel (`VERCEL_PROJECT_PRODUCTION_URL`).

## Consecuencias

- Quien recibe el enlace ve qué es MiLuca antes de escribir; quien ya es cliente entra desde la cabecera.
- Las pruebas de extremo a extremo que esperaban la raíz en Entrar cambian; `landing.spec.ts` cubre el landing, los dos botones, la privacidad pública, el inglés, `robots` y `sitemap`. La app de prueba corre con un número inventado (`tests/e2e/contact-env.ts`).
- Quien instaló la app antes de este cambio la tiene con `start_url: '/'`: si su sesión vence, ve el landing y entra desde la cabecera.
- Los textos los aprobó el asesor el 09/10/2026 (`07-preguntas-abiertas.md`, G13). La página no habla de precio, ni para decir que es gratis. El nombre, la foto y el sitio del asesor están en `features/landing/advisor.ts`.
- Al cobrar (L4) hacen falta Vercel Pro y dominio propio; el landing y `/privacidad` se mudan con una redirección permanente, y la URL canónica cambia sola con la variable de Vercel.

## Alternativas consideradas

- **Landing en otra ruta (`/inicio`) y la raíz como hoy.** Quien recibe `mi-luca.vercel.app` seguiría cayendo en Entrar, y Google pide que la página de inicio sea pública.
- **Formulario de contacto o agenda externa.** Guardan datos de personas que aún no aceptaron ningún aviso y suman un proveedor; WhatsApp es como ya se coordina hoy.
- **Optimizador de imágenes de Next para las capturas.** Sirve tamaños por pantalla, pero gasta la cuota de Vercel y, con `next start` y la caché vacía, una conversión cancelada a medias dejaba esa imagen sin responder en las pruebas. Seis WebP de 45 a 80 KB no lo necesitan.
- **El número de WhatsApp en el código.** Más simple, pero queda en el historial del repositorio público y cambiarlo exige un despliegue de código.
