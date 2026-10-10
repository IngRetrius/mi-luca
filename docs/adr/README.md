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
| [0019](0019-carta-y-notas-con-cifras-enlazadas.md) | Carta de cierre y notas con cifras enlazadas que se congelan al entregar | Aceptada |
| [0020](0020-pdf-del-plan-al-pedirlo.md) | El PDF del plan entregado se genera al pedirlo, sin guardarlo en Storage | Aceptada |
| [0021](0021-seguimiento-y-ficha-de-continuidad.md) | Seguimiento con las revisiones del plan de acción y ficha de continuidad armada con los datos | Aceptada |
| [0022](0022-interfaz-en-espanol-e-ingles.md) | Interfaz en español e inglés, elegida por cada persona (cookie o idioma del navegador); cifras con el formato del país | Aceptada |
| [0023](0023-diseno-adaptable-del-celular-al-escritorio.md) | Diseño adaptable: igual en el celular, columna de lectura en la tableta y rejillas en el escritorio | Aceptada |
| [0024](0024-propuesta-del-asesor.md) | Propuesta del asesor: ajustes al presupuesto que el cliente decide uno por uno, comparados sin tocar los datos y aplicados con sus tareas | Aceptada |
| [0025](0025-asesoria-por-etapas.md) | Asesoría en tres etapas (presupuesto y bolsillos, deudas, patrimonio con protección y metas), cada una con su reporte; el motor no cambia | Aceptada; la actualizan 0028 y 0029 |
| [0026](0026-landing-publico-en-la-raiz.md) | Landing público en la raíz para quien no tiene sesión, privacidad pública en `/privacidad` y contacto por WhatsApp sin datos guardados | Aceptada; la amplía 0031 |
| [0027](0027-controles-del-asesor-en-el-motor.md) | Controles del asesor en el motor (modo nativo): prueba de realidad de dos lados, contrato inestable, controles de deudas y umbrales fiscales por base | Aceptada |
| [0028](0028-reportes-que-el-cliente-usa.md) | Reportes que el cliente usa (resumen, semáforo, bolsillos, deudas; PDF con el asesor) y etapas coherentes (cuentas en la etapa 1, déficit en todas las entregas) | Aceptada |
| [0029](0029-pasos-opcionales-que-se-omiten.md) | Pasos opcionales que el asesor omite (cuentas, bolsillos, prueba de realidad, deudas, patrimonio, seguros, metas, perfil de riesgo) y etapa terminada | Aceptada; la actualiza 0030 |
| [0030](0030-documentos-temporales-del-cliente.md) | Documentos temporales del cliente para la videollamada: primer paso tras la invitación, solo cliente y asesor, sin Claude, borrados al revisarlos o a los 30 días | Aceptada |
| [0031](0031-movimiento-en-la-app.md) | Movimiento en la app: pantallas que se deslizan adelante y atrás, respuestas cortas a lo que se hace y la moneda en el inicio del cliente; nada con "reducir movimiento" | Aceptada |
| [0032](0032-tasa-oficial-sugerida.md) | Tasa oficial sugerida al registrar una moneda: menú con las monedas comunes y la TRM o la tasa del Banco Central Europeo con un botón para usarla; las tasas guardadas no cambian solas | Aceptada |

Plantilla: [plantilla.md](plantilla.md).
