# apps/web

Aplicación web progresiva (PWA) en Next.js con App Router. Es la única aplicación del repositorio: la usan el asesor y los clientes, cada uno con su vista.

## Arrancar en local

```bash
cp apps/web/.env.example apps/web/.env.local   # completar la clave publicable de Supabase
pnpm install
pnpm dev                                       # http://localhost:3000
```

Sin las variables de Supabase la app arranca igual; el refresco de sesión se omite y, al intentar entrar, la pantalla avisa que el acceso no está disponible.

Para probar el acceso sin tocar el proyecto remoto, con Supabase local (`pnpm supabase start`), un usuario creado con la API de administración local y las claves locales, que tienen prioridad sobre `.env.local`:

```bash
cd apps/web
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<PUBLISHABLE_KEY de pnpm supabase status> \
SUPABASE_SECRET_KEY=<SECRET_KEY de pnpm supabase status> \
pnpm dev                                       # puerto 3000: es la URL de retorno registrada
```

Para ver las pantallas del asesor en local, crea el usuario con la API de administración local y su fila de asesor (solo en la base local):

```bash
curl -X POST http://127.0.0.1:54321/auth/v1/admin/users \
  -H "apikey: <SECRET_KEY local>" -H "Authorization: Bearer <SECRET_KEY local>" \
  -H 'Content-Type: application/json' \
  -d '{"email":"asesora.local@example.com","password":"<contraseña>","email_confirm":true}'
docker exec supabase_db_miluca psql -U postgres -c \
  "insert into public.advisors (user_id, display_name) select id, 'Asesora local' from auth.users where email = 'asesora.local@example.com'"
```

Una cuenta sin fila de asesor ni perfil vinculado sirve para ver P-G02.

## Despliegue en Vercel

El proyecto `mi-luca` de Vercel está conectado al repositorio: cada push a `main` despliega producción y cada rama, una vista previa. Lo que vive en el repositorio:

- `vercel.json`: funciones en `cle1` (Cleveland, junto a Supabase en us-east-2; ADR 0003). El plan Hobby admite una sola región.
- Node 24 sale de `engines` en el `package.json` raíz y pnpm 12 de `packageManager`.

Lo que se configura en el panel de Vercel (una sola vez):

| Dónde | Valor |
|---|---|
| Settings > Build and Deployment > Root Directory | `apps/web` (Next.js se detecta solo) |
| Environment Variables, Production y Preview | `ENABLE_EXPERIMENTAL_COREPACK=1`: sin ella Vercel usa pnpm 9 o 10 y no pnpm 12 |
| Environment Variables, solo Production | `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, los mismos de `.env.local` |
| Environment Variables, solo Production, marcada como sensible | `SUPABASE_SECRET_KEY` (clave `sb_secret_...` del proyecto): crea la cuenta con contraseña desde la invitación. Sin ella, P-C12 solo funciona con Google |

Las vistas previas no llevan las claves de Supabase: así nunca tocan los datos de producción. La app arranca igual y avisa que el acceso no está disponible. Cuando exista el proyecto de staging, sus claves van en Preview (`docs/02-arquitectura.md`, sección 8).

El dominio de producción es `mi-luca.vercel.app`. Está declarado en Supabase Auth (`site_url` y `additional_redirect_urls` en `[remotes.production.auth]` de `supabase/config.toml`) y se aplica con `pnpm supabase config push`; sin eso, el regreso de Google no vuelve a la app publicada. Si cambia el dominio, se cambia allí.

El plan Hobby es solo para uso personal no comercial: antes de que un cliente real use la app, el proyecto pasa a Pro (`docs/06-plan-de-trabajo.md`, sección de costos).

## Acceso

| Ruta | Qué hace |
|---|---|
| `/entrar` | P-G01: Google o correo y contraseña. Con sesión, sigue a la ruta de retorno (`next`) |
| `/auth/start` | Inicia Google con PKCE; guarda la ruta de retorno en una cookie de 10 minutos |
| `/auth/callback` | Cambia el código por la sesión y sigue a la ruta de retorno |
| `/auth/listo` | Fin de la ventana de Google abierta por la app instalada: avisa a la principal y se cierra |
| `/` | Reparte según el rol (`getViewer`, `src/server/viewer.ts`): el asesor va a `/clientes`, la cuenta sin perfil a `/sin-invitacion`; el cliente ve aquí su inicio (P-C04, vacío hasta la entrega) |
| `/sin-invitacion` | P-G02: la cuenta existe pero no tiene perfil; cerrar sesión. Avisa que se borra a los 7 días |
| `/recuperar` | P-G05: correo, código de 6 dígitos que llega por correo y contraseña nueva, en la misma pantalla y sin salir de la app. Responde igual exista o no la cuenta. En local, los correos se ven en Mailpit (`http://127.0.0.1:54324`) |

