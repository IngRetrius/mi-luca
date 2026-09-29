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

- `CaseInput`: las entradas vivas del cliente (tablas de la sección 3.4 de `03-modelo-de-datos.md`) más `case_settings`, sin identificadores personales innecesarios (el motor no necesita el nombre).
- `ResolvedParameters`: los parámetros vigentes en la fecha de corte, ya resueltos (país y metodología), con el id de cada versión para guardarlo en el plan entregado.
- `CaseResult`: un objeto por módulo (sección 3) más `summary`, `pending` y `trace` (versión del motor y parámetros usados).

## 3. Catálogo de funciones

| Módulo | Función | Entradas | Salidas | Reproduce |
|---|---|---|---|---|
| `excel` | `edate`, `datedifYears`, `datedifMonths`, `nper`, `pmt`, `roundUp`, `effectiveToMonthly` | Números y fechas | Números y fechas | Funciones de Excel |
| `currency` | `toBase(money, rates)`, `missingRates(input)`, `exposureByCurrency(result)` | Importe con moneda y tasas del cliente | Importe en moneda base; monedas sin tasa; exposición por moneda | `Ingresos!F`, `Inversión!F`, `Patrimonio!F` (RN-010, RN-017) |
| `normalization` | `timesPerYear(frequency, durationDays, ssMonthsCount)` | Frecuencia | Veces al año | `Presupuesto!G`, `Listas!C:D` (RN-020, RN-021) |
| `incomes` | `computeIncomes(incomes, fxRates, baseCurrency)` | Ingresos | Por fila: valor en moneda base, pagos del año, total, promedio. Totales por mes y por tipo; ingreso anual en moneda extranjera | `Ingresos!F:U`, filas 14 y 20 a 25 (RN-010, RN-011) |
| `incomes` | `baseIncome(history)` | 12 valores | Promedio, promedio de los 3 más bajos, sugerido | `Ingresos!E30:E32` (RN-013) |
| `incomes` | `impliedThirdPartyIncome(budgetRows)` | Filas pagadas por terceros | Ingreso implícito por pagador | Nuevo (RN-015) |
| `budget` | `automaticRows(debts, insurance, goals)` | Resultados de esos módulos | Filas automáticas | `Presupuesto!6:12` (RN-028) |
| `budget` | `computeBudget(items, automaticRows, ssMonths)` | Partidas | Por fila: veces al año, total, promedio. Totales por tipo, esencial, seguridad social por pago, filas incompletas, filas bolsillo sin bolsillo | `Presupuesto!G:I`, filas 89 a 97 (RN-020 a RN-029) |
| `cost-of-living` | `computeCostOfLiving(items, thresholds)` | Partidas y umbrales del país | Por nivel: anual, mensual, por pagador, sin temporales; comparación con umbrales | Hoja Costo de vida del caso España (RN-030 a RN-032) |
| `cashflow` | `monthlyFlow(incomes, budget, ssMonths, flowYear)` | Ingresos y presupuesto | 12 meses: entradas por tipo, salidas por tipo, balance | `Flujo anual!E7:Q19` (RN-040) |
| `cashflow` | `noIncomeMonths(balances)` | Balances | Faltante, suma y cantidad de positivos, menor positivo, aporte igual, método, cobertura, uso y aporte por mes, sobrante por mes | `Flujo anual!E20:Q22`, `T20:T27` (RN-041, RN-042) |
| `cashflow` | `surplusDestination(surplus, hasExpensiveDebt, pctInvest, pctDebt, receivablesByMonth)` | Sobrante | A deudas, a inversión, margen, cobros por destino | `Flujo anual!E24:Q34` (RN-043, RN-044) |
| `reality-check` | `realityCheck(inputs, annualSurplus, programmedSavings, params)` | Saldos y flujo | Ahorro real, esperado, diferencia, estado, % a inversión aplicado | `Supuestos!C38:C42` (RN-050 a RN-053) |
| `receivables` | `computeReceivables(rows, cutoffDate)` | Cobros | Cuotas, último pago, saldo pendiente hoy, abonos por mes | `Supuestos!F46:K49` (RN-060 a RN-062) |
| `emergency-fund` | `emergencyScenarios(essentialMonthly, incomesByKind, months, hasExpensiveDebt)` | Presupuesto e ingresos | Escenarios A, B, C; meta por peor caso, mínimo, completa, vigente; regla de 6 meses | `Fondo emergencia!C6:C23` (RN-080 a RN-084) |
| `pockets` | `computePockets(pockets, budgetRows, fund, noIncome, liquid, cushion, hasExpensiveDebt, params)` | Bolsillos y resultados previos | Meta y aporte por bolsillo; saldos sugeridos; reparto del saldo; alertas de límite y sobreasignación | `Bolsillos!D6:G18`, `C21:C30` (RN-070 a RN-074) |
| `emergency-fund` | `emergencyProgress(assigned, fullGoal, currentGoal)` | Saldo asignado | Avance frente a meta completa y vigente | `Fondo emergencia!C24:C25`, H-11 |
| `savings-plan` | `sequentialSavingsPlan(monthlySaving, fundGap, pctInvest)` | Capacidad de ahorro y faltante del fondo | Meses hasta completar el fondo y reparto posterior | Nuevo, modo nativo (H-01, RN-014) |
| `debts` | `classifyDebts(debts, threshold, method)` | Inventario | Tasa mensual, deuda cara, orden, totales, carga | `Deudas!I:K`, `C21:C26` (RN-090, RN-091) |
| `debts` | `simulateDebts(debts, plan)` | Deudas, pago total, abono único, horizonte | Por deuda: meses, fecha de salida, intereses con plan y solo cuota; calendario mes a mes | `Deudas!E29:DT80`, `E86:F93`, `L:O` (RN-092 a RN-097) |
| `credits` | `amortizationSchedule(credit, marks, cutoffDate)` | Crédito y marcas de pago | 360 cuotas con interés, seguros, FRECH, cuota, extra, capital, saldo, lo que paga, estado | Plantilla de créditos, hojas Crédito (RN-095, RN-096, RN-099) |
| `credits` | `creditsPanel(schedules, incomes, plan)` | Tablas | Deuda total, próximo pago, calendario, tramos del mes, hitos, deuda por año, abono sugerido, puente hacia Deudas | Plantilla de créditos, Panel y Plan de pago |
| `goals` | `computeGoals(goals, cutoffDate)`, `tripCost(items, fx, cushion)` | Metas | Valor usado, meses, aporte | `Metas!F:K`, `E15:E30` (RN-100, RN-101) |
| `insurance` | `computeInsurance(rows)`, `lifeInsuranceSum(inputs)` | Seguros | Primas nuevas, suma asegurada orientativa | `Seguros!I6:I16`, `C20:C24` (RN-102, RN-103) |
| `net-worth` | `computeNetWorth(assets, investments, receivables, debts, fx)` | Activos | Totales, neto, composición, concentración | `Patrimonio!F6:F30`, `C33:D39` (RN-110) |
| `investment` | `riskProfile(answers, conditions, hasExpensiveDebt)` | Respuestas y condiciones | Disposición, capacidad, perfil final | `Inversión!D18:E32` (RN-112) |
| `investment` | `growthAllocation(age, profile, position, horizon, table)` | Perfil y edad | Rango, % crecimiento y estabilidad, mensaje | `Inversión!C41:C47` (RN-113, RN-114) |
| `investment` | `investmentPlan(flow, lumpSum, currentInvestments)` | Flujo y bolsillos | Distribución mensual, anual, única; movimiento sugerido | `Inversión!C51:E56` (RN-111) |
| `investment` | `projection(years, ...)` | Todo lo anterior | Tabla de 10 años con glide path | `Inversión!B61:J71` (RN-115, RN-116) |
| `pension/co` | `projectWeeks`, `requiredWeeks`, `pensionScenarios`, `postRetirementFlow`, `pensionGap` | Datos de pensión y flujo | Semanas, requisito, faltantes, mesadas, flujos, brecha | `Pensión!C9:C25`, `B43:F54`, `C58:E78` (RN-121) |
| `pension/es` | `informativePension(params)` | Parámetros | Edad de referencia y textos de remisión | Nuevo (RN-122) |
| `summary` | `summaryIndicators(result, thresholds)`, `pendingItems(input, result)`, `fxSensitivity(currency, ...)` | Todo | Indicadores con estado, pendientes, sensibilidad por cada moneda extranjera | `Resumen!C11:D35`, `B38:B47`, `B51:E60` (RN-130 a RN-132) |
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
16. Pensión del país, si está activa.
17. Inversión: perfil, rango, distribución y proyección.
18. Resumen, pendientes y sensibilidad.
19. Control mensual.

