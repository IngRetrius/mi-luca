# Pruebas de oro

Cada caso vive en su carpeta, generada con `tools/excel-extractor/` (`recalc.py` y `golden.py`) desde un libro anonimizado y recalculado en Excel:

- `case.json`: caso, plantilla, fecha de corte y conteos.
- `inputs.json`: celdas de entrada (crema o ámbar) con valor, más las entradas del perfil de la plantilla (por ejemplo, la moneda base en `Listas!M2`), por hoja y celda.
- `expected.json`: todas las celdas con fórmula y el valor que calculó Excel, por hoja y celda.

Los valores quedan a nivel de celda. `adapters.ts` traduce las celdas a las entradas del motor: etiquetas de la plantilla a códigos del modelo (una etiqueta desconocida es un error). Las filas automáticas del presupuesto (6 a 12) no se leen de la plantilla: se calculan con los módulos de deudas, seguros y metas, en el orden de la hoja (una fila por cada fila de Metas, con 0 si la meta no tiene nombre).

| Prueba | Qué compara con Excel |
|---|---|
| `golden.test.ts` | Conteos de cada caso y conversión a moneda base de `Ingresos!F6:F13` |
| `incomes-budget.test.ts` | Ingresos (F:U de las filas 6 a 13, fila 14, `T20:U25`, `S17`, `E30:E32`), Presupuesto (G:I de las filas 6 a 87 y los totales de las filas 89 a 97) y `Resumen!C11:C13` |
| `goals-insurance-debts.test.ts` | Metas (F, J y K de las filas 6 a 10, `K11` y la calculadora `E17:E30`), Seguros (`I6:I16`, `H16`), Deudas (`D21`, `F21`) y el valor de las filas automáticas `Presupuesto!D6:D12` |

| Caso | Contenido | Estado |
|---|---|---|
| `c3-plantilla-vacia` | Plantilla oficial sin datos, fecha de corte 28/09/2026 | Listo |
| `c2-espana` | Caso real de España anonimizado (nombre, fecha de nacimiento con la misma edad, entidad, ocupación, salud y terceros), corte 28/09/2026 | Listo, revisado por el asesor el 28/09/2026 |
| `c7-metas-seguros` | Sintético sobre la plantilla oficial, corte 28/09/2026: los cambios están en `cambios.json` (metas con fecha, vencida, ya cubierta y repetida; calculadora de viaje con tasa de 4.000; seguros nuevos, cotizando, sin responder y que ya tiene; dos deudas). Sin ingresos ni partidas del cliente | Listo |
| `c1-colombia` | Caso real de Colombia (contratista con arriendos, sin deudas) llevado a la plantilla oficial y anonimizado (nombre, día de nacimiento, entidades, inmuebles, familiares, mascota, destino del viaje y conceptos de salud), corte 28/09/2026 | Construido el 28/09/2026; pendiente de revisión del asesor (pregunta A11) |

Criterio de aceptación: diferencia absoluta máxima de 0,01 en importes; tolerancias de porcentajes, fechas y textos en `docs/04-motor-de-calculo.md`.

Para regenerar C7: `recalc.py` con `--edits packages/engine/test/golden/c7-metas-seguros/cambios.json` y luego `golden.py` (sin `--forbid`: no tiene datos de clientes).

Solo se admiten casos anonimizados. Los libros originales de clientes quedan en `referencia/casos/`, fuera de git. Para agregar un caso: genera la carpeta y regístrala en `cases.ts`.

## Caso C1: cómo se llevó a la plantilla

El libro original no usa la plantilla oficial (hallazgo H-25), así que el caso se construyó sobre `Plantilla_Asesoria_Financiera.xlsx` con 186 cambios aplicados por `recalc.py`. Los importes, frecuencias, tipos y marcas de esencial son los del libro original; la tasa de cambio (3.100) y los precios del viaje son los del caso en septiembre de 2026 [I1, I4], no parámetros verificados del producto.

Decisiones tomadas al pasarlo a la plantilla (**Supuestos** hasta que el asesor lo revise):

1. **Seguridad social en 11 pagos:** se paga en enero (por diciembre, mes vencido) y no en febrero, como dicen la sección 15 del protocolo y las notas del libro original. La tabla del libro marca 12 pagos; esa es la causa de las diferencias de H-25.
2. **Fecha de nacimiento:** cambia solo el día. Se conservan la edad, el mes en que cumple 57 y el cálculo de semanas.
3. **Cuenta operativa:** su saldo queda como colchón (`Supuestos!C32`) y no se reparte en bolsillos, como en el libro original, que solo repartía el saldo de los bolsillos.
4. **Viaje internacional:** va en la hoja Metas con la calculadora, repetido cada 2 años. El transporte local (pase de 25 USD y taxis por 75 USD) queda en una sola línea de 100 USD.
5. **Aportes acumulados en la cooperativa:** tipo "Otro" en Patrimonio, según la regla de la plantilla (el libro los tenía como inversión). No cambia el total.
6. **Sin dato en el libro, se deja vacío:** prueba de realidad (queda pendiente), perfil de inversión, qué seguros tiene y qué inmueble genera el arriendo. Personas a cargo: 0.

## Contraste de C1 con la sección 15 del protocolo

| Cifra | Protocolo | C1 (Excel) | Celda |
|---|---|---|---|
| Ingreso anual | 90,8 millones | 90.800.000 | `Resumen!C11` |
| Gasto anual con bolsillos | 63,7 millones | 63.704.439 | `Resumen!C12` |
| Sobrante anual | 19,3 millones | 19.342.361 | `Resumen!C14` |
| Tasa de ahorro | 30 % | 29,84 % | `Resumen!C15` |
| Faltante de enero | 3,83 millones | 3.831.803,25 | `Resumen!C23` |
| Aporte mensual al bolsillo de meses sin ingreso | 348.346 | 348.345,75 | `Resumen!C24` |
| Fondo de emergencia | 8,64 millones | 8.642.900 | `Resumen!C21` |
| Regla de 6 meses | 31,9 millones | 31.852.219,5 | `Fondo emergencia!C22` |
| Viaje internacional | 4.290 USD (13,3 millones) | 4.289,88 USD (13.298.628) | `Metas!E25`, `Metas!E30` |
| Inversión del año del flujo | 19,5 millones | 15.671.180,5 | `Resumen!C25` |
| Semanas al cumplir 57 | unas 1.229 (requeridas 1.150) | 1.228,86 (requeridas 1.150) | `Resumen!C29`, `Pensión!C22` |
| Mesada neta, escenario medio | 2 a 3 millones | 2.474.904,22 | `Resumen!C31` |
| Patrimonio | 692 millones | 692.291.902 | `Resumen!C33` |
| Concentración en inmuebles y carro | 91 % | 91,00 % | `Resumen!C34` |

Única diferencia: la inversión del año. El protocolo invierte el 70 % del sobrante; la plantilla actual invierte el 50 % mientras la prueba de realidad esté pendiente (sección 6.2 del protocolo), y en este caso lo está. Con el 70 % daría 19.539.652,7.
