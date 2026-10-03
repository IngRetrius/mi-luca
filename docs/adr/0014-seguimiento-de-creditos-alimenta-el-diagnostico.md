# 0014. El seguimiento de créditos alimenta el diagnóstico

- Estado: Aceptada (decisión de criterio delegada por el asesor, ADR 0011)
- Fecha: 2026-10-03

## Contexto

La plantilla de créditos lleva la tabla de cada crédito cuota a cuota con las marcas de pago del cliente. Su sección 7 del Panel (`Panel!B95:H102`) calcula, para cada crédito, el saldo de hoy (`'Crédito k'!I6`), la cuota de la próxima cuota sin marcar menos el subsidio FRECH y desde cuándo acepta abonos, y pide copiarlos y pegarlos como valores en la hoja Deudas de la plantilla de asesoría. En la plataforma las dos plantillas son un solo caso: copiar a mano dejaría dos saldos distintos para la misma deuda (H-06, H-23).

## Decisión

Una deuda con fecha de la primera cuota está en seguimiento cuota a cuota. El motor arma su tabla (`creditSchedule`) con las marcas del cliente y, para el inventario, los totales, la deuda cara y el plan de pago, usa lo que da la sección 7 (`creditBridge`): el saldo de hoy, la cuota de la próxima cuota sin marcar menos el subsidio y la fecha desde la que acepta abonos. Es lo que el asesor pegaría a mano. Una deuda sin seguimiento sigue con el saldo y la cuota escritos.

Como en la plantilla, la cuota mínima incluye los seguros (H-05); separarlos es una corrección del modo nativo que llega aparte.

## Consecuencias

- Cuando el cliente marca una cuota pagada, cambian la deuda total, la carga y el plan de pago, y el asesor recibe el antes y después, como con cualquier otro dato del cliente.
- Las pruebas de oro del caso C5 comparan la tabla de cada crédito y la sección 7 con Excel; las de la hoja Deudas siguen con los casos C1 a C9, que no tienen seguimiento.
- `ENGINE_VERSION` 0.12.0: el resultado solo cambia para deudas con seguimiento, que antes no existían.

## Alternativas consideradas

- Copiar los valores a mano, como en Excel: dos fuentes para el mismo saldo y el riesgo de olvidar actualizarlo.
- Usar en el diagnóstico la tabla completa de 360 meses en lugar del saldo y la cuota de hoy: el plan de pago de la hoja Deudas dejaría de ser comparable con la plantilla.
