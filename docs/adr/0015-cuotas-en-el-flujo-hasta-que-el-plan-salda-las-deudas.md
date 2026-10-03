# 0015. Cuotas en el flujo hasta que el plan salda las deudas (modo nativo, H-03)

- Estado: Aceptada (decisión de criterio delegada por el asesor, ADR 0011)
- Fecha: 2026-10-03

## Contexto

En la plantilla, la fila de deudas del flujo anual (`Flujo anual!E16:P16`) es el promedio del presupuesto repetido los 12 meses: una deuda que termina a mitad de año sigue saliendo hasta diciembre (H-03). ADR 0011 decidió corregirlo en modo nativo.

La corrección directa, sacar del flujo la cuota de cada deuda desde que termina, contaría dos veces el mismo dinero: en el plan de pago la cuota de la deuda que termina pasa a la siguiente (pago total constante, RN-093), y el plan ya cuenta con ella. Además, el extra del plan sale del sobrante del flujo, así que el flujo y el plan dependen uno del otro.

## Decisión

En modo nativo, cada mes del año del flujo, la fila automática de cuotas (`Presupuesto!6`) sale con lo que de verdad se paga ese mes en el plan de pago (cuota y extra), sin pasar de la suma de las cuotas mínimas. Mientras quede alguna deuda en el plan, las cuotas salen completas; solo cuando el plan las salda todas, ese dinero vuelve al sobrante. Los meses anteriores al primer mes del plan salen con la cuota completa.

Para cortar la dependencia, el motor calcula una vez el flujo de la plantilla y su plan de pago, y con ese plan arma el flujo definitivo (una sola vuelta).

El presupuesto no cambia: es un año típico. El control de calidad "ingreso - gasto - ahorro = sobrante" suma las cuotas que el flujo ya no paga, que en modo compatible son 0.

## Consecuencias

- `ENGINE_VERSION` 0.14.0: cambia el modo nativo cuando el plan salda todas las deudas dentro del año del flujo. El modo compatible y las pruebas de oro no cambian.
- El sobrante, la inversión del año y el plan de ahorro del modo nativo reflejan el mes en que el cliente queda sin deudas.

## Alternativas consideradas

- Sacar cada cuota desde el fin de su deuda: cuenta dos veces lo que el plan ya pasa a la siguiente deuda.
- Iterar el flujo y el plan hasta que no cambien: más exacto en casos extremos, pero más difícil de explicar y de probar, para una diferencia que solo aparece el último mes de deuda.
