# 0007. Modo compatible con la plantilla y modo nativo

- Estado: Propuesta (pendiente de las preguntas B1 a B4)
- Fecha: 2026-09-28

## Contexto

La plantilla es la fuente de verdad de los cálculos y la prueba de oro exige reproducirla. El análisis encontró posibles errores y simplificaciones (hallazgos H-01 a H-25) y el caso de España exigió conceptos que la plantilla no tiene (pagador, costo de vida por niveles).

## Decisión

El motor tiene dos modos. El modo compatible reproduce la plantilla 2.2 tal cual y es el que usan las pruebas de oro. El modo nativo aplica las correcciones aprobadas, cada una con su ADR y sus pruebas con valores revisados por el asesor. Los indicadores del Resumen se calculan igual en los dos modos; el nativo agrega indicadores personales.

## Consecuencias

- La paridad con Excel se puede demostrar siempre.
- Las mejoras no quedan bloqueadas por la plantilla.
- Cada diferencia entre modos está documentada y probada.

## Alternativas consideradas

- Solo reproducir la plantilla: arrastra los errores encontrados.
- Solo el modelo nuevo: no se podría demostrar que los cálculos son correctos frente al Excel que el asesor ya validó.
