# 0013. Meses para pagar una deuda sin depender de la configuración regional de Excel

- Estado: Aceptada (decisión de criterio delegada por el asesor, ADR 0011)
- Fecha: 2026-10-03

## Contexto

La hoja Deudas cuenta los meses para pagar cada deuda con `COUNTIF(E37:DT37,">0.5")+1` (`Deudas!E86:E93`, y de ahí `L13:L20`, `M13:M20`, `C25` y `Resumen!C19`). El criterio `">0.5"` es un texto: Excel lo interpreta con el separador decimal del equipo. Con coma decimal, que es lo normal en Colombia y en España, `0.5` no es un número, el criterio no cuenta nada y la plantilla da **1 mes** para toda deuda que se paga dentro de los 120 meses. La fecha de salida de cada deuda y la de la deuda cara quedan en el primer mes del plan (hallazgo H-28).

Se comprobó en Excel 16.113.3 para macOS con configuración regional de Colombia el 03/10/2026: sobre los valores 1, 2, 0,3 y 0,7, `COUNTIF(rango,">0.5")` da 0 y `COUNTIF(rango,">"&0.5)` da 3. En el caso C6, Excel da 1 mes para un vehículo que la simulación de la misma hoja salda en el mes 13. La plantilla de créditos usa el mismo criterio (ver abajo).

## Decisión

El motor cuenta los meses con saldo de más de 0,5 y suma uno, que es lo que da la plantilla en un Excel con punto decimal, en los dos modos. Las pruebas de oro no comparan `E86:E93`, `L13:L20`, `M13:M20`, `C25` ni `Resumen!C19` con el valor guardado por Excel: calculan el esperado con los saldos mes a mes que calculó Excel (`E37:DT80`), que no dependen de la configuración regional, y con `EDATE` desde `Deudas!C11`.

Para el Excel del asesor, la corrección es cambiar `">0.5"` por `">"&0.5` en `Deudas!E86:E93` y en las fórmulas equivalentes de la plantilla de créditos.

## Plantilla de créditos

En la plantilla de créditos el efecto es mayor: con coma decimal, `SUMIFS(..., ">0.5")` no suma las cuotas al pago total del plan (`'Plan de pago'!C8` queda solo con el extra) y `COUNTIFS(..., ">0.5", ...)` le da el lugar 1 a todos los créditos (`K12:K19`), así que el plan de pago y los hitos no sirven. El caso de oro C5 se genera con la corrección aplicada a las 41 fórmulas que usan el criterio (33 en Plan de pago y 8 en Panel), como quedaría la plantilla corregida, y el motor se compara con ese libro.

## Consecuencias

- La plataforma muestra la fecha de salida real de cada deuda y de la deuda cara, aunque el Excel del asesor muestre el primer mes.
- La diferencia con el Excel del asesor está documentada; desaparece si corrige la plantilla.
- El resto de la simulación (saldos, abonos, intereses, "Más de 120") se compara celda a celda con Excel.

## Alternativas consideradas

- Reproducir el 1 en modo compatible: daría una fecha de salida falsa, y el resultado de la plantilla depende del equipo donde se abra.
- Recalcular los casos con un Excel con punto decimal: no cambia el Excel que usa el asesor y obliga a cambiar la configuración del equipo para cada caso.
