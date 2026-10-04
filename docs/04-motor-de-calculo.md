# 04. Motor de cálculo

Paquete: `packages/engine`. Reglas de negocio citadas: ver [01-analisis-dominio.md](01-analisis-dominio.md), sección 4.

## 1. Principios

1. **Puro.** Sin React, Next.js, Supabase, red ni sistema de archivos. Solo depende de `packages/domain` (tipos).
2. **Determinista.** Todas las fechas relativas salen de `cutoffDate`, que es un dato de entrada. Nunca `new Date()` (corrige H-14).
3. **Misma aritmética que Excel.** `number` de doble precisión (IEEE 754), igual que Excel, y redondeo solo al presentar. Una librería decimal haría que los resultados se separen de la plantilla en los últimos decimales.
4. **Funciones de Excel con semántica exacta** en `src/excel/` (`EDATE`, `DATEDIF`, `NPER`, `PMT`, `ROUNDUP`, `MINIFS`, `MAXIFS`), probadas contra resultados de Excel.
5. **Trazable.** Cada salida documenta la celda de la plantilla que reproduce (`@excel Hoja!Celda` en el comentario del tipo).
6. **Un solo cálculo por cifra** (P0.2): la carta, las notas, el plan y la exportación leen el mismo `CaseResult`.

## 2. Interfaz pública

```ts
// packages/engine/src/index.ts (borrador)
export function compute(input: CaseInput, params: ResolvedParameters, options?: ComputeOptions): CaseResult;
export function keyFigures(result: CaseResult): KeyFigures;              // cifras para antes y después
export function qualityChecks(input: CaseInput, result: CaseResult): QcReport;
export function diffKeyFigures(before: KeyFigures, after: KeyFigures): KeyFigureDelta[];
export const ENGINE_VERSION: string;                                     // semver

interface ComputeOptions {
  mode: 'compatible' | 'native';   // compatible = plantilla 2.2 tal cual; nativo = con las correcciones aprobadas
  debtHorizonMonths?: 120 | 360;   // 120 en diagnóstico, 360 en seguimiento de créditos
}
```

- **Estado (F5):** existen `compute(input, { mode })`, `keyFigures` y `diffKeyFigures`, con los módulos hasta F3: ingresos, deudas (totales y deuda cara), metas y seguros mínimos, presupuesto con filas automáticas, costo de vida, cuentas por cobrar, flujo anual, prueba de realidad, destino del sobrante, saldo líquido, fondo de emergencia, bolsillos, plan secuencial (nativo), plan de pago de deudas (orden avalancha, bola de nieve o manual y simulación mes a mes con horizonte configurable), patrimonio completo, suma asegurada de vida, inversión (inversiones actuales, perfil de riesgo, rango, distribución y proyección) y Resumen `C11:C28` y `C33:C35`. `CaseInput` trae además `profile` (fecha de nacimiento, personas a cargo y tipo de cliente), `investments`, `riskProfile` y `lifeInsurance`; `PlanParameters`, la edad de retiro, los supuestos de la proyección y los rangos por edad. `CaseInput.debtMethod` lleva el método de pago (`Deudas!C6`). Una deuda con `tracking` (seguimiento cuota a cuota) entra al diagnóstico con el saldo y la cuota de su tabla (`creditBridge`, ADR 0014); `CaseResult.creditSchedules` trae la tabla de cada una. Los parámetros llegan ya resueltos dentro de `CaseInput`: `parameters` (`PlanParameters`: meses de fondo, umbral de deuda cara, porcentajes y colchón, con el valor del asesor o el de la metodología) y los umbrales fiscales. `qualityChecks(input, result)` evalúa los controles numéricos de la sección 6 que ya se pueden verificar (los de la carta llegan en F7).
- `CaseInput`: las entradas vivas del cliente (tablas de la sección 3.4 de `03-modelo-de-datos.md`) más `case_settings`, sin identificadores personales innecesarios (el motor no necesita el nombre).
- `ResolvedParameters`: los parámetros vigentes en la fecha de corte, ya resueltos (país y metodología), con el id de cada versión para guardarlo en el plan entregado.
- `CaseResult`: un objeto por módulo (sección 3) más `summary`, `pending` y `trace` (versión del motor y parámetros usados).

## 3. Catálogo de funciones

