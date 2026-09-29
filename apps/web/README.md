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
pnpm dev                                       # puerto 3000: es la URL de retorno registrada
```

## Acceso

| Ruta | Qué hace |
|---|---|
| `/entrar` | P-G01: Google o correo y contraseña. Con sesión, sigue a la ruta de retorno (`next`) |
| `/auth/start` | Inicia Google con PKCE; guarda la ruta de retorno en una cookie de 10 minutos |
| `/auth/callback` | Cambia el código por la sesión y sigue a la ruta de retorno |
| `/auth/listo` | Fin de la ventana de Google abierta por la app instalada: avisa a la principal y se cierra |

## Convenciones de interfaz

- Controles (botones, campos, enlaces de acción) con las clases de `src/components/ui-classes.ts`: foco visible solo con teclado, estado al pasar el puntero, respuesta al toque y colores de los tokens de `packages/ui`.
- Los componentes de cliente reciben sus textos por props desde un componente de servidor (por ejemplo, `AuthText`), para no mandar el catálogo completo de `packages/i18n` al navegador.
- Errores de formulario junto al campo, en una región `aria-live="polite"` que siempre está en la página; los campos con error llevan `aria-invalid` y el foco va al primero que hay que corregir.
- `pnpm lint` exige como error las reglas recomendadas de `jsx-a11y`.
- Antes de dar por terminada una pantalla, se revisa con la skill `web-design-guidelines` (`.claude/skills/`).

Las páginas protegidas llaman a `requireSessionUser()` (`src/server/session.ts`), que valida el token con `getClaims()`. La revisión se hace en cada página y en cada acción, no en el layout ni en `proxy.ts`.

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
| `clients`, `invitations`, `consent` | Alta de clientes, invitación por correo, consentimiento de datos |
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
