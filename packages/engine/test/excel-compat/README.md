# Compatibilidad con Excel

Pruebas de las funciones de `src/excel/` contra resultados calculados por Microsoft Excel.

Cada función tiene dos archivos:

- `<función>.cases.json`: los casos, cada uno con su identificador, sus argumentos y la fórmula de Excel.
- `<función>.excel.json`: lo que devolvió Excel para cada caso, con la versión y la fecha. Los errores quedan como texto (`#NUM!`).

Para regenerar los resultados, en el equipo con Excel:

```bash
uv run --with openpyxl python tools/excel-extractor/compat.py \
  packages/engine/test/excel-compat/datedif.cases.json packages/engine/test/excel-compat/datedif.excel.json
```

| Función | Casos | Excel |
|---|---|---|
| `datedifMonths` (`DATEDIF(inicio, fin, "m")`) | 18: fin de mes, bisiestos, cambio de año y fecha final anterior (#NUM!) | 16.113.3, 01/10/2026 |
