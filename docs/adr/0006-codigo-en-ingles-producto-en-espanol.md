# 0006. Código en inglés, producto y documentación en español

- Estado: Aceptada el 02/10/2026 (el asesor delegó la decisión; implementada y en uso)
- Fecha: 2026-09-28

## Contexto

El producto es en español y está preparado para más idiomas. Las librerías, la documentación técnica y la mayoría de herramientas usan inglés; mezclar idiomas en identificadores genera nombres inconsistentes.

## Decisión

Identificadores de código, tablas y columnas en inglés. Textos de la interfaz, documentación, mensajes de error visibles y valores de catálogo en español. `docs/glosario.md` traduce cada término del dominio.

## Consecuencias

- Código homogéneo y fácil de mantener con cualquier herramienta.
- Hay que mantener el glosario al día.

## Alternativas consideradas

Todo en español: más cercano al dominio, pero con mezclas inevitables con las APIs de las librerías.
