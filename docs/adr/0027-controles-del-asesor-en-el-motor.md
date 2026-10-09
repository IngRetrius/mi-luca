# 0027. Controles del asesor en el motor: prueba de realidad de dos lados, contrato inestable, deudas y umbrales por base

- Estado: Aceptada (el asesor pidió arreglar lo encontrado en la revisión del 09/10/2026)
- Fecha: 2026-10-09

## Contexto

La revisión de extremo a extremo con criterio de asesor (`12-plan-de-mejoras-del-asesor.md`, hallazgos R1, R2, R6, R7, R9 y R10) encontró que el motor:

- Confirma la prueba de realidad cuando el plan dice que el cliente pierde 725.000 al mes y en realidad ahorró 166.667: la plantilla solo mira si el ahorro real cae por debajo del 85 % del esperado. El protocolo pide revisar cuando "la diferencia es mayor al 15 %" (sección 6.2); si el cliente ahorra bastante más, el presupuesto tiene gastos de más o le falta un ingreso, y el déficit del plan puede no existir.
- Sugiere "No" en la condición de capacidad "ingresos variables o contrato inestable" para un contratista con un mes sin contrato: la plantilla la sugiere solo al independiente con ingresos variables (H-16).
- No avisa de una deuda cuya cuota no alcanza para los intereses del mes (con esa cuota el saldo no baja) ni de las deudas con cuotas atrasadas o reportes negativos, que el protocolo pide atender primero (sección 8.3, paso 10; pregunta 15).
- Compara cualquier umbral fiscal con el ingreso y con el gasto. Los topes para declarar renta de Colombia (sección 8.9) miran cosas distintas: el ingreso bruto, las compras y consumos, o el patrimonio bruto.
- Con la plantilla vacía, el avance del fondo de emergencia vale 100 % (meta 0).

## Decisión

Solo en modo nativo, salvo lo marcado:

1. **Prueba de realidad de dos lados.** Estado nuevo `revisar_presupuesto` cuando el ahorro real pasa del esperado en más de 15 % de su valor absoluto. Mientras tanto se invierte el porcentaje de prueba pendiente. Control nuevo `reality_check_not_overstated` (pide nota). Con el esperado en 0 sigue pendiente (G10).
2. **Contrato inestable.** `suggestedVariableIncome`: "Sí" para el independiente con ingresos variables, el contratista y quien tiene un ingreso laboral con algún mes sin pago. El valor del asesor sigue mandando.
3. **Controles de deudas** (en los dos modos; no cambian ninguna cifra): `debt_payment_covers_interest` (pide nota, con `paymentCoversInterest`) y `debt_in_arrears` (pide nota). `DebtInput.inArrears` es opcional.
4. **Umbrales con base** (en los dos modos): `FiscalThreshold.basis` (`income`, `spending` o `assets`) y `ThresholdComparison.grossAssetsExceeds`, que compara con el patrimonio bruto (`netWorth.totalAssets`). Sin base, como la plantilla.
5. **Cifra clave del avance del fondo** (en los dos modos): `null` cuando la meta completa es 0, en vez de 1.

`ENGINE_VERSION` pasa a 0.17.0 (menor: cambia el modo nativo y agrega salidas).

## Consecuencias

- Las pruebas de oro no cambian: el modo compatible da los mismos resultados. Los controles nuevos pasan en los casos de oro.
- Un plan en déficit con un cliente que sí ahorra ya no sale como "Confirmada": el asesor revisa el presupuesto antes de entregar.
- Un contratista parte con un perfil de capacidad más prudente; el asesor lo cambia si el contrato es estable.
- `costOfLiving` se calcula después del patrimonio, para tener el patrimonio bruto.
- Una entrega anterior guarda el avance del fondo como 1 con la meta en 0; la comparación con hoy lo muestra como un cambio a "—" en ese caso vacío, que no ocurre con clientes reales.

## Alternativas consideradas

- **Cambiar el estado también en modo compatible:** rompería las pruebas de oro sin que la plantilla lo haga.
- **Usar el mismo control `reality_check_confirms` para los dos lados:** el texto y la causa son distintos (gastos sin registrar frente a presupuesto inflado); un control propio se explica mejor y cada etapa lo puede pedir.
- **Mover las deudas atrasadas al primer lugar del orden de pago:** el protocolo pide ponerse al día con un acuerdo con la entidad, no un orden fijo; queda como nota que el asesor explica.
