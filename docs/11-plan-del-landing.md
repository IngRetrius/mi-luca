# 11. Plan del landing informativo

Fecha: 09/10/2026. Página pública de MiLuca para quien llega por recomendación: qué es, cómo funciona, quién está detrás y cómo escribir. Las decisiones salen de las respuestas del asesor del 09/10/2026 (sección 1). Se construye después de L1 y antes del piloto (L2 en [10-plan-de-lanzamiento.md](10-plan-de-lanzamiento.md)).

**Estado al 09/10/2026:** construido y verificado en local según el [ADR 0026](adr/0026-landing-publico-en-la-raiz.md) (pasos 1 a 12 de la sección 7). El asesor entregó el número de WhatsApp; está en `apps/web/.env.local` y falta ponerlo en Vercel. La foto y la historia del asesor llegaron el mismo día y ya están en la página; el asesor aprobó los supuestos (G13) y pidió un título mejor y no hablar del precio. Para compartir el enlace solo faltan la variable en Vercel y publicar. Ajustes frente al plan original, por lo que se vio al construir:

- La variable es `CONTACT_WHATSAPP`, sin el prefijo `NEXT_PUBLIC_`: el número solo se usa en el servidor y así las pruebas corren con un número inventado.
- El selector de idioma va en el pie: en la cabecera, con Entrar, no cabía en una línea a 320 px.
- En el escritorio, cada sección pone su título a la izquierda y el contenido a la derecha, con el mismo borde izquierdo de la presentación y el pie.
- En modo oscuro los títulos y el botón principal usan `brand-400` (token `brand`), en lugar del texto `brand-50`: mantienen el color de la marca con 7,37:1.
- Las capturas se guardan ya en WebP (780 px de ancho, 45 a 80 KB) y se sirven tal cual, sin el optimizador de imágenes de Next, que gasta la cuota de Vercel y con la caché vacía dejaba imágenes sin responder en las pruebas.
- La herramienta de capturas está en `tools/landing-screenshots/` (nombres de carpeta en inglés, como las demás) y genera también la imagen para compartir.
- El caso inventado de las capturas tiene sus nombres en cada idioma: las capturas en inglés no muestran "Ropa" ni "Tarjeta de crédito".

**Segundo enfoque (09/10/2026, pedido del asesor: "visualmente no leerían todo").** La página se rehízo para quien recorre en lugar de leer, con lo que dice la investigación:

| Hallazgo | Cambio en la página |
|---|---|
| En una página se lee, en promedio, cerca del 20 % de las palabras [F69] | Texto a casi la mitad: una o dos líneas por bloque; de ocho secciones a seis; la página es un 29 % más corta en el celular y un 23 % en el escritorio |
| Se recorre de título en título, como las capas de un pastel; los títulos deben describir la sección y empezar por las palabras importantes [F70] | Cada título dice el mensaje de su sección: "Tres etapas, un reporte claro en cada una.", "Primero tu tranquilidad, y tus datos protegidos." |
| Mostrar antes que contar | Las capturas van junto a su etapa, en lugar de una sección aparte; la de Mis datos sale de la página |
| La acción principal va donde llega el pulgar, abajo y al centro; la evidencia de una barra fija es de práctica, no de estudios [F74] | En el celular, el botón de WhatsApp queda fijo abajo desde que se deja atrás la presentación; en el cierre no se repite |
| Las animaciones deben ser cortas (100 a 400 ms, que arrancan rápido y frenan al final) y respetar "reducir movimiento" [F71]; cambiar el desplazamiento o animar texto que hay que leer causa más problemas que beneficios [F72] | Un solo momento de marca al cargar (la moneda cae sobre la ranura); al bajar, la línea de las etapas se dibuja y sus monedas y capturas aparecen. El texto no se anima y el desplazamiento no se toca |
| Las animaciones ligadas al desplazamiento aún no funcionan en todos los navegadores [F73] | Solo CSS y como mejora: donde no se soportan, o con "reducir movimiento", todo se ve en su lugar desde el principio. Sin librerías ni JavaScript nuevo |