| Módulo | Función | Entradas | Salidas | Reproduce |
|---|---|---|---|---|
| `excel` | `edate`, `datedifYears`, `datedifMonths`, `monthIndex`, `nper`, `pmt`, `roundUp`, `effectiveToMonthly` | Números y fechas (`IsoDate`, "AAAA-MM-DD") | Números y fechas; null donde Excel da #NUM!. Existen todas salvo `effectiveToMonthly`, probadas contra Excel | Funciones de Excel |
| `currency` | `toBase(money, rates)`, `missingRates(input)`, `exposureByCurrency(result)` | Importe con moneda y tasas del cliente | Importe en moneda base; monedas sin tasa; exposición por moneda | `Ingresos!F`, `Inversión!F`, `Patrimonio!F` (RN-010, RN-017) |
| `normalization` | `timesPerYear(frequency, durationDays, ssMonthsCount)` | Frecuencia | Veces al año | `Presupuesto!G`, `Listas!C:D` (RN-020, RN-021) |
| `incomes` | `computeIncomes(incomes, fxRates, baseCurrency)` | Ingresos | Por fila: valor en moneda base, pagos del año, total, promedio. Totales por mes y por tipo; ingreso anual en moneda extranjera | `Ingresos!F:U`, filas 14 y 20 a 25 (RN-010, RN-011) |
| `incomes` | `baseIncome(history)` | 12 valores | Promedio, promedio de los 3 más bajos, sugerido | `Ingresos!E30:E32` (RN-013) |
| `incomes` | `impliedThirdPartyIncome(budget)` | Totales del presupuesto por pagador | Aporte implícito de la familia y de otros terceros, anual y mensual | Nuevo, modo nativo (RN-015, ADR 0010) |
| `budget` | `automaticRows({ debtMinPayments, newInsurancePremiums, goalContributions }, baseCurrency)` | Cuotas mínimas, primas nuevas y aporte de cada meta, en moneda base | Filas automáticas, antes de las partidas del cliente | `Presupuesto!6:12` (RN-028) |
| `budget` | `computeBudget(items, ssMonths, fx)` | Partidas (las automáticas primero), con pagador | Por fila: veces al año, total, promedio. Totales por tipo, esencial, seguridad social por pago, filas incompletas, filas bolsillo sin bolsillo; gasto y ahorro por pagador | `Presupuesto!G:I`, filas 89 a 97 (RN-020 a RN-029) |
| `cost-of-living` | `computeCostOfLiving(items, budget, fx, { thresholds, ownIncome })` | Partidas con nivel básico, pagador y marca de temporal; umbrales fiscales que aplican a ese cliente | Por partida y por nivel (esencial, básico, actual): anual, mensual, por pagador, sin temporales; ingreso propio y cada nivel frente a cada umbral | Hoja Costo de vida del caso C2 (RN-030 a RN-032) |
| `cashflow` | `monthlyFlow(incomes, incomesResult, budget, ssMonths, extraOtherIncome)` | Ingresos y presupuesto; en modo nativo, lo que pagan terceros (`thirdPartyByMonth`) | 12 meses: entradas por tipo, salidas por tipo, balance. Los ingresos y las partidas sin tipo no entran (H-26) | `Flujo anual!E7:Q19` (RN-040) |
| `cashflow` | `noIncomeMonths(balances)` | Balances | Faltante, suma y cantidad de positivos, menor positivo, aporte igual, método, cobertura, uso y aporte por mes, sobrante por mes | `Flujo anual!E20:Q22`, `T20:T27` (RN-041, RN-042) |
| `cashflow` | `surplusDestination({ surplus, hasExpensiveDebt, pctToDebt, pctToInvestment, receivables })` | Sobrante (en modo nativo, el que queda después del fondo) | A deudas, a inversión, margen, cobros por destino | `Flujo anual!E24:Q34` (RN-043, RN-044) |
| `reality-check` | `realityCheck(inputs, annualSurplus, programmedSavings, params)` | Saldos en moneda base y flujo | Ahorro real, esperado, diferencia, estado, % a inversión aplicado | `Supuestos!C38:C42` (RN-050 a RN-053) |
| `receivables` | `computeReceivables(rows, cutoffDate, flowYear, fx)` | Cobros | Cuotas, último pago, saldo pendiente en la fecha de corte, abonos por mes del flujo | `Supuestos!F46:K49`, `Flujo anual!E28:P30` (RN-060 a RN-062, H-27) |
| `emergency-fund` | `emergencyFund({ totalMonthlyExpenses, essentialMonthly, monthlyIncomeByKind, months, hasExpensiveDebt })` | Presupuesto e ingresos; en modo nativo el aporte de terceros cuenta como "otro" | Escenarios A, B, C; meta por peor caso, mínimo, completa, vigente; regla de 6 meses | `Fondo emergencia!C6:E23` (RN-080 a RN-084) |
| `pockets` | `computePockets({ pockets, budgetItems, budget, emergencyCurrentGoal, noIncomeShortfall, noIncomeContribution, liquidAssets, operatingCushion, hasExpensiveDebt, pctToDebt, pctExcessToInvestment }, fx)` | Bolsillos generales y resultados previos | Meta, aporte y saldo por bolsillo; reparto del saldo; bolsillos con aporte; alerta de sobreasignación | `Bolsillos!D6:G18`, `C21:C30` (RN-070 a RN-074) |
| `emergency-fund` | `emergencyProgress(assigned, fund)` | Saldo asignado | Avance frente a meta completa y vigente | `Fondo emergencia!C24:C25`, H-11 |
| `savings-plan` | `sequentialSavingsPlan(surplus, fundGoal, fundBalance, flowYear, cutoffDate)` | Sobrante de cada mes y faltante del fondo | Aporte al fondo por mes, sobrante que queda, meses hasta completarlo y mes en que se completa | Nuevo, modo nativo (H-01, ADR 0008; empieza el mes siguiente al corte, ADR 0011) |
| `debts` | `debtTotals(debts, fx)` | Saldo y cuota mínima de cada deuda | Saldo total y cuotas mínimas en moneda base | `Deudas!D21`, `F21` |
| `debts` | `expensiveDebt(debts, threshold, fx)`, `debtLoad(minPayments, monthlyIncome)` | Saldo y tasa de cada deuda | Deuda cara por deuda, saldo caro, si existe; carga de deuda | `Deudas!J13:J20`, `C22:C24` (RN-090) |
| `debts` | `classifyDebts(debts, method, fx)` | Inventario y método (avalancha, bola de nieve o manual) | Tasa mensual y lugar de cada deuda en el orden de pago | `Deudas!I13:I20`, `K13:K20` (RN-091) |
| `debts` | `simulateDebts(debts, classification, plan, fx)`, `expensiveDebtPayoff(rows, simulation)` | Deudas, orden, primer mes, extra mensual del flujo, abono único de Bolsillos y horizonte (120 en el diagnóstico) | Por deuda: meses, fecha de salida, intereses con el plan y solo con la cuota; calendario mes a mes; ahorro en intereses; salida de la deuda cara. Los meses no dependen de la configuración regional (H-28, ADR 0013) | `Deudas!C8:C11`, `E29:DT80`, `E86:F93`, `L13:O20`, `N21:O21`, `H22`, `C25:C26`, `Resumen!C19` (RN-092 a RN-094) |
| `debts` | `debtWhatIf(debts, classification, plan, extra, expensiveRows, fx)` | El plan de pago y un pago adicional al mes y único | El plan y el plan con el adicional: salida de cada deuda y de todas, meses que se adelantan, ahorro en intereses (un mínimo si alguna pasa del horizonte) y salida de la deuda cara. Simulación aparte, "¿Y si se abona más?": no cambia ningún resultado | No está en la plantilla |
| `credits` | `creditSchedule(credit, marks, cutoffDate)`, `simulateFixedExtra`, `paymentToFinishIn` | Crédito (saldo, primera cuota y su número, plazo, tasa, cuota, seguros, FRECH, restricción de abonos) y marcas de pago | 360 cuotas con interés, seguros, subsidio FRECH, cuota (la del banco o con `pmt` y el plazo), cuota distinta, abono extra, capital, saldo, lo que paga el cliente y estado; saldo de hoy, próxima cuota, restantes, fecha fin, intereses y total pendientes, vencidas sin marcar; simuladores de la hoja | Plantilla de créditos, `'Crédito 1'!F7:F23`, `I6:I19`, `B27:S386` (RN-095, RN-096, RN-099) |
| `credits` | `creditBridge(schedule)` | Tabla del crédito | Saldo de hoy, cuota de la próxima cuota sin el subsidio y fecha desde la que acepta abonos: lo que usa el diagnóstico para una deuda en seguimiento (ADR 0014) | `Panel!B95:H102` |
| `credits` | `creditsPaymentPlan(credits, method, extraMonthly, cutoffDate, fx)` | Créditos en seguimiento con su tabla, método y extra mensual | Plan de 360 meses con el simulador de la hoja Deudas (`variant: 'credits'`: seguros sumados cada mes, sin interés con medio peso o menos, pago total con las cuotas de los créditos abiertos, sin abono único) frente a solo con cuotas: orden, fines, meses antes, intereses y seguros, ahorro; deuda y pagos mes a mes | `'Plan de pago'!C7:P21`, `E22:AU387` |
| `credits` | `creditsPanel(credits, plan, cutoffDate, monthlyIncome, fx)` | Créditos, plan e ingreso mensual del caso | Deuda total, pago del próximo mes, intereses por pagar, capital pagado, libre de deudas, vencidas sin marcar, carga y su nivel; calendario y tramos del mes; abono sugerido; hitos; deuda año por año (31 años) | `Panel!B5:L5`, `B25:K33`, `G36:I43`, `B48:G55`, `B60:F90`, `Datos!C20:D21` |
| `goals` | `computeGoals(goals, cutoffDate, fx)`, `tripCost(trip, fx)` | Metas; cada una con su calculadora de viaje o sin ella | Valor usado, meses, aporte; costo del viaje con impuestos del alojamiento y colchón | `Metas!F:K`, `E15:E30` (RN-100, RN-101) |
| `insurance` | `computeInsurance(rows, fx)`, `lifeInsuranceSum(inputs)` | Seguros (con la marca del de vida); deudas, gasto a cubrir, años de apoyo y saldo líquido más inversiones | Primas nuevas y, aparte, las que se cotizan (H-24); si tiene seguro de vida; suma asegurada orientativa. En modo nativo, años y gasto del asesor (H-10) | `Seguros!I6:I16`, `C20:C24` (RN-102, RN-103) |
| `net-worth` | `liquidAssets(assets, fx)` | Activos | Saldo líquido: lo que se reparte en bolsillos | `Patrimonio!C33` (RN-110) |
| `net-worth` | `computeNetWorth({ assets, investments, receivables, debts }, fx)` | Activos, total invertido, saldo por cobrar y deudas | Valor de cada activo, totales, neto, composición por grupo, concentración en inmuebles y vehículos | `Patrimonio!F6:F30`, `C33:D39` (RN-110) |
| `investment` | `currentInvestments(rows, fx)` | Inversiones con tramo | Saldo de cada una, total, en crecimiento y en estabilidad | `Inversión!F6:F14` |
| `investment` | `riskProfile(answers, conditions, hasExpensiveDebt)` | Respuestas y condiciones (las dos que el asesor puede cambiar ya resueltas; sin módulo de pensión, la brecha pensional es siempre "No" y ninguna pensión cuenta como asegurada, ADR 0016) | Puntos, disposición, capacidad, perfil final y sus niveles | `Inversión!D18:E32` (RN-112) |
| `investment` | `growthAllocation({ age, finalProfile, horizon, rangePosition, ranges })` | Perfil y edad | Tramo, rango, % en crecimiento y en estabilidad, motivo cuando no hay crecimiento | `Inversión!C41:C47` (RN-113, RN-114) |
| `investment` | `investmentPlan(annualInvestment, lumpSum, current, growthShare)` | Flujo y bolsillos | Distribución mensual, anual, única; objetivo y movimiento sugerido | `Inversión!C51:E56` (RN-111) |
| `investment` | `projection(input)` | Año del flujo, nacimiento, años al retiro, % en crecimiento, saldo inicial, aporte del sobrante (`Flujo anual!Q25`), abonos de cobros de cada año y supuestos | Tabla de 10 años con glide path; los años al retiro se cuentan desde el corte (H-09) | `Inversión!B61:J71` (RN-115, RN-116) |
| `summary` | `personalIndicators(incomes, budget)` | Ingresos y presupuesto con pagador | Ingreso propio, aporte de terceros, ingreso total, gasto y ahorro propios, tasa de ahorro sobre el ingreso propio | Nuevo, modo nativo (H-12, ADR 0010) |
| `summary` | `summaryIndicators(result, thresholds)`, `pendingItems(input, result)`, `fxSensitivity(currency, ...)` | Todo | Indicadores con estado, pendientes, sensibilidad por cada moneda extranjera | `Resumen!C11:D35` salvo `C29:C32` (pensión, ADR 0016), `B38:B47` sin `B45`, `B51:E60` (RN-130 a RN-132) |
| `monthly-control` | `monthlyControl(budgetByCategory, entries, threshold)` | Presupuesto y gasto real | Por categoría: presupuesto, promedio real, diferencia, desviación, alerta | `Control mensual!C6:S24` (RN-133) |

