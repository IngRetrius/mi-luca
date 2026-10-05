# 0023. Diseño adaptable del celular al escritorio

- Estado: Aceptada (pedido del asesor del 04/10/2026)
- Fecha: 2026-10-04

## Contexto

La app se diseñó primero para el celular (`05-pantallas-y-flujos.md`, principio "Una mano"): todas las pantallas eran una columna de 448 px y las pruebas corrían solo en iPhone y Android. En la tableta y el escritorio, donde el asesor trabaja durante la asesoría, la ficha del cliente o el flujo del año quedaban en esa columna, con la mayor parte de la pantalla vacía. La PWA instalada estaba fija en vertical. El asesor pidió que la app sirva en todos los dispositivos.

## Decisión

- **Celular (menos de 768 px): sin cambios.** Una columna y la acción principal fija abajo.
- **Tableta (desde 768 px).** `Screen` crece a una columna de lectura de 672 px con márgenes de 32 px. La barra de acciones (`ScreenActions`) pone los botones en fila a la derecha, con su ancho natural y en el orden del código; un total, estado o error queda en su línea encima. El botón del asistente se levanta sobre esa barra en todos los anchos.
- **Escritorio (desde 1024 px).** Las pantallas de resumen usan `WideScreen` (hasta 1152 px) y ponen en rejilla lo que son elementos pares: la ficha del cliente en dos columnas (datos, análisis y seguimiento a la izquierda; cifras del plan e invitación a la derecha), el flujo con los 12 meses en tres columnas, el presupuesto con las categorías en dos, la lista de clientes y Mis datos en tarjetas. Los formularios siguen en la columna de lectura.
- **Listas en rejilla** con `gridList` y `gridListItem` (`ui-classes.ts`): un recuadro con divisores en el celular y tarjetas desde la tableta, sin celdas vacías.
- La PWA acepta cualquier orientación (`orientation: 'any'`).
- Sin colores, tipografías ni sombras nuevas: todo sale de los tokens de `packages/ui`.

## Consecuencias

- Las pruebas de extremo a extremo corren además en tableta (iPad) y escritorio (Chrome) para el diseño adaptable y el idioma (`adaptable.spec.ts`, `idioma.spec.ts`): ninguna pantalla pública se desplaza de lado entre 320 y 1440 px.
- Una pantalla nueva elige `Screen` (formulario o lectura) o `WideScreen` (resumen con elementos pares).
- En el escritorio la ficha deja de ser una lista larga: las cifras quedan a la vista junto a los módulos.

## Alternativas consideradas

- **Navegación lateral fija en el escritorio.** Útil con muchas pantallas, pero cambia la navegación de toda la app y el asesor ya llega a todo desde la ficha.
- **Ensanchar todas las pantallas por igual.** Más simple, pero los campos de un formulario de 1.000 px se leen peor y la vista del cambio queda lejos del campo.
- **Tablas en lugar de tarjetas para el flujo.** Más densas, pero obligan a desplazar de lado en el celular o a mantener dos marcados distintos.
