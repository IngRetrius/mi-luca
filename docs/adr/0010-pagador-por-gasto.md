# 0010. Pagador por gasto y aporte implícito de terceros

- Estado: Aceptada el 02/10/2026 (el asesor delegó la decisión; implementada y en uso)
- Fecha: 2026-10-01

## Contexto

La plantilla no sabe quién paga cada gasto. Cuando la familia u otra persona paga parte de la vida del cliente, el asesor tiene que escribir ese aporte como un ingreso "Otro" igual al gasto (en el caso C2, `Ingresos!E7 = Presupuesto!I89`). El ingreso anual y la tasa de ahorro quedan bien para el flujo, pero la tasa de ahorro deja de describir al cliente: en C2 da 30,6 %, cuando la clienta ahorra el 100 % de lo que gana (hallazgo H-12). Que alguien más pague es un dato de cada cliente, no de su país.

## Decisión

Cada partida del presupuesto indica quién la paga: el cliente, la familia o un tercero (RN-024; `budget_items.payer`, por defecto el cliente). En modo nativo:

1. El presupuesto separa sus totales por pagador (`BudgetResult.byPayer`); los totales de la hoja no cambian.
2. Lo que pagan la familia y otros terceros, gasto y ahorro, es un aporte implícito del mismo valor (`impliedThirdPartyIncome`, RN-015). No se escribe como ingreso.
3. El ingreso anual del Resumen es el ingreso propio más ese aporte, igual que en la plantilla. Se agregan indicadores personales (`personalIndicators`): ingreso propio, aporte de terceros, gasto y ahorro propios, y tasa de ahorro sobre el ingreso propio, (ingreso propio - gasto propio) / ingreso propio.

En modo compatible todo lo paga el cliente y el aporte se escribe como ingreso, como en la plantilla.

## Consecuencias

- Con los datos de C2 y sus partidas marcadas "paga la familia", el ingreso anual sigue en 15.710,46 EUR y la tasa personal es 100 % (`packages/engine/test/native/c2-payer.test.ts`).
- En F3, el flujo anual y los escenarios del fondo tratan el aporte como ingreso tipo "otro" en el mes en que se paga cada partida, de modo que no cambia el sobrante.
- Si una partida está marcada como pagada por otros y además el aporte se escribió como ingreso, se cuenta dos veces. Control de calidad: advertencia cuando hay partidas pagadas por terceros y un ingreso tipo "otro" (sección 6 de `04-motor-de-calculo.md`).

## Alternativas consideradas

- Mantener el aporte como ingreso escrito a mano: es lo que hace la plantilla y deja la tasa de ahorro distorsionada.
- Sacar del presupuesto lo que pagan otros: la tasa personal saldría bien, pero el costo de vida, el fondo de emergencia ("si dejan de pagar") y el flujo perderían esos gastos.