## 4. Orden de cálculo

`compute` ejecuta estas etapas en orden. Cada etapa recibe solo lo que necesita de las anteriores (sin estado global). El grafo completo está en `01-analisis-dominio.md`, sección 3.3.

1. Resolver parámetros y perfil: edad, meses de fondo efectivos, año del flujo, fecha de inicio de la simulación.
2. Ingresos normalizados (y aporte implícito de terceros, que necesita las partidas del presupuesto marcadas con pagador).
3. Inventario de deudas: tasa mensual, deuda cara, orden, total de cuotas, carga.
4. Metas y seguros nuevos.
5. Presupuesto con filas automáticas; costo de vida por nivel.
6. Cuentas por cobrar.
7. Flujo anual (balance, meses sin ingreso, sobrante).
8. Prueba de realidad (necesita el sobrante anual y el ahorro programado).
9. Destino del sobrante (necesita el % aplicado y si hay deuda cara).
10. Patrimonio (necesita inversiones, cobros y deudas).
11. Fondo de emergencia: escenarios y metas.
12. Bolsillos y reparto del saldo.
13. Fondo de emergencia: avance.
14. Plan de ahorro secuencial (modo nativo).
15. Simulación de deudas (necesita el extra del flujo y el abono único de bolsillos).
16. Inversión: perfil, rango, distribución y proyección.
17. Resumen, pendientes y sensibilidad.
18. Control mensual.

