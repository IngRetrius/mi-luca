# MiLuca

Plataforma web de planificación financiera personal, pensada para el celular. La usa un asesor para acompañar a sus clientes (hoy en Colombia y en España, preparada para cualquier país y para clientes con varias monedas), y reemplaza la plantilla de Excel de la asesoría como herramienta principal.

Estado al 08/10/2026: **preparando el piloto con personas cercanas**. Terminadas en el código las fases F0 a F5 (fundaciones, acceso y permisos, motor, bolsillos y flujo, deudas, inversión, patrimonio, metas y seguros); F7 avanzada (control mensual, plan de acción, carta, PDF, seguimiento y propuesta del asesor). Lo que sigue, en orden, está en [docs/10-plan-de-lanzamiento.md](docs/10-plan-de-lanzamiento.md): la asesoría en tres etapas con su propio reporte (ADR 0025), el piloto y lo necesario antes de cobrar. El avance por fase está en [docs/06-plan-de-trabajo.md](docs/06-plan-de-trabajo.md) y el plan completo en [docs/](docs/README.md).

## Qué hace

- El asesor sigue el protocolo de asesoría por fases: cuestionario, procesamiento, prueba de realidad, diagnóstico, análisis, entrega y seguimiento.
- La plataforma calcula todo lo que hoy calcula la plantilla (presupuesto, flujo anual, bolsillos, fondo de emergencia, deudas, inversión y resumen con semáforo), salvo la pensión, que se remite al profesional (ADR 0016).
- El cliente tiene su propia cuenta: ve su plan, ajusta sus datos, registra su control mensual y marca sus tareas.
- Cada plan entregado queda como una versión fija con fecha, para compararla con la situación actual en cada revisión.

## Arrancar

Requisitos: Node.js 24 (LTS) y pnpm 12 (con `corepack enable pnpm`).

```bash
pnpm install
pnpm dev          # app en http://localhost:3000
pnpm lint         # reglas de estilo y de dependencia entre capas
pnpm typecheck
pnpm test         # pruebas unitarias (motor, dominio, tokens, formatos)
pnpm test:e2e     # extremo a extremo en iPhone y Android simulados
pnpm build
pnpm format:check # formato con Prettier
pnpm test:db      # pruebas pgTAP de la base (requiere Supabase local: pnpm supabase start)
```

Supabase local, migraciones y despliegue de la base: [supabase/README.md](supabase/README.md).

## Estructura del repositorio

| Carpeta | Responsabilidad |
|---|---|
| [apps/web](apps/web/README.md) | Aplicación web progresiva (Next.js). Pantallas, rutas y acciones de servidor. |
| [packages/engine](packages/engine/README.md) | Motor de cálculo puro. Reproduce las fórmulas de la plantilla. Sin interfaz ni base de datos. |
| [packages/domain](packages/domain/README.md) | Tipos, esquemas de validación y catálogos del dominio. |
| [packages/ui](packages/ui/README.md) | Sistema de diseño: tokens y componentes base accesibles. |
| [packages/i18n](packages/i18n/README.md) | Textos por idioma y formatos de moneda y fecha por país. |
| [packages/exporters](packages/exporters/README.md) | Exportaciones: Excel compatible con la plantilla, carta en PDF, ficha de continuidad. |
| [packages/db](packages/db/README.md) | Tipos generados del esquema de Supabase y clientes tipados. |
| [packages/config](packages/config/README.md) | Configuración compartida de TypeScript, lint y formato. |
| [supabase](supabase/README.md) | Migraciones SQL, políticas RLS, datos semilla (parámetros por país), funciones y pruebas de base de datos. |
| [tests/e2e](tests/e2e/README.md) | Pruebas de extremo a extremo de los flujos del asesor y del cliente. |
| [tools](tools/README.md) | Herramientas de análisis, como el extractor de fórmulas de Excel. |
| [referencia](referencia/README.md) | Protocolo y plantillas originales. Los casos con datos de clientes no se suben. |
| [docs](docs/README.md) | Plan de trabajo, arquitectura, modelo de datos, decisiones (ADR) y anexos. |

La explicación completa de la estructura y sus reglas de dependencia está en [docs/08-estructura-del-repositorio.md](docs/08-estructura-del-repositorio.md).

## Convenciones

- Producto, interfaz y documentación en español. Identificadores de código en inglés, con un [glosario](docs/glosario.md) que traduce cada término del dominio.
- Sin emojis en textos del producto ni en la documentación.
- Todo dato externo (precios, límites, normativa, parámetros de país) lleva fuente y fecha de consulta en [docs/fuentes.md](docs/fuentes.md).
- Ningún dato real de clientes entra al repositorio.
