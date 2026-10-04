# 0018. Control mensual y plan de acción: categorías del cliente y tareas que aplican

- Estado: Aceptada
- Fecha: 2026-10-04

## Contexto

La plantilla trae dos hojas de seguimiento que llena el cliente después de la asesoría:

- **Control mensual** (RN-133): 18 categorías fijas (`Listas!E2:E19`), el presupuesto mensual de cada una (`SUMIFS` del promedio mensual del presupuesto), el gasto real de enero a diciembre y su promedio, diferencia y desviación. El formato condicional resalta las desviaciones de más de 10 % por encima o por debajo, con el umbral escrito en la regla (H-13).
- **Plan de acción** (RN-134): 14 tareas precargadas con prioridad, responsable y fecha límite contada desde la fecha de corte (`Supuestos!C12 + días`), estado y nota; las vencidas se resaltan comparando con `TODAY()`. Las tareas son iguales para todos los casos; el caso de España tuvo que reordenarlas y quitar las que no aplicaban (H-20).

El motor recibe la fecha como dato y nunca lee el reloj (regla 5), y nada del caso se deduce del país.

## Decisión

- **Mismas fórmulas.** `monthlyControl` reproduce `Control mensual!C6:S24` (presupuesto por categoría, promedio de los meses registrados, diferencia, desviación, meses registrados y fila de total) y `suggestedActions` las fechas de `Plan de acción!F6:F19`. Lo prueba el caso de oro C11 (`c11-seguimiento`).
- **Categorías del cliente.** Las filas del control mensual salen del presupuesto de cada cliente (sus categorías en orden, luego las automáticas con valor: Deudas, Seguros y Metas) más las que solo tienen gasto real registrado. Una categoría que no está en la lista fija de la plantilla, como "Varios", sí cuenta: en la hoja se perdía.
- **Umbral como parámetro.** El 10 % es `MONTHLY_CONTROL_THRESHOLD`, que se puede pasar a la función; el 10 % justo no se resalta (`> 0,1`, como la regla de Excel). La pantalla muestra además la desviación del mes elegido, no solo la del promedio.
- **Multimoneda.** Cada registro lleva su moneda; el motor lo pasa a la moneda base con la tasa del cliente.
- **Tareas que aplican (modo nativo, H-20).** En modo compatible se sugieren las 14 de la plantilla. En modo nativo se quitan pagar deudas si no hay deudas, cotizar seguros si no hay seguros por contratar o en cotización, y completar la prueba de realidad si ya está confirmada. El asesor agrega las sugeridas con un botón (una vez cada una), las cambia y escribe otras.
- **Vencidas con la fecha que se da.** `isOverdue(tarea, fecha)` compara con el día de hoy en el país del cliente, que pasa la aplicación.
- **Permisos.** El control mensual lo escriben el cliente y el asesor. Las tareas las crea, fecha y borra el asesor; el cliente cambia su estado y su nota, y la base pone la fecha y el autor de la tarea hecha.

## Consecuencias

- `ENGINE_VERSION` 0.16.0: salidas nuevas, sin cambios en los resultados anteriores ni en las pruebas de oro existentes.
- Los textos de las tareas viven en `packages/i18n` y no nombran la hoja de Excel. La de pensión remite a la entidad de pensiones, coherente con ADR 0016 y la regla 11.
- El control mensual no entra al cálculo del plan: guardar un mes no registra antes y después, solo historial.
- "Ahorro" y "Deudas" siguen como categorías del control, como en la plantilla; separarlas en la vista queda pendiente (H-13).

## Alternativas consideradas

- **La lista fija de 18 categorías.** Igual a la plantilla, pero no coincide con el presupuesto de cada cliente (catálogo por país, categorías propias) y deja fuera lo que no está en la lista.
- **Quitar del todo las tareas que no aplican en modo compatible.** Cambiaría el resultado frente a la plantilla; en modo compatible se conservan las 14.
- **Guardar el control mensual como una fila por mes con todas las categorías.** Más compacto, pero el historial y los permisos por categoría son más simples con una fila por categoría y mes, como en el modelo de datos.
