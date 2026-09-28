# apps/web

Aplicación web progresiva (PWA) en Next.js con App Router. Es la única aplicación del repositorio: la usan el asesor y los clientes, cada uno con su vista.

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
