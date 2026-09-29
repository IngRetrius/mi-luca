# Documentación de MiLuca

Plan de trabajo de la primera etapa (planificación, sin código de la aplicación). Fecha de corte de la investigación: 28 de septiembre de 2026.

## Documentos principales

| Documento | Contenido |
|---|---|
| [01-analisis-dominio.md](01-analisis-dominio.md) | Protocolo resumido, inventario de hojas, reglas de negocio numeradas, hallazgos sobre la plantilla |
| [02-arquitectura.md](02-arquitectura.md) | Opciones comparadas, arquitectura recomendada, flujos de autenticación, PWA en iOS, despliegue |
| [03-modelo-de-datos.md](03-modelo-de-datos.md) | Esquema SQL borrador, RLS, matriz de permisos, parámetros por país, historial y planes entregados |
| [04-motor-de-calculo.md](04-motor-de-calculo.md) | Funciones, orden de cálculo, modo compatible con la plantilla, pruebas de oro |
| [05-pantallas-y-flujos.md](05-pantallas-y-flujos.md) | Flujos del asesor y del cliente, lista de pantallas con wireframes en texto |
| [06-plan-de-trabajo.md](06-plan-de-trabajo.md) | Fases, MVP, hitos, estimación, riesgos, costos y criterios de aceptación |
| [07-preguntas-abiertas.md](07-preguntas-abiertas.md) | Decisiones pendientes, cada una con recomendación |
| [08-estructura-del-repositorio.md](08-estructura-del-repositorio.md) | Carpetas, responsabilidades y reglas de dependencia |

## Documentos de apoyo

| Documento | Contenido |
|---|---|
| [glosario.md](glosario.md) | Términos del dominio en español y su identificador en el código |
| [fuentes.md](fuentes.md) | Fuentes externas con fecha de consulta |
| [adr/](adr/README.md) | Registro de decisiones de arquitectura |
| [anexos/](anexos/README.md) | Inventario completo de fórmulas de las dos plantillas |
| [diseno/](diseno/tokens.md) | Tokens de diseño (paleta 3) y semáforo accesible |
| [legal/](legal/README.md) | Marco legal y textos pendientes de redactar; los aprueba el responsable (A7) |

## Convenciones de esta documentación

- Español, sin emojis.
- Lo que no está confirmado se marca **Supuesto** y se registra en [07-preguntas-abiertas.md](07-preguntas-abiertas.md).
- Toda cifra externa remite a [fuentes.md](fuentes.md) con su número de fuente, por ejemplo [F3].
- Las referencias a celdas usan la forma `Hoja!Celda` de la plantilla principal, salvo que se indique otra.
