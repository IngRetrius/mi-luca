# 0008. Plan de ahorro secuencial para completar el fondo de emergencia

- Estado: Aceptada (pregunta B1; el asesor delegó la decisión)
- Fecha: 2026-09-28

## Contexto

En la plantilla, el aporte mensual para completar el fondo de emergencia en 12 meses (`Bolsillos!E6`) no lo usa ninguna otra fórmula (hallazgo H-01). El sobrante se reparte entre inversión y margen desde el primer mes, aunque el fondo esté incompleto, así que el mismo dinero puede quedar asignado dos veces. El caso de España lo resolvió con texto en la hoja Notas: "todo tu sueldo va al fondo hasta llegar a la meta; luego, la mitad a inversión".

## Decisión

En modo nativo, el motor calcula un plan de ahorro secuencial (`sequentialSavingsPlan`):

1. Mientras el fondo no llega a su meta vigente, el sobrante mensual (y los ingresos marcados "100 % a ahorro") va al fondo.
2. El mes en que se completa, el resto de ese mes y los meses siguientes se reparten con la regla de siempre (deudas si hay deuda cara; si no, el % a inversión según la prueba de realidad y el margen).
3. La salida incluye los meses hasta completar el fondo, la fecha estimada y el reparto posterior.

En modo compatible se mantiene el comportamiento de la plantilla, para las pruebas de oro.

## Consecuencias

- La inversión del primer año es menor cuando el fondo está incompleto: es coherente con el principio "primero la estabilidad" (sección 2 del protocolo).
- El Resumen en modo nativo muestra la inversión anual del plan secuencial; el modo compatible, la de la plantilla. La diferencia queda explicada en la vista del asesor.
- Pruebas propias con valores esperados revisados por el asesor, empezando por el caso de España (meses para completar el fondo con el sueldo completo).

## Alternativas consideradas

- Descontar el aporte de 12 meses del sobrante antes de repartirlo: más parecido a la plantilla, pero reparte el fondo en 12 meses aunque el cliente pueda completarlo antes.
- Dejarlo como la plantilla: mantiene la doble asignación.
