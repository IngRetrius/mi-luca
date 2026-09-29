# Pruebas de oro

Cada caso vive en su carpeta, generada con `tools/excel-extractor/` (`recalc.py` y `golden.py`) desde un libro anonimizado y recalculado en Excel:

- `case.json`: caso, plantilla, fecha de corte y conteos.
- `inputs.json`: celdas de entrada (crema o ámbar) con valor, más las entradas del perfil de la plantilla (por ejemplo, la moneda base en `Listas!M2`), por hoja y celda.
- `expected.json`: todas las celdas con fórmula y el valor que calculó Excel, por hoja y celda.

Los valores quedan a nivel de celda. La traducción al modelo del motor la hace el mapa de celdas (`cell-map.ts`, fase 2; ver `docs/04-motor-de-calculo.md`, 7.4). Mientras tanto, `golden.test.ts` compara con Excel lo que el motor ya calcula (hoy, la conversión a moneda base de `Ingresos!F6:F13`).

| Caso | Contenido | Estado |
|---|---|---|
| `c3-plantilla-vacia` | Plantilla oficial sin datos, fecha de corte 28/09/2026 | Listo |
| `c2-espana` | Caso real de España anonimizado | Pendiente de revisión del asesor |
| `c1-colombia` | Caso real de Colombia llevado a la plantilla oficial y anonimizado | Por construir |

Criterio de aceptación: diferencia absoluta máxima de 0,01 en importes; tolerancias de porcentajes, fechas y textos en `docs/04-motor-de-calculo.md`.

Solo se admiten casos anonimizados. Los libros originales de clientes quedan en `referencia/casos/`, fuera de git. Para agregar un caso: genera la carpeta y regístrala en `cases.ts`.