## Asesor

| Ruta | Qué hace |
|---|---|
| `/clientes` | P-A01: perfiles con acceso activo, con su estado (texto y símbolo), o el estado vacío. Buscador por nombre con la búsqueda en la URL (`?q=`), que funciona sin JavaScript. Arriba, los avisos sin ver (el cliente aceptó la invitación), con "Marcar como visto". Acción principal fija abajo: "Nuevo cliente" |
| `/clientes/nuevo` | P-A02: nombre visible, país y trato; llama a `create_client` y abre la ficha |
| `/clientes/[id]` | P-A03 (esqueleto): datos del perfil, datos del caso (perfil y supuestos, ingresos, presupuesto, costo de vida y monedas, cada uno con su resumen) y cifras del plan que calcula el motor (`compute`) con lo registrado hoy, e invitación. Mientras nadie haya aceptado: crear el enlace (se ve una sola vez, con botón de copiar), crear uno nuevo (anula el anterior) y anular con confirmación. Un id que no existe, o sin acceso, da la página 404 |
| `/clientes/[id]/presupuesto` | P-A06: partidas por categoría con su promedio mensual, totales (gasto, esencial, ahorro), partidas incompletas y filtros por tipo, pagador y esencial en la URL (`?tipo=`, `?pagador=`, `?esencial=1`), que funcionan sin JavaScript. Acción principal: "Agregar gasto" |
| `/clientes/[id]/presupuesto/nuevo`, `/[itemId]` | Alta, edición y borrado (con confirmación) de una partida. El asesor escribe además el nivel básico y la marca de propuesto. Debajo, "Así cambia el plan": el motor recalcula en el navegador mientras se escribe |
| `/clientes/[id]/perfil` | P-A04 bloque A y P-A05: fecha de nacimiento, sexo, personas a cargo, tipo de cliente con sus reglas y meses de fondo sugeridos, y los supuestos del caso: fecha de corte, año del flujo, modo de cálculo, análisis de pensión y umbrales fiscales que aplican |
| `/clientes/[id]/ingresos` | P-A04 bloque B: ingresos con su total anual, más los meses con seguridad social y el ingreso base. Alta y edición en `/nuevo` y `/[incomeId]`, con pagos por mes y "Así cambia el plan"; `/seguridad-social` y `/ingreso-base` (calculadora que recalcula mientras se escribe) |
| `/clientes/[id]/costo-de-vida` | P-A11: tres niveles al mes y al año, sin temporales, por pagador, umbrales marcados y cada partida con su enlace al presupuesto para editar el nivel básico |
| `/clientes/[id]/monedas` | P-A19: tasa que recibe el cliente por cada moneda, con fecha y nota; alta en `/nueva` y edición o borrado en `/[currency]`. Si la moneda está en uso, borrar vuelve con el aviso (`?error=inUse`) |

Los avisos de `/clientes` incluyen los cambios del cliente (`cambio_del_cliente`) con las cifras clave antes y después.

## Cliente: Mis datos

| Ruta | Qué hace |
|---|---|
| `/mis-datos` | P-C06: los módulos que el cliente edita, con su total: ingresos, gastos y monedas. Se llega desde el inicio |
| `/mis-datos/ingresos` | Sus ingresos, con las mismas pantallas del asesor en su trato (alta, edición con vista previa, meses con seguridad social e ingreso base) |
| `/mis-datos/monedas` | Las tasas que recibe, que también edita (es un dato de hecho) |
| `/mis-datos/gastos` | Lista de gastos por categoría, en el trato del cliente |
| `/mis-datos/gastos/nuevo`, `/[itemId]` | P-C07: alta y edición de un gasto ("¿Quién lo paga? Yo, Mi familia, Otra persona") con "Así cambia tu plan" calculado en el teléfono antes de guardar |