La hoja Pensión de la plantilla no se reproduce (ADR 0016): el Resumen no tiene `C29:C32`.

Tiempo objetivo: menos de 50 ms por cálculo completo en un teléfono de gama media, para recalcular mientras se escribe. La simulación de 360 meses de 8 créditos es el tramo más pesado (unos 3.000 pasos); no requiere optimización especial.

## 5. Modo compatible y modo nativo

| Tema | Modo compatible (plantilla 2.2) | Modo nativo (propuesto) | Hallazgo |
|---|---|---|---|
| Pagador de cada gasto | Hay que registrar el aporte del tercero como ingreso | Pagador por partida y aporte implícito del tercero, que en el flujo y en el fondo es un ingreso "otro"; indicadores personales aparte (ADR 0010). Hecho | H-12, RN-015 |
| Aporte para completar el fondo | Informativo, no se descuenta | Plan secuencial: primero el fondo, luego el reparto (ADR 0008). Hecho | H-01 |
| Bolsillo en partidas tipo bolsillo | Opcional | Obligatorio | H-02 |
| Cuotas de deuda en el flujo | 12 meses iguales | Salen completas mientras el plan tenga deuda y vuelven al sobrante cuando las salda todas (ADR 0015). Hecho | H-03 |
| Seguros en la cuota | No se separan | Se separan: el plan los paga cada mes sin bajar el saldo, en el seguimiento y en el plan nativo. Hecho | H-05 |
| Motor de deudas | 120 meses | Uno solo, horizonte configurable, FRECH y orden manual. Hecho: el mismo simulador para la hoja Deudas y el plan de créditos; el FRECH vive en la tabla del crédito | H-06 |
| Escenarios del fondo | "Otro" se pierde solo en C | Se pierde en el escenario marcado por ingreso (`lostInScenario`: A, B, C o ninguno); sin marca, la regla de la plantilla. Hecho (ADR 0011) | H-07 |
| Seguro de vida | 10 años fijos y el gasto anual | Años y gasto que fija el asesor; vacíos, los de la plantilla. Hecho | H-10 |
| Avance del fondo | Frente a la meta completa | Frente a la completa y a la vigente | H-11 |
| Monedas | Base más USD; sin tasa, el importe vale 0 | Cualquier moneda en cualquier importe; sin tasa, pendiente y bloqueo de entrega | H-15, RN-017 |
| Condición de ingresos variables | Solo por tipo de cliente | Sugerida por tipo, editable | H-16 |

