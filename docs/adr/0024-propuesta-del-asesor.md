# 0024. Propuesta del asesor: ajustes al presupuesto que el cliente decide uno por uno

- Estado: Aceptada (pedido del asesor del 05/10/2026)
- Fecha: 2026-10-05

## Contexto

Con el análisis y los supuestos listos, el asesor recomienda cambios: bajar las salidas de 200.000 a 150.000 al mes, dejar una suscripción, subir el ahorro programado. Hoy no tiene dónde probarlos sin tocar los datos del cliente. Hay piezas sueltas: el nivel básico de cada gasto (`basic_amount`) solo alimenta el costo de vida y no recalcula el plan; la vista previa "Así cambia tu plan" recalcula un cambio a la vez y guarda al confirmar; la simulación de abonos solo sirve para deudas. `03-modelo-de-datos.md` (sección 6) dejaba para después una tabla de escenarios "qué pasa si" con un parche JSON.

El protocolo pone el límite: "el plan respeta el estilo de vida del cliente; se muestran costos y alternativas, no se imponen recortes" (sección 2, principio 4). Una recomendación es una alternativa que el cliente acepta o no, con su porqué. `is_proposed` es otra cosa: marca un valor que el asesor puso porque el cliente no lo sabía (P5.3).

## Decisión

- **Una propuesta en borrador por cliente.** El asesor la arma después del análisis y antes del control de calidad y la carta (P-A25). Es una lista de ajustes sobre los gastos del presupuesto: **cambiar el valor por pago** (hacia arriba o hacia abajo, con la misma moneda y frecuencia) o **quitar el gasto**. Cada ajuste lleva su porqué (opcional, hasta 500 caracteres). Se puede partir del nivel básico: los gastos con `basic_amount` entran como ajustes (0 es quitar).
- **El cliente decide cada ajuste.** Pendiente, aceptado o descartado; el asesor lo anota durante la sesión. Nada se impone.
- **Comparación sin tocar los datos.** Las cifras clave de hoy frente a las del plan con los ajustes no descartados, y junto a cada ajuste lo que cambia ese gasto al mes (o ese ahorro, si es ahorro programado). No se muestra el efecto de cada uno en el sobrante: con deuda cara, un ajuste adelanta la salida de la deuda y libera su cuota, así que los efectos no se suman y el de cada uno confunde; la tabla de cifras ya recoge el total. La app aplica los ajustes sobre las filas del cliente antes de armar la entrada del motor: el motor y sus fórmulas no cambian. Todo va marcado como ilustrativo.
- **Aplicar lo aceptado.** Los ajustes aceptados pasan al presupuesto (el valor nuevo o el gasto borrado), cada uno crea una tarea del plan de acción para el cliente (fecha límite a 30 días, prioridad media, el porqué como nota) y la propuesta queda como registro fijo con las cifras de antes y después. Todo en una transacción (`apply_proposal`); el historial de cambios lo registra como un antes y después (`withImpact`). Lo pendiente pasa a una propuesta nueva en borrador, para seguir conversándolo; lo descartado queda solo en el registro.
- **El presupuesto pasa a ser lo acordado.** No se guarda un presupuesto objetivo aparte: cómo estaba antes queda en el historial, en el registro de la propuesta y en el plan entregado si ya hubo uno. El control mensual compara con lo acordado.
- **Solo el asesor en esta versión.** La propuesta es material de trabajo, como las notas antes de publicarlas; el cliente ve el resultado (su presupuesto y sus tareas). Ver la propuesta aplicada, probar cada ajuste con un interruptor y llevarla a la carta quedan para una segunda versión (G11).
- **Datos.** `proposals` (una en borrador por cliente; aplicada, inmutable) y `proposal_adjustments` (llave compuesta al gasto, que si se borra deja el ajuste sin gasto y con su concepto guardado). RLS: solo el asesor del cliente. Reemplaza la tabla futura `what_if_scenarios`.

## Consecuencias

- El asesor prueba y muestra alternativas en la sesión, con su efecto en cifras, sin miedo a dañar el caso; en la tableta o el escritorio las dos columnas quedan a la vista (ADR 0023).
- Lo acordado no se pierde en una conversación: queda en el presupuesto, en tareas con su porqué y en un registro con fecha.
- Una segunda versión puede sumar ajustes a ingresos, deudas (abono, método), metas y bolsillos, gastos nuevos y varias propuestas para comparar, sin cambiar este modelo: cada tipo es un `kind` más.
- Los ajustes no recomiendan productos ni entidades: son importes del presupuesto del propio cliente (CLAUDE.md, regla 11).

## Alternativas consideradas

- **Presupuesto objetivo aparte del real.** Mide "real frente a objetivo", pero duplica el presupuesto y obliga a decidir cuál usa cada cálculo. Se puede sumar si el piloto muestra que hace falta.
- **Parche JSON libre (`what_if_scenarios`).** Más general, pero sin llave al gasto, sin decisión por ajuste y difícil de validar y de aplicar de forma atómica.
- **Usar el nivel básico como la propuesta.** Ya existe, pero es una columna del costo de vida: no recalcula el plan, no tiene decisión ni porqué y no admite subir un valor. Se usa como punto de partida.
- **Aplicar ajuste por ajuste desde la vista previa del gasto.** Ya se puede, pero pierde la comparación de conjunto y la decisión del cliente.