Cada guardado pasa por `withImpact` (`features/summary/impact.ts`): calcula el caso antes y después y llama a `record_change_impact`, que actualiza la caché de cifras, agrupa los cambios de 10 minutos y avisa al asesor si cambió algo el cliente. Para ver las pantallas del cliente en local, crea su usuario con la API de administración y un perfil con `owner_user_id` y acceso del asesor (solo en la base local).

## Invitación (cliente)

Flujo de `docs/02-arquitectura.md`, 5.3. Todas las rutas llevan `referrer: no-referrer` y `noindex` (`src/app/invitacion/layout.tsx`).

| Ruta | Qué hace |
|---|---|
| `/invitacion/[token]` | P-C01: quién invita, qué es y qué no es MiLuca, qué datos se piden y cuáles nunca, en tú o usted según el perfil. "Continuar" guarda el token en una cookie `HttpOnly` de una hora limitada a `/invitacion` (`features/invitations/flow.ts`) |
| `/invitacion/consentimiento` | P-C02: textos vigentes del país (`current_legal_texts`) con versión y fecha; tratamiento de datos obligatorio y datos de salud facultativo. Guarda los textos aceptados en otra cookie del flujo |
| `/invitacion/acceso` | P-C12: Google (vuelve a `/invitacion/aceptar`) o contraseña con el correo de la invitación, que el servidor crea con `SUPABASE_SECRET_KEY` (`src/server/admin.ts`) y luego inicia sesión |
| `/invitacion/aceptar` | Route Handler para las llegadas por navegación (Google, Entrar): llama a `acceptFromFlow`, que ejecuta `accept_invitation` y borra las cookies. Las acciones de servidor llaman a `acceptFromFlow` directamente, porque una acción no debe redirigir a un Route Handler |
| `/instalar` | P-C03: a donde llega el cliente al aceptar. Instrucciones según el sistema (User-Agent en el servidor): Safari en iPhone, botón "Instalar" de Chrome en Android si el navegador lo ofrece, texto general en otros equipos. Si la app ya corre instalada, sigue al inicio |
| `/invitacion/problema` | Explica por qué no se puede seguir (`?motivo=`): enlace inválido, vencido, anulado o usado, flujo vencido, cuenta de asesor, cuenta ya vinculada, sin texto legal vigente o servicio caído |

Para probar el flujo en local hace falta, además de las claves de arriba, la clave secreta local (`SECRET_KEY` de `pnpm supabase status`, pública y solo de prueba) en `SUPABASE_SECRET_KEY`. Los avisos de privacidad llegan con las migraciones (`docs/legal/textos/`).

En `next dev`, el registro de acciones de servidor imprime sus argumentos y resultados, entre ellos el enlace con el token. Solo pasa en desarrollo; en producción no se registran.

## Cliente

| Ruta | Qué hace |
|---|---|
| `/privacidad-y-datos` | P-C11 (primera parte): acceso del asesor con estado en texto y símbolo, retirar (con confirmación) o devolver; consentimientos con versión y fecha, y retirar el de datos de salud (con confirmación); cerrar sesión. Enlace desde el inicio (P-C04) mientras no haya navegación inferior |

## Convenciones de interfaz

- Controles (botones, campos, enlaces de acción) con las clases de `src/components/ui-classes.ts`: foco visible solo con teclado, estado al pasar el puntero, respuesta al toque y colores de los tokens de `packages/ui`.
- Los componentes de cliente reciben sus textos por props desde un componente de servidor (por ejemplo, `AuthText`), para no mandar el catálogo completo de `packages/i18n` al navegador.
- Errores de formulario junto al campo, en una región `aria-live="polite"` que siempre está en la página; los campos con error llevan `aria-invalid` y el foco va al primero que hay que corregir.
- Tipografía: Livvic en todo (`font-sans`, por defecto), alojada con `next/font/google` en `layout.tsx` con los pesos 400, 500 y 600. Si hace falta otro peso, se agrega allí; si no, el navegador lo simula. Montos y tablas con `tabular-nums`.
- Pantallas con `Screen` y, si tienen acción principal, `ScreenActions` (`src/components/screen.tsx`): la barra queda fija abajo, respeta la barra de inicio del iPhone y `globals.css` deja margen para que no tape el campo enfocado.
- Estados de cada pantalla: vacío con texto que dice qué hacer, carga con esqueleto (`loading.tsx`, sin animación si se reduce el movimiento) y error de carga con "Intentar de nuevo" en la misma página.
- `pnpm lint` exige como error las reglas recomendadas de `jsx-a11y`.
- Antes de dar por terminada una pantalla, se revisa con la skill `web-design-guidelines` (`.claude/skills/`).