Qué correcciones entran al modo nativo lo decide el asesor (ver [07-preguntas-abiertas.md](07-preguntas-abiertas.md)). Cada corrección aprobada lleva un ADR. Las pruebas de oro corren siempre en modo compatible; el modo nativo tiene sus propias pruebas con valores esperados revisados por el asesor.

El sobrante del Resumen (`C14`) sale del flujo, como en la plantilla, y no de restar gasto y ahorro al ingreso: si hay ingresos o partidas sin tipo, las dos cifras difieren (H-26) y el control de calidad lo detecta.

Los indicadores del Resumen se calculan igual que la plantilla en los dos modos (así la prueba de oro del caso España compara, por ejemplo, un ingreso anual de 15.710,46 EUR que incluye el aporte implícito de los padres). El modo nativo agrega indicadores personales: ingreso propio, gasto propio, aporte de terceros y tasa de ahorro sobre el ingreso propio.

## 6. Control de calidad automatizado

Antes de entregar un plan, `qualityChecks` evalúa los puntos verificables de la sección 10 del protocolo. Los bloqueantes impiden entregar; las advertencias se muestran y se pueden justificar con una nota.

Hay tres niveles: **bloqueante** (impide entregar), **pide nota** (se entrega solo si el asesor lo explica; así queda "meses sin ingreso con alerta de déficit con nota") y **advertencia** (se muestra; la nota es opcional). En F3 están los controles del sobrante, los aportes a bolsillos, el reparto del saldo, los meses sin ingreso, las partidas incompletas y sin bolsillo, los ingresos sin tipo, las monedas sin tasa, la inversión con deuda cara, la prueba de realidad (pendiente: advertencia; "revisar gastos": pide nota) y el aporte de terceros contado dos veces. En F5 se suman el perfil de riesgo sin responder (advertencia), el dinero a menos de 3 años en crecimiento y el % en crecimiento fuera del rango de su edad y perfil o sin la edad para saberlo (bloqueantes). Pruebas en `test/golden/quality-checks.test.ts`.

