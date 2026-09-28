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
| `src/pension/co/`, `src/pension/es/` | Un módulo de pensión por país. España arranca como módulo informativo. |
| `test/golden/` | Pruebas de oro: casos anonimizados extraídos de Excel con sus valores esperados. |
| `test/excel-compat/` | Pruebas de las funciones de `src/excel/` contra resultados de Excel. |
| `test/properties/` | Pruebas de propiedades (invariantes del control de calidad del protocolo). |

El orden de cálculo y el catálogo de funciones están en `docs/04-motor-de-calculo.md`.
