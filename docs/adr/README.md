# Registro de decisiones de arquitectura (ADR)

Cada decisión que cambia la arquitectura, el modelo de datos o un resultado del motor se documenta aquí. Un ADR no se edita después de aceptado: si la decisión cambia, se escribe uno nuevo que lo reemplaza.

| N.º | Decisión | Estado |
|---|---|---|
| [0001](0001-monorepo-pnpm-turborepo.md) | Monorepo con pnpm y Turborepo | Aceptada |
| [0002](0002-nextjs-pwa-en-vercel.md) | Next.js como PWA, alojada en Vercel Pro | Aceptada |
| [0003](0003-region-de-datos.md) | Región de datos: Supabase en us-east-2 (Ohio), Vercel en cle1 | Aceptada |
| [0004](0004-motor-puro-en-typescript.md) | Motor de cálculo puro en TypeScript, con doble precisión | Aceptada |
| [0005](0005-invitacion-por-token.md) | Invitación por token, no por coincidencia de correo | Aceptada |
| [0006](0006-codigo-en-ingles-producto-en-espanol.md) | Código en inglés, producto y documentación en español | Aceptada |
| [0007](0007-modo-compatible-y-nativo.md) | Modo compatible con la plantilla y modo nativo | Aceptada |
| [0008](0008-plan-de-ahorro-secuencial.md) | Plan de ahorro secuencial para completar el fondo de emergencia | Aceptada |
| [0009](0009-google-y-correo-con-contrasena.md) | Inicio de sesión con Google y con correo y contraseña; Apple aplazado | Aceptada |
| [0010](0010-pagador-por-gasto.md) | Pagador por gasto y aporte implícito de terceros (modo nativo, H-12) | Aceptada |
| [0011](0011-decisiones-de-criterio-del-modo-nativo.md) | Decisiones de criterio del modo nativo y del mantenimiento del plan por el cliente | Aceptada |
| [0012](0012-asistente-de-ia-del-asesor.md) | Asistente de IA del asesor con Claude Haiku, desde el servidor (la prueba con Ollama local quedó como alternativa) | Aceptada; para el agente de captura la amplía 0017 |
| [0013](0013-meses-para-pagar-sin-configuracion-regional.md) | Meses para pagar una deuda sin depender de la configuración regional de Excel (H-28) | Aceptada |
| [0014](0014-seguimiento-de-creditos-alimenta-el-diagnostico.md) | El seguimiento de créditos alimenta el diagnóstico (puente de la sección 7 del Panel) | Aceptada |
| [0015](0015-cuotas-en-el-flujo-hasta-que-el-plan-salda-las-deudas.md) | Cuotas en el flujo hasta que el plan salda las deudas (modo nativo, H-03) | Aceptada |
| [0016](0016-pension-fuera-de-la-plataforma.md) | La pensión queda fuera de la plataforma (se elimina F6) | Aceptada |
| [0017](0017-agente-de-captura-que-anota-en-el-plan.md) | Agente de captura en un botón flotante: el asesor le cuenta lo que dice el cliente y lo anota en el plan, con las reglas de cada pantalla | Aceptada |
| [0018](0018-control-mensual-y-plan-de-accion.md) | Control mensual con las categorías del cliente y tareas sugeridas que aplican (H-13, H-20) | Aceptada |

Plantilla: [plantilla.md](plantilla.md).