## 1. Decisiones

| Tema | Decisión del asesor | Consecuencia en el plan |
|---|---|---|
| Protagonista | La marca y el asesor | MiLuca como marca, con una sección del asesor: foto, nombre e historia corta |
| Contacto | WhatsApp y pedir una primera sesión | Dos botones, los dos abren WhatsApp con mensajes distintos. Sin formularios: la página no guarda datos. El número lo entregó el asesor el 09/10/2026; vive en `CONTACT_WHATSAPP`, nunca en el repositorio |
| Agenda | Se acuerda por WhatsApp | Sin calendario externo ni otro proveedor de datos |
| Publicación | Ya, en `mi-luca.vercel.app` | Sin costo. Con el plan Hobby de Vercel la página no puede mostrar precios, vender ni llevar anuncios [F12]; al cobrar, Vercel Pro y dominio (L4) |
| Colores | Los del logo y los de la app juntos | Marino del logo en títulos y botones, fondos turquesa claro de la app y el naranja solo como acento |
| Países | Sin mencionarlos | Español neutro, sin palabras de un solo país. Solo el aviso de privacidad nombra Colombia y España, porque cada aviso es de su país |
| Sobre el asesor | Foto e historia corta | Tres o cuatro líneas sin títulos que no tenga |
| La app | Capturas con datos inventados | Tres pantallas del cliente con un caso ficticio, regenerables con un script |

Por la regla 1 de `CLAUDE.md`, los textos van en español e inglés con las mismas claves.

## 2. Objetivo y cómo se mide

**Objetivo:** que alguien que recibe el enlace entienda en menos de un minuto qué es MiLuca, confíe en quién lo acompaña y escriba por WhatsApp.

**Cómo se mide, sin analítica:** cada botón abre WhatsApp con un mensaje propio ("quiero saber más" o "quiero pedir una primera conversación"), así el asesor sabe de qué botón vino cada conversación. Se cuentan a mano cada mes. Sin analítica no hay cookies de seguimiento ni hace falta aviso de cookies.

## 3. Lo que la página no hace

- No habla de precio, ni para decir que es gratis (decisión del asesor del 09/10/2026), ni ofrece un servicio pagado mientras siga en Hobby [F12].
- No usa la palabra "asesoría en inversiones": es planificación y educación financiera. Recomendar inversiones concretas es una actividad regulada en Colombia (Decreto 661 de 2018) [F18].
- No promete resultados ("vas a ahorrar X").
- No lleva testimonios hasta tenerlos reales y con permiso escrito de quien los da; nunca inventados.
- No pide datos personales ni pone formularios, chats de terceros, carruseles ni ventanas emergentes.

## 4. Estructura

Una sola página, primero el celular. En el escritorio, el primer bloque en dos columnas (texto y una captura) y cada sección con su título a la izquierda y el contenido a la derecha.

| # | Sección | Contenido |
|---|---|---|
| 1 | Encabezado | Logo y nombre; "Entrar" para quien ya es cliente. El idioma va en el pie |
| 2 | Presentación | Etiqueta, título, una línea, los dos botones y una línea de confianza; bajo el título, la moneda y la ranura de la marca. A la derecha en escritorio, una captura |
| 3 | Tres etapas, un reporte claro en cada una | Las tres etapas en una línea cada una, unidas por la línea de monedas; junto a las dos primeras, su reporte. "Capturas con datos inventados" |
| 4 | Primero tu tranquilidad, y tus datos protegidos | Cuatro líneas cortas (cómo trabajo y qué pasa con tus datos) y, en letra pequeña, el alcance profesional y el enlace al aviso de privacidad |
| 5 | Sobre mí | Foto, nombre, dos líneas de historia y el enlace al sitio del asesor |
| 6 | Preguntas frecuentes | Cinco preguntas plegables |
| 7 | Cierre | Una frase y el botón de WhatsApp (en el celular, la barra fija hace de botón) |
| 8 | Pie | Nombre y alcance, aviso de privacidad, Entrar, correo de contacto del responsable e idioma |
| | Barra fija (solo celular) | "Escríbeme por WhatsApp", abajo, desde que se deja atrás la presentación |

