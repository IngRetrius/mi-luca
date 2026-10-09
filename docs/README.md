# Documentación de MiLuca

Plan, diseño y decisiones del proyecto. La investigación inicial tiene fecha de corte del 28 de septiembre de 2026; los documentos se actualizan con cada fase. El avance real está en [06-plan-de-trabajo.md](06-plan-de-trabajo.md), sección 2.1, y el orden del trabajo que queda, en [10-plan-de-lanzamiento.md](10-plan-de-lanzamiento.md).

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
| [09-auditoria-de-lanzamiento.md](09-auditoria-de-lanzamiento.md) | Auditoría del 08/10/2026 antes de los primeros clientes: asesoría en tres etapas con reporte propio, riesgos y lista de salida |
| [10-plan-de-lanzamiento.md](10-plan-de-lanzamiento.md) | Orden del trabajo desde el 08/10/2026: higiene, etapas, piloto, antes de cobrar y lo que queda de F7 y F8 |

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
- **Cada caso es diferente.** "Caso España" y "caso Colombia" son ejemplos de prueba, no perfiles de país. Que un cliente sea de España no significa que su familia pague sus gastos, y que sea de Colombia no significa que tenga meses sin ingreso: eso se marca cliente por cliente (RN-018, RN-120).
