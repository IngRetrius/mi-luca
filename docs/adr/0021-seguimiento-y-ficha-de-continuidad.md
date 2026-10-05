# 0021. Seguimiento con las revisiones del plan de acción y ficha de continuidad armada con los datos

- Estado: Aceptada
- Fecha: 2026-10-04

## Contexto

La fase 12 del protocolo (sección 13) pide revisar el plan a los 30 días, a los 90 días, una vez al año y ante eventos de vida, y generar al cerrar cada sesión la **ficha de continuidad** del Anexo C, para cargarla en la siguiente junto con el Excel. P-A16 debe comparar con el plan entregado, programar las revisiones y generar la ficha.

En la plataforma los datos no se pierden entre sesiones: la ficha ya no sirve para recordar el caso, sino como resumen de dónde quedó el trabajo y para llevarlo a otra parte. Las revisiones ya existen como tres tareas sugeridas del plan de acción (`review_30_days`, `review_90_days`, `annual_review`, ADR 0018).

Tres campos del Anexo C no salen de ningún dato: si hay testamento, si se revisaron los beneficiarios y las decisiones tomadas. La pensión no se analiza en la plataforma (ADR 0016).

## Decisión

- **Comparar con el último plan entregado.** P-A16 muestra las cifras del último plan que cambiaron con los datos de hoy (la misma comparación de Mi plan), el gasto real del año frente al presupuesto (control mensual) y el avance del plan de acción.
- **Las revisiones son tareas del plan de acción.** No hay tabla de revisiones. P-A16 muestra cada revisión con lo que hay que revisar según el protocolo, su fecha y su estado; se marca hecha ahí o se abre la tarea. "Programar las revisiones que faltan" agrega las que no tiene el cliente, con la fecha contada desde la fecha de corte como las demás tareas sugeridas. La próxima revisión es la de fecha más temprana entre las que no están hechas, aunque esté vencida, y aparece en la ficha del cliente. Los eventos de vida van como texto: no tienen fecha.
- **La ficha se arma al verla.** Sale de los datos de hoy en el orden del Anexo C y se copia como bloque de texto, con la misma primera línea del protocolo. No se guarda una copia: las versiones fijas del plan ya son los planes entregados.
- **Lo que no sale de los datos va en `continuity_notes`.** Testamento y beneficiarios revisados (sí, no o sin dato) y las decisiones tomadas, una por línea. Lo escribe el asesor y el cliente lo puede leer porque son datos suyos.
- **Campos adaptados.** "Pensión" dice que no se analiza en la plataforma y que se revisa con la entidad de pensiones. "Archivos" es el último plan entregado; el Excel llega con P-A18. "Distribución por plazos" es lo invertido hoy en crecimiento y en estabilidad, más el plazo de uso que respondió el cliente. "Supuestos clave" lleva las tasas de cambio del cliente, el salario mínimo del país vigente en la fecha de corte si existe el parámetro y el % del sobrante a inversión que usa el plan.

## Consecuencias

- Una tabla nueva (`continuity_notes`) con RLS y pruebas pgTAP; ninguna para las revisiones.
- El motor no cambia: la ficha solo escribe cifras que ya calcula.
- Programar o marcar una revisión desde P-A16 cambia el plan de acción, y al revés.
- Una revisión hecha queda hecha. Para el ciclo del año siguiente, el asesor reabre la revisión anual y le cambia la fecha.

## Alternativas consideradas

- **Tabla de revisiones aparte.** Duplicaría las tareas de revisión del plan de acción y obligaría a mantenerlas iguales.
- **Guardar una ficha por sesión.** Daría el historial de fichas, pero los datos ya tienen historial (`audit_log`) y las versiones fijas son los planes entregados.
- **Deducir el testamento de la tarea "Evaluar el testamento".** La tarea dice qué hacer, no lo que hay; hecha no significa que exista un testamento.