Boceto en el celular:

```
┌──────────────────────────────────────┐
│ [alcancía] MiLuca            Entrar  │
├──────────────────────────────────────┤
│ Planificación financiera personal    │
│ Entiende tu dinero: organízalo,      │
│ sal de deudas y planea tus metas.    │
│   ●   (la moneda cae al cargar)      │
│ ─────  (ranura naranja)              │
│ Te acompaño paso a paso, sin juicios…│
│ [   Escríbeme por WhatsApp    ]      │
│ [ Pedir una primera conversación ]   │
├──────────────────────────────────────┤
│ ░ Tres etapas, un reporte claro… ░░░ │
│ (1) Presupuesto y bolsillos          │
│  │  una línea   [captura]            │
│ (2) Deudas                           │
│  │  una línea   [captura]            │
│ (3) Patrimonio, protección y metas   │
├──────────────────────────────────────┤
│ Primero tu tranquilidad, y tus datos…│
│ ✓ ✓ ✓ ✓  · letra pequeña · aviso     │
├──────────────────────────────────────┤
│ ░ Sobre mí  [foto]  dos líneas ░░░░░ │
├──────────────────────────────────────┤
│ Preguntas frecuentes  ▸ ▸ ▸          │
├──────────────────────────────────────┤
│ ░ ¿Hablamos? ░░░░░░░░░░░░░░░░░░░░░░░ │
│ Aviso de privacidad · Entrar · correo │
├──────────────────────────────────────┤
│ [   Escríbeme por WhatsApp   ] (fija)│
└──────────────────────────────────────┘
```

## 5. Textos propuestos

Español neutro, de tú, sin palabras de un solo país (dinero en lugar de plata, teléfono en lugar de celular o móvil). El inglés se escribe al implementar, con las mismas claves. Lo marcado **Supuesto** lo confirma el asesor.

**Presentación**

- Etiqueta: Planificación financiera personal
- Título: **Entiende tu dinero: organízalo, sal de deudas y planea tus metas.** El asesor pidió uno mejor que "Ordena tu dinero, una etapa a la vez." y el agente lo eligió con lo que recomiendan las guías: claridad antes que ingenio, un beneficio concreto para quien lee y no la descripción del producto, unas 10 a 12 palabras [F68], y las palabras con significado al principio, porque al recorrer la página se leen unas 2 [F67]. El anterior describía el método con una palabra interna ("etapa") y no decía qué cubre el servicio; el nuevo abre con la promesa de la historia del asesor (entender tu dinero) y nombra las tres etapas en palabras de quien lee, sin prometer cifras. Si algún día se compara con otro, con una prueba A/B.
- Bajada (más corta en el segundo enfoque): Te acompaño paso a paso, sin juicios, para que los intereses jueguen a tu favor.
- Botones: Escríbeme por WhatsApp · Pedir una primera conversación
- Línea de confianza: Sin compromiso. Nunca te pido claves ni números de tus cuentas.

**Tres etapas, un reporte claro en cada una.** Empiezas por la que más te preocupa. Capturas con datos inventados.

| Etapa | Una línea | Captura |
|---|---|---|
| 1. Presupuesto y bolsillos | Sabes a dónde va tu dinero y cuánto te sobra, con un fondo de emergencia primero. | Reporte de presupuesto |
| 2. Deudas | Un orden claro para pagarlas y el mes en que quedas libre. | Plan de pago de deudas |
| 3. Patrimonio, protección y metas | Lo que tienes, cómo protegerlo y cuánto apartar para cada meta. | Sin captura |

**Primero tu tranquilidad, y tus datos protegidos.**

- Primero un fondo de emergencia y tus deudas bajo control.
- Sin juicios: te muestro opciones y tú decides.
- Revisamos tus avances con datos reales a los 30 y 90 días.
- Nunca te pido claves ni números de cuenta. Solo tú y yo vemos tus datos.
- Letra pequeña: No recomiendo productos ni entidades financieras y las proyecciones son ilustrativas. Impuestos, pensión y temas legales los confirmas con el profesional correspondiente. Enlace: Lee el aviso de privacidad.

