# Fuentes

Todas las consultas se hicieron el **28 de septiembre de 2026**, salvo que se indique otra fecha. Los precios están en dólares estadounidenses (USD) y pueden cambiar; se deben verificar antes de contratar.

Nivel de verificación:

- **Leída**: se abrió la página y se extrajo el dato.
- **Búsqueda**: el dato viene del resumen de un resultado de búsqueda; conviene abrir la fuente antes de decidir.
- **No consultada**: referencia conocida que no se abrió en esta sesión; hay que verificarla.

## Infraestructura y precios

| N.º | Fuente | Dato usado | Nivel |
|---|---|---|---|
| F1 | [Supabase, Pricing](https://supabase.com/pricing) | Plan gratuito: 500 MB de base de datos, 50.000 usuarios activos al mes (MAU), 1 GB de archivos, 5 GB de salida, 2 proyectos activos, pausa tras 1 semana de inactividad, sin copias de seguridad. Pro: desde 25 USD al mes, 8 GB de disco, 100.000 MAU, 100 GB de archivos, 250 GB de salida, 10 USD de crédito de cómputo, copias de 7 días. PITR: 100 USD al mes por cada 7 días de retención. SOC 2 e ISO 27001 desde el plan Team (599 USD al mes). Excedentes: 0,00325 USD por MAU, 0,125 USD por GB de base de datos, 0,09 USD por GB de salida. | Leída |
| F2 | [Supabase, Login with Apple](https://supabase.com/docs/guides/auth/social-login/auth-apple) | Requisitos: Team ID, App ID, Services ID, URL de retorno, clave `.p8`. El secreto se regenera cada 6 meses. Apple solo entrega el nombre en el primer inicio de sesión. `signInWithOAuth` y `signInWithIdToken`. | Leída |
| F3 | [Apple Developer Program, Enrollment](https://developer.apple.com/programs/enroll/) | Membresía de 99 USD por año (puede variar por región). | Búsqueda |
| F11 | [Vercel, Pricing](https://vercel.com/pricing) | Hobby gratuito; Pro 20 USD al mes por puesto de desarrollador, con 20 USD de crédito de uso. | Leída |
| F12 | [Vercel, Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines) (actualizada el 14/09/2026) | Hobby solo para uso personal no comercial. Uso comercial: cualquier despliegue usado para la ganancia económica de cualquier persona involucrada, incluido "anunciar la venta de un producto o servicio". | Leída |
| F13 | [Supabase, Regions](https://supabase.com/docs/guides/platform/regions) | Regiones UE: Irlanda, Londres, París, Fráncfort, Zúrich, Estocolmo. Sudamérica: São Paulo. EE. UU.: Virginia, Ohio, California, Oregón. La página no dice si la región se puede cambiar después. | Leída |
| F14 | [Supabase, Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp) | El correo incluido envía 2 mensajes por hora y solo a miembros del equipo; no es para producción. Con SMTP propio, 30 mensajes por hora al inicio, ajustable. | Leída |
| F25 | [Resend, Pricing](https://resend.com/pricing) | Gratis: 3.000 correos al mes, 100 al día. Pro: 20 USD al mes por 50.000 correos. | Leída |
| F26 | [Supabase, Compute and Disk](https://supabase.com/docs/guides/platform/compute-and-disk) | Micro unos 10 USD al mes (cubierto por el crédito de Pro), Small unos 15 USD, Medium unos 60 USD. | Leída |

## Autenticación y plataforma web

| N.º | Fuente | Dato usado | Nivel |
|---|---|---|---|
| F4 | [Apple, WWDC23 "What's new in web apps"](https://developer.apple.com/videos/play/wwdc2023/10120/) | En iOS la app de pantalla de inicio no copia el almacenamiento de Safari: el usuario debe volver a autenticarse. OAuth en dominio de terceros se abre dentro de la app "por heurísticas". "Los enlaces abiertos con `window.open` siempre se abren en la web app sin importar el alcance". La copia de cookies al instalar aplica solo en Mac. | Leída |
| F5 | [WebKit, Features in Safari 17 beta](https://webkit.org/blog/14205/news-from-wwdc23-webkit-features-in-safari-17-beta/) | Copia de cookies al agregar al Dock (Mac); no se copia otro almacenamiento. | Leída |
| F6 | [WebKit, Web Push for Web Apps on iOS and iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/) | Notificaciones push desde iOS 16.4, solo para apps agregadas a la pantalla de inicio y con permiso pedido tras una acción del usuario. | Búsqueda |
| F7 | [WebKit, Meet Declarative Web Push](https://webkit.org/blog/16535/meet-declarative-web-push/) | Push declarativo en iOS 18.4 para apps de pantalla de inicio, sin service worker obligatorio. | Búsqueda |
| F8 | [WebKit, Updates to Storage Policy](https://webkit.org/blog/14403/updates-to-storage-policy/) | Desde Safari 17: cuota por origen hasta 60 % del disco en navegadores y apps de pantalla de inicio; `persist()` se concede por heurísticas, por ejemplo si se abre como app de pantalla de inicio. | Leída |
| F9 | [WebKit, Full Third-Party Cookie Blocking and More](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/) | Límite de 7 días para el almacenamiento escrito por script; el dominio propio de las apps de pantalla de inicio está exento. | Búsqueda |
| F10 | [The Register, 02/03/2024](https://www.theregister.com/2024/03/02/apple_reverses_pwa_decision/) | Apple revirtió en marzo de 2024 la eliminación de las apps de pantalla de inicio en la UE (iOS 17.4). | Búsqueda |
| F15 | [Next.js 16](https://nextjs.org/blog/next-16) | `proxy.ts` reemplaza a `middleware.ts`; Turbopack por defecto; Node.js 20.9 o superior; navegadores Safari 16.4 o superior; `params`, `cookies()` y `headers()` asíncronos. | Leída |
| F16 | [Next.js Blog](https://nextjs.org/blog) | Versión vigente 16.3.x; publicación de seguridad programada para el 30/09/2026 (16.3.7). | Búsqueda |
| F17 | [Supabase, Server-Side Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) | `@supabase/ssr` usa PKCE por defecto y guarda la sesión en cookies; el cliente de servidor se crea por petición. | Búsqueda |
| F24 | [Supabase, Before User Created Hook](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook) | Gancho que puede rechazar la creación de un usuario (correo y OAuth); recibe el usuario con `app_metadata.provider`; puede ser una función de Postgres; rechaza devolviendo un error con código 4xx. La página no dice en qué planes está ni si corre en las altas de administración (en local no corre, ver ADR 0009). | Leída |
| F27 | [Google, Brand verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification) y [ayuda de verificación](https://support.google.com/cloud/answer/13463073) | Con solo alcances no sensibles no se exige verificación de la app; mostrar nombre y logo requiere verificación de marca (2 a 3 días hábiles). | Búsqueda |
| F32 | [AWS, IP address ranges](https://ip-ranges.amazonaws.com/ip-ranges.json) (archivo del 28/09/2026) | La dirección IPv6 de la base de datos del proyecto (`2600:1f16:…`) cae en el prefijo `2600:1f16::/34`, región us-east-2 | Leída |
| F33 | [Vercel, Global network and regions](https://vercel.com/docs/regions) (actualizada el 11/08/2026) | `cle1` corresponde a us-east-2 (Cleveland); las funciones corren por defecto en `iad1`; conviene ejecutarlas en la región de la base de datos | Leída |
| F34 | [Supabase, Password security](https://supabase.com/docs/guides/auth/password-security) | Supabase Auth guarda solo hashes bcrypt con sal. Se puede fijar la longitud mínima y los caracteres obligatorios; menos de 8 caracteres no se recomienda. El rechazo de contraseñas filtradas usa Pwned Passwords de HaveIBeenPwned y está disponible desde el plan Pro. | Leída |
| F35 | [Supabase, Email templates](https://supabase.com/docs/guides/auth/auth-email-templates) | `{{ .Token }}` es un código de 6 dígitos que puede usarse en lugar del enlace de confirmación. Algunos proveedores de correo abren los enlaces al revisarlos y los consumen; la guía recomienda usar el código. | Leída |
| F36 | [NIST SP 800-63B-4, Digital Identity Guidelines](https://pages.nist.gov/800-63-4/sp800-63b.html) (versión del 26/08/2025) | Contraseña como único factor: mínimo 15 caracteres; como parte de varios factores: mínimo 8. Máximo permitido de al menos 64. Sin reglas de composición. Comparar con listas de contraseñas comunes o filtradas. Sin cambios periódicos obligatorios. | Leída |
| F37 | [Supabase, Login with Google](https://supabase.com/docs/guides/auth/social-login/auth-google) | Supabase Auth no trae credenciales de Google: hace falta un proyecto de Google Cloud y un cliente de OAuth web (Client ID y Client Secret) creado en Google Auth Platform. URIs de redirección: la del proyecto (`https://<ref>.supabase.co/auth/v1/callback`) y, en local, `http://127.0.0.1:54321/auth/v1/callback`. En `config.toml` el secreto va como `env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET)`. Alcances por defecto: `openid`, `email` y `profile`. | Leída |

## Normativa

| N.º | Fuente | Dato usado | Nivel |
|---|---|---|---|
| F18 | [Decreto 661 de 2018 (Colombia)](https://www.alcaldiabogota.gov.co/sisjur/normas/Norma1.jsp?i=127581) | Art. 2.40.1.1.2: la recomendación profesional es una recomendación individual o personalizada que tiene en cuenta el perfil del cliente y el del producto, "opinión idónea sobre una determinada inversión". Art. 2.40.1.1.3: las comunicaciones generales no son recomendación profesional y deben decirlo. La asesoría la prestan entidades vigiladas por la Superintendencia Financiera, mediante personas inscritas en el RNPMV y certificadas. | Leída |
| F19 | [CNMV, Guía sobre la prestación del servicio de asesoramiento en materia de inversión (23/12/2010)](https://www.cnmv.es/docportal/guias_perfil/guiaasesoramientoinversion.pdf) | Cinco requisitos que deben darse a la vez para que haya asesoramiento: (i) recomendación con elemento de opinión; (ii) sobre instrumentos financieros concretos, "no de forma genérica respecto a un tipo de activos o productos financieros"; (iii) personalizada; (iv) por medios no dirigidos exclusivamente al público general; (v) individualizada. Se resumen en dos: recomendación sobre instrumentos concretos y personalizada. Documento sin carácter normativo, anterior a la Ley 6/2023. | Leída (páginas 1 a 3) |
| F20 | [Ley 6/2023 de los Mercados de Valores y de los Servicios de Inversión (BOE)](https://www.boe.es/buscar/act.php?id=BOE-A-2023-7053) | Marco vigente del asesoramiento en inversión en España; reserva la actividad a entidades autorizadas. | Búsqueda |
| F21 | [SIC, Transferencia internacional de datos personales](https://www.sic.gov.co/boletin-juridico-octubre-2017/transferencia-Internacional-de-datos-personales) | Circular Externa 5 de 2017: lista de países con nivel adecuado de protección, incluido Estados Unidos. | Búsqueda |
| F22 | [SIC, reducción del universo de obligados al RNBD](https://www.sic.gov.co/gobierno-nacional-reduce-universo-de-obligados-a-cumplir-el-registro-de-bases-de-datos-ante-superintendencia-de-industria-y-comercio) | Decreto 090 de 2018: deben inscribirse en el RNBD las sociedades y entidades sin ánimo de lucro con activos mayores a 100.000 UVT y las entidades públicas; las personas naturales no. | Búsqueda |
| F23 | [Supabase, Data Processing Addendum](https://supabase.com/legal/customer-resources/data-processing-addendum) y [GDPR compliance](https://supabase.com/docs/guides/security/gdpr-compliance) | DPA incorporado a los términos; aviso de 30 días ante cambios de subencargados; si se elige una región de la UE, los datos se guardan y procesan principalmente allí. | Búsqueda |
| F28 | Ley 1581 de 2012 y Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015), Colombia | Autorización previa, finalidad, datos sensibles (art. 5, incluye salud), derechos del titular. | No consultada |
| F29 | Reglamento (UE) 2016/679 (RGPD) | Base jurídica, art. 9 (datos de salud), derechos de acceso, portabilidad y supresión, encargados del tratamiento. | No consultada |
| F30 | Art. 58 de la Ley del IRPF (España), mínimo por descendientes | Límite de 8.000 EUR de rentas del hijo. Dato tomado del caso de España; no verificado en esta sesión. | No consultada |

## Accesibilidad

| N.º | Fuente | Dato usado | Nivel |
|---|---|---|---|
| F31 | [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | Contraste mínimo 4,5:1 para texto normal y 3:1 para componentes; tamaño mínimo de objetivo táctil de 24 x 24 px (criterio 2.5.8); el color no puede ser el único medio de transmitir información (1.4.1). | No consultada |

## Fuentes internas

| N.º | Fuente | Uso |
|---|---|---|
| I1 | `referencia/Protocolo_Asesoria_Financiera.md`, versión 2.2 | Proceso, reglas de negocio, límites éticos, casos de referencia |
| I2 | `referencia/Plantilla_Asesoria_Financiera.xlsx` | Fórmulas (inventario en `anexos/inventario-formulas/plantilla-asesoria.md`) |
| I3 | `referencia/Plantilla_Creditos.xlsx` | Fórmulas del módulo de créditos (inventario en `anexos/inventario-formulas/plantilla-creditos.md`) |
| I4 | `referencia/casos/` (fuera de git) | Casos reales de Colombia y España, usados solo para análisis local |
