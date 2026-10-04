# packages/engine

Motor de cálculo puro. Recibe los datos de un cliente y los parámetros de su país, y devuelve todos los resultados que hoy calcula la plantilla de Excel.

## Reglas

- Funciones puras: sin React, Next.js, Supabase, red ni sistema de archivos.
- Determinista: la fecha de corte es un dato de entrada. Nunca se usa la fecha del sistema.
- Doble precisión (`number`), igual que Excel. Solo se redondea al presentar.
- Cada submódulo replica una hoja de la plantilla y documenta qué celdas reproduce.

## Organización

| Carpeta | Responsabilidad |
|---|---|
| `src/excel/` | Funciones con la semántica exacta de Excel: `EDATE`, `DATEDIF`, `NPER`, `PMT`, `ROUNDUP`, `MINIFS`, `MAXIFS`, `SUMPRODUCT`. |
| `src/normalization/` | Frecuencias y veces al año. |
| `src/incomes/` a `src/monthly-control/` | Un submódulo por hoja o bloque del dominio. |
| `test/golden/` | Pruebas de oro: casos anonimizados extraídos de Excel con sus valores esperados. |
| `test/native/` | Pruebas del modo nativo con datos de los casos de oro y valores revisados por el asesor. |
| `test/excel-compat/` | Pruebas de las funciones de `src/excel/` contra resultados de Excel. |
| `test/properties/` | Pruebas de propiedades (invariantes del control de calidad del protocolo). |

El orden de cálculo y el catálogo de funciones están en `docs/04-motor-de-calculo.md`.

## Estado

| Módulo | Qué hay | Pruebas de oro |
|---|---|---|
| (raíz) | `compute` (caso completo hasta F2), `keyFigures`, `diffKeyFigures` | `Resumen!C11:C15` en los cuatro casos |
| `excel` | `datedifMonths`, `parseIsoDate` | Contra Excel en `test/excel-compat/` |
| `currency` | `toBase`, `toBaseCompat`, `missingRates` | `Ingresos!F6:F13` |
| `normalization` | `timesPerYear` | `Presupuesto!G6:G87` |
| `incomes` | `computeIncomes`, `socialSecurityPayments`, `baseIncome`, `impliedThirdPartyIncome` (nativo) | Hoja Ingresos y `Resumen!C11` |
| `budget` | `computeBudget` (con totales por pagador), `automaticRows` | Hoja Presupuesto (con las filas 6 a 12 calculadas) y `Resumen!C12:C13` |
| `cost-of-living` | `computeCostOfLiving` (nuevo, no está en la plantilla) | Hoja Costo de vida de C2 |
| `debts` | `debtTotals` (la clasificación y la simulación llegan en F4) | `Deudas!D21`, `F21` |
| `goals` | `computeGoals`, `tripCost` | `Metas!F6:K11`, `E17:E30` |
| `insurance` | `computeInsurance` (la suma asegurada de vida llega en F5) | `Seguros!I6:I16`, `H16` |

| `summary` | `personalIndicators` (nativo, ADR 0010) | Modo nativo con los datos de C2: `Resumen!C11` y tasa personal de 100 % |

Lo marcado "nativo" no existe en la plantilla; el resto, en modo compatible con la plantilla 2.2.