**Sobre mí** (09/10/2026, a partir de lo que contó el asesor; en el segundo enfoque, en dos líneas: ayudar a otros a entender sus finanzas, compartir lo que aprendió, primero organizarse y después tener a los bancos de aliados y entender los intereses; los estudios y el trabajo salen de su hoja de vida). Va con su foto, el nombre con que firma ("Juan Perea Possos"; en los avisos legales sigue el nombre completo) y un enlace a su sitio, `juan-perea.dev`:

> Soy Juan Perea Possos y estoy detrás de MiLuca.
>
> Quiero que entiendas tus finanzas: primero, a organizarte; después, a tener a los bancos de aliados y a que los intereses jueguen a tu favor.
>
> Estudio el último año de Ingeniería de Sistemas, con énfasis en datos aplicados a las finanzas.
>
> Conoce mi trabajo en juan-perea.dev.

"Apalancarse", como lo dijo el asesor, quedó como "usar el crédito con criterio": la página no recomienda productos ni promete resultados (sección 3).

**Preguntas frecuentes**

| Pregunta | Respuesta |
|---|---|
| ¿Qué necesito para empezar? | Una conversación y una idea de tus ingresos y gastos. Si tienes tus extractos de los últimos meses, mejor, pero no hace falta |
| ¿Es en persona o en línea? | En línea, por videollamada; tus datos y reportes quedan en la app |
| ¿Tengo que conectar mis cuentas bancarias? | No. Los datos los registramos juntos, con valores aproximados; nunca se conecta ningún banco |
| ¿Me vas a vender algún producto? | No. No recomiendo productos ni entidades financieras |
| ¿Puedo hacer solo una etapa? | Sí. Cada etapa es independiente; empiezas por la que más te importe |

**Cierre:** ¿Hablamos? Cuéntame qué te gustaría ordenar primero. [Escríbeme por WhatsApp; en el celular, la barra fija]

**Pie:** MiLuca, el alcance de la plataforma (el texto de `scope.notInvestmentAdvice`), Aviso de privacidad, Entrar, Contacto: {correo de contacto de los avisos} e Idioma.

**Mensajes de WhatsApp** (el visitante los ve escritos y decide si los envía [F65]):

- Botón principal: Hola, vi la página de MiLuca y quiero saber más.
- Pedir una primera conversación: Hola, vi la página de MiLuca y quiero pedir una primera conversación.

## 6. Diseño visual

Limpio y profesional: mucho aire, poco texto, títulos que dicen el mensaje y nada que distraiga. Se aplica la skill `frontend-design` dentro de los tokens de `packages/ui`.