| Control | Tipo |
|---|---|
| Ingreso - gasto - ahorro programado = sobrante (±0,01) | Bloqueante |
| Suma de aportes de bolsillos = aportes a bolsillos del presupuesto | Bloqueante |
| Reparto del saldo actual no supera lo disponible | Bloqueante |
| Meses sin ingreso cuadran o hay alerta de déficit con nota | Bloqueante |
| Ninguna partida con valor sin frecuencia, tipo o bolsillo | Bloqueante |
| Lista de pendientes vacía o cada punto con nota | Bloqueante |
| Deudas con restricción de abono marcadas cuando el tipo lo sugiere (hipotecario con FRECH, informal) | Advertencia |
| Partidas pagadas por terceros y, a la vez, un ingreso tipo "otro" (posible aporte contado dos veces, ADR 0010) | Advertencia |
| Ningún dinero a menos de 3 años en crecimiento | Bloqueante |
| Perfil final = mínimo entre disposición y capacidad; % dentro del rango de su edad | Bloqueante |
| Sin inversión con deuda cara | Bloqueante |
| Parámetros usados con fuente y fecha, y vigentes a la fecha de corte | Bloqueante |
| Prueba de realidad hecha o marcada pendiente | Advertencia |
| Carta y notas sin marcadores sin resolver | Bloqueante |
| Carta y notas sin nombres de productos ni entidades de inversión (lista de términos a revisar) | Advertencia |

## 7. Pruebas de oro

### 7.1 Criterio de aceptación

Con los mismos datos de entrada, el motor reproduce los valores calculados por Excel en cada indicador de Resumen, Flujo anual, Bolsillos, Fondo de emergencia, Deudas e Inversión:

| Tipo de valor | Tolerancia propuesta |
|---|---|
| Importes | Diferencia absoluta ≤ 0,01 |
| Porcentajes y razones (por ejemplo, 0,3055) | Diferencia absoluta ≤ 0,000001. **Supuesto:** una tolerancia de 0,01 aplicada a una razón equivaldría a un punto porcentual, demasiado laxa |
| Meses, semanas, conteos | ≤ 0,01 |
| Fechas | Iguales |
| Textos de estado ("Bien", "Pendiente", "Aporte igual") | Iguales |

Además se verifican los valores intermedios de Ingresos y Presupuesto, para localizar rápido dónde nace una diferencia.

### 7.2 Casos