Tiempo objetivo: menos de 50 ms por cálculo completo en un teléfono de gama media, para recalcular mientras se escribe. La simulación de 360 meses de 8 créditos es el tramo más pesado (unos 3.000 pasos); no requiere optimización especial.

## 5. Modo compatible y modo nativo

| Tema | Modo compatible (plantilla 2.2) | Modo nativo (propuesto) | Hallazgo |
|---|---|---|---|
| Pagador de cada gasto | Hay que registrar el aporte del tercero como ingreso | Pagador por partida y aporte implícito del tercero; indicadores personales aparte | H-12, RN-015 |
| Aporte para completar el fondo | Informativo, no se descuenta | Plan secuencial: primero el fondo, luego el reparto | H-01 |
| Bolsillo en partidas tipo bolsillo | Opcional | Obligatorio | H-02 |
| Cuotas de deuda en el flujo | 12 meses iguales | Hasta el mes de fin de cada deuda | H-03 |
| Seguros en la cuota | No se separan | Se separan | H-05 |
| Motor de deudas | 120 meses | Uno solo, horizonte configurable, FRECH y orden manual | H-06 |
| Escenarios del fondo | "Otro" se pierde solo en C | Se pierde en el escenario marcado por ingreso | H-07 |
| Seguro de vida | 10 años fijos | Años y gasto editables | H-10 |
| Avance del fondo | Frente a la meta completa | Frente a la completa y a la vigente | H-11 |
| Monedas | Base más USD; sin tasa, el importe vale 0 | Cualquier moneda en cualquier importe; sin tasa, pendiente y bloqueo de entrega | H-15, RN-017 |
| Condición de ingresos variables | Solo por tipo de cliente | Sugerida por tipo, editable | H-16 |