| Elemento | Decisión |
|---|---|
| Títulos y botón principal | Marino del logo `#01255D` (14,75:1 sobre blanco, `tokens.md` sección 5), como token nuevo `brand-navy`. La app sigue con `brand-900` |
| Fondos | Blanco y `brand-50` (#E3F6F5) alternados por sección |
| Enlaces y botón secundario | `brand-600` (#3E6D9C, 5,42:1) |
| Naranja `#F0702C` | Solo acento: la moneda y la ranura bajo el título, el círculo de los números de las etapas (número marino sobre naranja, 4,96:1) y un círculo detrás de la foto. Nunca texto sobre blanco (2,97:1) ni fondo de un botón con texto blanco |
| Modo oscuro | Los tokens de la app: texto `brand-50`, fondos #11142B y `brand-900`; títulos y botón principal en `brand-400` (7,37:1), el botón con texto oscuro; el naranja se mantiene (6,09:1 sobre #11142B) |
| Tipografía | Livvic, alojada por la app. Título principal de 34 px en el celular y 48 px en el escritorio (`text-display` y `text-display-lg`), títulos de sección de 28 px (`text-title`); cuerpo de 18 px |
| Espacio | Múltiplos de 4 px: 48 px entre secciones en el celular y 96 px en el escritorio |
| Capturas | Dentro de un marco de teléfono sencillo hecho con CSS (borde y radio), en tema claro, WebP de 780 px servido tal cual, con texto alternativo que describe la pantalla |
| Foto | Recorte cuadrado de cabeza y hombros en WebP (600 px, el ancho de la foto original lo limita; unos 20 KB), servido tal cual, con el círculo naranja detrás; texto alternativo con el nombre. En el escritorio va en la columna izquierda, bajo el título |
| Iconos | Los mismos trazos simples de la app, en SVG en línea. Sin fotos de banco de imágenes |
| Movimiento | Solo CSS, en `features/landing/motion.module.css` (segundo enfoque, tabla de arriba): la moneda cae sobre la ranura al cargar (450 ms) y la ranura se abre (300 ms); al bajar, la línea de las etapas se dibuja, sus monedas aparecen y las capturas suben, cada una en un tramo corto del desplazamiento; en el celular, la barra fija entra. Nada con "reducir movimiento"; lo ligado al desplazamiento, solo donde el navegador lo soporta [F73] |

## 7. Implementación

| # | Paso | Dónde | Estado |
|---|---|---|---|
| 1 | ADR 0026: página pública en la raíz para quien no tiene sesión; con sesión, cada rol sigue a su inicio como hoy | `docs/adr/` | Hecho |
| 2 | Tokens `brand`, `on-brand`, `accent` y `on-accent`, tamaños `display` y `title`, con la prueba de contraste | `packages/ui`, `globals.css`, `docs/diseno/tokens.md` | Hecho |
| 3 | Textos del landing y de la privacidad pública | `packages/i18n/messages/es.json` y `en.json` (grupos `landing` y `publicPrivacy`) | Hecho |
| 4 | Ruta: `/` muestra el landing sin sesión. El inicio del PWA instalado pasa a `/entrar`, que con sesión ya sigue al inicio de cada rol: quien abre la app instalada no ve el landing. El inicio del cliente pasa a `features/client-home` | `app/page.tsx`, `app/manifest.ts` | Hecho |
| 5 | Secciones como componentes de servidor, una por archivo; sin JavaScript en el navegador salvo el selector de idioma | `features/landing/` | Hecho |
| 6 | Enlace de WhatsApp con su prueba unitaria: número en formato internacional sin signos y mensaje codificado [F65]. El número va en `CONTACT_WHATSAPP` (Vercel y `.env.local`), no en el repositorio, que es público. Sin la variable, los botones llevan al correo de contacto | `features/landing/contact.ts` | Hecho; falta la variable en Vercel |
| 7 | Privacidad pública: los avisos vigentes de cada país habilitado con `current_legal_texts`, que ya se puede llamar sin sesión. Sirve también para la verificación de marca de Google más adelante [F66] | `app/privacidad/page.tsx` | Hecho |
| 8 | Metadatos: título, descripción e imagen para compartir (1200 x 630, con el logo y el título); `robots` que deja indexar `/` y `/privacidad` y no las pantallas de la app; `sitemap` con esas dos | `features/landing/landing-page.tsx`, `app/opengraph-image.png`, `app/robots.ts`, `app/sitemap.ts` | Hecho |
| 9 | Herramienta de capturas: arma un caso inventado en Supabase local, entrega sus reportes, fotografía las tres pantallas del cliente en los dos idiomas y la imagen para compartir. Se vuelve a correr cuando la app cambie | `tools/landing-screenshots/`, `apps/web/public/landing/` | Hecho |
| 10 | Pruebas de extremo a extremo: el visitante ve el landing; los dos botones llevan a WhatsApp con su mensaje; Entrar; la privacidad abre sin sesión; idioma inglés; sin desplazamiento lateral de 320 a 1440 px; ninguna petición a otros dominios; `robots` y `sitemap`. Se ajustan `inicio.spec.ts` y `entrar.spec.ts`, que esperaban la raíz en Entrar | `tests/e2e/specs/landing.spec.ts` | Hecho |
| 11 | Revisión: skills de interfaz (`frontend-design`, `frontend-ui-engineering`, `vercel-react-best-practices`, `vercel-composition-patterns`), `web-design-guidelines`, Lighthouse en el celular y prueba en iPhone y Android reales | | Skills y revisión hechas; faltan Lighthouse y los teléfonos reales, después de publicar |
| 12 | Documentación: P-G06 Landing y P-G07 Privacidad pública en `05-pantallas-y-flujos.md`, glosario y `07-preguntas-abiertas.md` | `docs/` | Hecho |
| 13 | Publicar: `CONTACT_WHATSAPP` en Vercel, subir a `main`, revisar `mi-luca.vercel.app` sin sesión y con sesión, y compartir el enlace | | Pendiente |

**Supuesto:** unas 14 horas en total: 3 de textos, 2 de capturas e imágenes, 6 de construcción y 3 de pruebas y revisión. Con el agente de código, probablemente menos.

## 8. Criterios de aceptación

- Sin sesión, `/` muestra el landing; con sesión, cada rol llega a su inicio como hoy. La app instalada abre en Entrar o en el inicio, nunca en el landing.
- Los dos botones abren WhatsApp con el número y el mensaje correctos en iPhone, Android y WhatsApp Web.
- Español e inglés completos y con las mismas claves; ninguna palabra de un solo país en el landing.
- Lighthouse en el celular: rendimiento 90 o más, accesibilidad 100, buenas prácticas y SEO 95 o más (**Supuesto** de metas).
- Sin desplazamiento lateral a 320 px; modo claro y oscuro con contrastes de los tokens.
- Ninguna petición a otros dominios: fuentes, imágenes y estilos salen de la app.
- `/privacidad` abre sin sesión con los avisos vigentes; `robots.txt` y `sitemap.xml` responden.
- `pnpm format:check`, `lint`, `typecheck`, `test`, `build` y `test:e2e` pasan.

## 9. Lo que necesito del asesor

1. ~~**Número de WhatsApp** para los botones~~: entregado el 09/10/2026. Falta ponerlo en Vercel como `CONTACT_WHATSAPP` (Production y Preview) y volver a desplegar. Recomendación: la app WhatsApp Business (gratuita) con ese número, para tener un saludo automático y etiquetas por conversación.
2. ~~**Foto**~~: entregada el 09/10/2026; recortada y en `public/landing/advisor.webp`. La original quedó en la raíz del repositorio sin subir: conviene moverla fuera de la carpeta.
3. ~~**Historia corta**~~: contada el 09/10/2026 y escrita en la sección 5. Falta que el asesor apruebe la redacción, el nombre "Juan Perea Possos" y la línea de estudios.
4. ~~**Título**~~: el asesor pidió uno mejor; el agente lo eligió con las guías de la sección 5 (09/10/2026).
5. ~~**Confirmar los supuestos**~~: aprobados el 09/10/2026 (G13). Las sesiones son en línea por videollamada; la pregunta del costo se quitó y la página no habla de precio; "ni recibo comisiones" no se dice.
6. ~~**Aprobar los textos**~~: aprobados el 09/10/2026.

## 10. Riesgos

| Riesgo | Mitigación |
|---|---|
| El número de WhatsApp queda público y llega spam | WhatsApp Business con etiquetas; si crece, un número aparte |
| Las capturas quedan viejas cuando cambie la app | `pnpm --filter @miluca/landing-screenshots capture` las regenera en un par de minutos |
| Cruzar la línea del uso comercial en Hobby | Sin precios ni venta; al cobrar, Vercel Pro (L4) |
| `mi-luca.vercel.app` transmite menos confianza que un dominio propio | Al comprar el dominio, redirección permanente y la misma página; ahí también la verificación de marca de Google, que exige página de inicio y privacidad públicas en ese dominio [F66] |
| Un texto se lea como asesoría de inversión regulada | Vocabulario de planificación y educación; límites visibles en la sección 7 de la página |

## 11. Después, al cobrar (L4)

Dominio propio con redirección desde `mi-luca.vercel.app`, Vercel Pro, verificación de marca en Google con esta página y `/privacidad` en el dominio, una sección de precios por etapa con los términos de uso, y testimonios reales con permiso escrito.