Las páginas protegidas llaman a `requireViewer()` o `requireAdvisor()` (`src/server/viewer.ts`), que validan el token con `getClaims()` y resuelven el rol con RLS como el propio usuario, una vez por petición. La revisión se hace en cada página y en cada acción de servidor, no en el layout ni en `proxy.ts`.

## Responsabilidad

Mostrar pantallas, recibir datos, validar la sesión y guardar cambios mediante acciones de servidor. No contiene reglas de cálculo: todo cálculo se delega a `packages/engine`.

## Organización interna

| Carpeta | Qué contiene | Qué no contiene |
|---|---|---|
| `src/app/` | Solo rutas, layouts y páginas. Cada página arma componentes de `features/`. | Lógica de negocio, consultas SQL. |
| `src/features/<modulo>/` | Todo lo de un módulo del dominio: componentes, formularios, acciones de servidor y consultas de ese módulo. | Código de otros módulos (se importa solo su API pública `index.ts`). |
| `src/components/` | Componentes de la aplicación compartidos entre módulos: navegación inferior, encabezados, estados vacíos. | Componentes base genéricos (van en `packages/ui`). |
| `src/lib/` | Utilidades técnicas de la aplicación: clientes de Supabase para navegador y servidor, registro del service worker, detección de modo instalado. | Reglas de negocio. |
| `src/server/` | Código solo de servidor compartido: guardas de sesión y rol, registro del impacto de cambios, envío de correos. | Código que pueda llegar al navegador. |
| `src/styles/` | Estilos globales y variables CSS generadas desde los tokens de `packages/ui`. | Estilos de un módulo concreto. |
| `public/` | Manifiesto de la PWA, iconos y pantallas de inicio. | Archivos con datos de clientes. |

El archivo `src/proxy.ts` (antes `middleware.ts` en Next.js 15) refresca la sesión de Supabase en cada petición.

## Módulos de `src/features/`

| Módulo | Equivale a |
|---|---|
| `auth` | Entrar (P-G01), flujo de Google en la app instalada y cerrar sesión |
| `clients` | Lista (P-A01), alta con `create_client` (P-A02) y ficha (P-A03) de los perfiles del asesor |
| `invitations` | Enlace de invitación del asesor (P-A03) y flujo del cliente: P-C01, consentimiento (P-C02), acceso (P-C12) y aceptación |
| `consent` | Privacidad y datos del cliente (P-C11): acceso del asesor y consentimientos |
| `install` | Guía para agregar la app a la pantalla de inicio (P-C03) |
| `notifications` | Avisos dentro de la app (hoy, invitación aceptada) |
| `profile` | Hoja Supuestos (datos del cliente y parámetros) |
| `incomes` | Hoja Ingresos |
| `budget` | Hoja Presupuesto |
| `cost-of-living` | Hoja Costo de vida (caso España): niveles esencial, básico y actual |
| `cashflow` | Hoja Flujo anual |
| `pockets` | Hojas Bolsillos y Listas: bancos y bolsillos |
| `emergency-fund` | Hoja Fondo emergencia |
| `debts`, `credits` | Hoja Deudas y plantilla de créditos |
| `goals`, `insurance`, `net-worth`, `investment`, `pension` | Hojas Metas, Seguros, Patrimonio, Inversión y Pensión |
| `summary` | Hoja Resumen: indicadores, semáforo y pendientes |
| `reality-check`, `receivables` | Supuestos, filas 35 a 50 |
| `monthly-control`, `action-plan` | Hojas Control mensual y Plan de acción |
| `deliveries` | Planes entregados (versiones fijas), notas para el cliente, carta y ficha |
| `change-history` | Historial de cambios y tablas de antes y después |