Qué correcciones entran al modo nativo lo decide el asesor (ver [07-preguntas-abiertas.md](07-preguntas-abiertas.md)). Cada corrección aprobada lleva un ADR. Las pruebas de oro corren siempre en modo compatible; el modo nativo tiene sus propias pruebas con valores esperados revisados por el asesor.

Los indicadores del Resumen se calculan igual que la plantilla en los dos modos (así la prueba de oro del caso España compara, por ejemplo, un ingreso anual de 15.710,46 EUR que incluye el aporte implícito de los padres). El modo nativo agrega indicadores personales: ingreso propio, gasto propio, aporte de terceros y tasa de ahorro sobre el ingreso propio.

## 6. Control de calidad automatizado

Antes de entregar un plan, `qualityChecks` evalúa los puntos verificables de la sección 10 del protocolo. Los bloqueantes impiden entregar; las advertencias se muestran y se pueden justificar con una nota.

| Control | Tipo |
|---|---|
| Ingreso - gasto - ahorro programado = sobrante (±0,01) | Bloqueante |
| Suma de aportes de bolsillos = aportes a bolsillos del presupuesto | Bloqueante |
| Reparto del saldo actual no supera lo disponible | Bloqueante |
| Meses sin ingreso cuadran o hay alerta de déficit con nota | Bloqueante |
| Ninguna partida con valor sin frecuencia, tipo o bolsillo | Bloqueante |
| Lista de pendientes vacía o cada punto con nota | Bloqueante |
| Deudas con restricción de abono marcadas cuando el tipo lo sugiere (hipotecario con FRECH, informal) | Advertencia |
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
| C1. Colombia (contratista con arriendos y meses sin ingreso) | Plantilla oficial llenada con los datos del libro del caso real de Colombia, anonimizados | Meses sin ingreso, seguridad social por mes, cobros, USD, pensión Colpensiones, patrimonio concentrado | **Construido** (702 entradas, 5.738 fórmulas; pendiente de revisión del asesor). Reproduce las cifras de la sección 15 salvo la inversión anual; contraste en `packages/engine/test/golden/README.md` |
| C2. España (estudiante, padres pagan, sueldo a ahorro) | Libro del caso real de España, anonimizado | Euro como base, pagador, costo de vida por niveles, perfil conservador, pensión desactivada | **Listo** (466 entradas, 5.851 fórmulas; revisado por el asesor) |
| C3. Plantilla vacía | `Plantilla_Asesoria_Financiera.xlsx` con fecha de corte fija (28/09/2026) | Valores por defecto, pendientes, divisiones entre cero | **Listo** (535 entradas, 5.738 fórmulas, sin errores) |
| C4. Deudas | Plantilla oficial con 6 a 8 deudas sintéticas inspiradas en el caso 15.1 del protocolo (FRECH, préstamo familiar a 0 %, ingreso en USD, carga de 64 %) | Deuda cara, avalancha, bola de nieve, restricciones de abono, más de 120 meses | Por construir |
| C5. Créditos | Plantilla de créditos con los mismos créditos de C4 y marcas de pago | 360 cuotas, FRECH, seguros, cuotas vencidas, panel, puente a Deudas | Por construir |
| C6. Ingreso variable y déficit | Plantilla oficial sintética | Ingreso base, aporte proporcional, alerta de déficit | Por construir |

Ninguno de los dos casos reales tiene deudas, por eso C4 y C5 son necesarios para cubrir los módulos de deudas y créditos.

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
| Compatibilidad Excel (`test/excel-compat/`) | `EDATE` con fin de mes, `DATEDIF` en años y meses, `NPER` y `PMT` con tasa cero, `ROUNDUP` con negativos |
| Propiedades (`test/properties/`, con fast-check) | Invariantes del control de calidad: sobrante = ingreso - gasto - ahorro; saldos de deuda nunca negativos; el reparto nunca supera lo disponible; el % en crecimiento siempre dentro del rango; resultados iguales con la misma entrada (determinismo) |
| Unitarias por módulo | Casos borde: frecuencia sin días, todos los meses en rojo, deuda que no acepta abonos, tasa 0 %, perfil sin responder |
| Rendimiento | Cálculo completo por debajo del objetivo de la sección 4 |

### 7.6 En integración continua

Las pruebas de oro corren en cada pull request. Si un cambio altera un valor esperado, la prueba falla; actualizar el esperado exige un ADR que explique la diferencia frente a la plantilla (regla 6 de `CLAUDE.md`).

## 8. Versionado

- `ENGINE_VERSION` sigue semver: mayor si cambia un resultado en modo compatible; menor si agrega salidas o cambia el modo nativo; parche si no cambia ningún resultado.
- Cada plan entregado guarda la versión del motor y los ids de los parámetros, para poder reproducir sus cifras.