| Caso | Fuente | Qué cubre | Estado |
|---|---|---|---|
| C1. Colombia (contratista con arriendos y meses sin ingreso) | Plantilla oficial llenada con los datos del libro del caso real de Colombia, anonimizados | Meses sin ingreso, seguridad social por mes, cobros, USD, patrimonio concentrado (el libro trae la hoja Pensión llena, que el motor no reproduce: ADR 0016) | **Construido** (702 entradas, 5.738 fórmulas; pendiente de revisión del asesor). Reproduce las cifras de la sección 15 salvo la inversión anual; contraste en `packages/engine/test/golden/README.md` |
| C2. España (estudiante, padres pagan, sueldo a ahorro) | Libro del caso real de España, anonimizado | Euro como base, pagador, costo de vida por niveles, perfil conservador | **Listo** (466 entradas, 5.851 fórmulas; revisado por el asesor) |
| C3. Plantilla vacía | `Plantilla_Asesoria_Financiera.xlsx` con fecha de corte fija (28/09/2026) | Valores por defecto, pendientes, divisiones entre cero | **Listo** (535 entradas, 5.738 fórmulas, sin errores) |
| C4. Deudas | Plantilla oficial sintética (`c4-deudas/cambios.json`) con 8 deudas inspiradas en el caso 15.1 del protocolo: ingreso en USD y arriendo, carga de 70 %, hipotecario que acepta abonos desde la cuota 84 (en lugar del FRECH, que la hoja Deudas no tiene), préstamos que no aceptan abonos, préstamo familiar a 0 % | Avalancha con empate de tasas, abono único que salda dos tarjetas y parte del vehículo, abonos desde una fecha anterior y posterior al primer mes, cuota que no cubre el interés ("No se paga"), más de 120 meses | **Listo** (598 entradas, 5.738 fórmulas) |
| C9. Bola de nieve | C4 con método bola de nieve, menos saldo líquido y dos deudas con el mismo saldo (`c9-bola-de-nieve/cambios.json`) | Orden por saldo con empate, deuda cara que se paga en varios meses | **Listo** (598 entradas, 5.738 fórmulas) |
| C5. Créditos | Plantilla de créditos sintética (`c5-creditos/cambios.json`) con los ocho créditos de C4 y marcas de pago | 360 cuotas por crédito, cuota calculada con el plazo, seguros, FRECH hasta la cuota 84, abonos desde una cuota, cuota distinta, abono extra marcado y sin marcar, "Si" sin tilde, cuota vencida sin marcar, cuota que no cubre el interés (más de 360 cuotas), simuladores y puente a Deudas. El libro lleva la corrección de H-28 en las 41 fórmulas con `">0.5"` del Plan de pago y el Panel (ADR 0013): sin ella, con coma decimal, el plan queda con todos los créditos en el lugar 1 y sin cuotas en el pago total | **Listo** (128 entradas, 57.446 fórmulas): hoja de cada crédito, plan de pago y Panel; falta solo la sensibilidad a la tasa de cambio de `Datos!B26:E31` |
| C6. Ingreso variable y déficit | Plantilla oficial sintética (`c6-ingreso-variable/cambios.json`) | Meses sin ingreso con aporte proporcional, ingreso en USD por meses, ingreso y partida sin tipo (H-26), deuda cara con abonos de cobros y abono único a deudas, prueba de realidad confirmada, cobro sin saldo (H-27), saldo líquido en USD | **Listo** (600 entradas, 5.738 fórmulas) |
| C8. Saldos y cobros | Plantilla oficial sintética (`c8-saldos-cobros/cambios.json`) | Sin deudas: prueba de realidad "Revisar gastos", cobro que empieza después del corte con 60 % a inversión, pensión en los escenarios del fondo, meses de fondo fijados, colchón, dos pagos en un mes y saldos que superan lo disponible | **Listo** (577 entradas, 5.738 fórmulas) |
| C10. Inversión | Plantilla oficial sintética (`c10-inversion/cambios.json`) | Perfil respondido (tolerante por disposición, moderado por capacidad), personas a cargo con el seguro de vida en cotización, ingreso variable cambiado a "No", posición 80 %, edad 52 con retiro a 62 y bajada de 6 puntos que llega al piso, inversiones en dólares, en pesos y sin tramo, cobros que entran a la proyección en dos años, todos los tipos de activo y una deuda que no es cara | **Listo** (603 entradas, 5.737 fórmulas) |
| C7. Metas, seguros y cuotas | Plantilla oficial sintética (`c7-metas-seguros/cambios.json`) | Metas con fecha, vencida, cubierta y repetida; calculadora de viaje; seguros nuevos, cotizando y que ya tiene; dos deudas; filas automáticas del presupuesto | **Listo** (591 entradas, 5.738 fórmulas, sin errores) |

Los casos son ejemplos de prueba, no perfiles de país: C2 prueba el pagador y el costo de vida porque esa clienta los tiene, y C1 los meses sin ingreso porque ese cliente los tiene. El motor nunca decide por el país quién paga; lo lee de los datos del cliente (`payer`).

Ninguno de los dos casos reales tiene deudas, por eso C4, C9 y C5 son necesarios para cubrir los módulos de deudas y créditos. C7 tiene dos deudas solo para las cuotas mínimas; no reemplaza a C4.

### 7.3 Procedimiento para cada caso

