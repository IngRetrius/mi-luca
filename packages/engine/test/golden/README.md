# Pruebas de oro

Cada caso vive en su propia carpeta con dos archivos generados desde un Excel anonimizado:

- `inputs.json`: las celdas editables (crema) del libro, traducidas al modelo de entrada del motor.
- `expected.json`: los valores calculados por Excel para cada indicador verificado, con la hoja y la celda de origen.

Criterio de aceptación: diferencia absoluta máxima de 0,01 en importes; tolerancias de porcentajes, fechas y textos en `docs/04-motor-de-calculo.md`.

Solo se admiten casos anonimizados. Los libros originales de clientes quedan en `referencia/casos/`, fuera de git.