1. **Anonimizar antes de calcular.** Sobre una copia local fuera del repositorio: nombre por "Cliente Colombia" o "Clienta España"; fecha de nacimiento cambiada conservando el tramo de edad; entidades financieras por genéricos ("Banco A", "Plataforma de inversión"); conceptos que revelen salud o terceros identificables por genéricos ("Salud visual", "Regalo familiar"); textos de notas reescritos. Los importes pueden quedar o redondearse.
2. **Fijar la fecha de corte** con un valor (no `=TODAY()`).
3. **Recalcular en Microsoft Excel** (instalado en el equipo del asesor) con `tools/excel-extractor/recalc.py`, que aplica los cambios y recalcula dentro de Excel mediante AppleScript. No se usa LibreOffice para generar valores esperados, porque puede diferir de Excel en funciones como `DATEDIF`. Validación del método: con la fecha en que se guardó la plantilla, las 5.738 fórmulas recalculadas coincidieron exactamente con las guardadas por Excel.
4. **Verificar** cero errores y revisar la lista de pendientes.
5. **Extraer** con `tools/excel-extractor/golden.py`: las celdas de entrada pasan a `inputs.json` y todas las celdas de fórmula a `expected.json`, por hoja y celda. El mapa de celdas (7.4) las traduce al modelo del motor. Con `--forbid`, el script falla si encuentra en el libro algún nombre o entidad real de una lista guardada fuera del repositorio.
6. **Revisión humana** del JSON (que no quede ningún dato identificable) y commit en `packages/engine/test/golden/<caso>/`.
7. **Contraste** del caso C1 con las cifras de la sección 15 del protocolo (ingreso anual 90,8 millones, gasto 63,7 millones, sobrante 19,3 millones, faltante de enero 3,83 millones, aporte de 348.346, fondo de 8,64 millones). Las diferencias por la anonimización se documentan.

### 7.4 Mapa de celdas

Un archivo `packages/engine/test/golden/cell-map.ts` relaciona cada ruta de salida del motor con su celda, por ejemplo:

```ts
export const cellMap = {
  'summary.annualIncome': 'Resumen!C11',
  'summary.annualSurplus': 'Resumen!C14',
  'cashflow.months[0].balance': 'Flujo anual!E19',
  'cashflow.noIncome.method': 'Flujo anual!T25',
  'pockets.allocation.excess': 'Bolsillos!C25',
  'emergencyFund.currentGoal': 'Fondo emergencia!C21',
  'debts.byOrder[0].monthsToPayoff': 'Deudas!E86',
  'investment.growthShare': 'Inversión!C45',
  // ...
} as const;
```

El mismo mapa sirve después para la exportación a Excel (en sentido inverso, para las celdas de entrada).

### 7.5 Otras pruebas del motor

| Tipo | Qué verifica |
|---|---|
| Modo nativo (`test/native/`) | Correcciones del modo nativo con datos de los casos de oro y valores revisados por el asesor. Hoy, con los datos de C2: pagador por gasto (ingreso anual de 15.710,46 EUR y tasa personal de 100 %), aporte de la familia como ingreso "otro" en el flujo y el fondo (todo igual que la plantilla) y plan secuencial desde el mes siguiente al corte (el fondo se completa en diciembre de 2026 y en 2027 se invierte como en la plantilla, ADR 0011) |
| Compatibilidad Excel (`test/excel-compat/`) | `EDATE` con fin de mes y meses fraccionarios, `DATEDIF` en meses, `ROUNDUP` con negativos y decimales (hechos); `DATEDIF` en años, `NPER` y `PMT` con tasa cero (con sus módulos) |
| Propiedades (`test/properties/`, con fast-check) | Invariantes del control de calidad: sobrante = ingreso - gasto - ahorro; saldos de deuda nunca negativos; el reparto nunca supera lo disponible; el % en crecimiento siempre dentro del rango; resultados iguales con la misma entrada (determinismo) |
| Unitarias por módulo | Casos borde: frecuencia sin días, todos los meses en rojo, deuda que no acepta abonos, tasa 0 %, perfil sin responder |
| Rendimiento | Cálculo completo por debajo del objetivo de la sección 4 |

### 7.6 En integración continua

Las pruebas de oro corren en cada pull request. Si un cambio altera un valor esperado, la prueba falla; actualizar el esperado exige un ADR que explique la diferencia frente a la plantilla (regla 6 de `CLAUDE.md`).

## 8. Versionado

- `ENGINE_VERSION` sigue semver: mayor si cambia un resultado en modo compatible; menor si agrega salidas o cambia el modo nativo; parche si no cambia ningún resultado.
- Cada plan entregado guarda la versión del motor y los ids de los parámetros, para poder reproducir sus cifras.
