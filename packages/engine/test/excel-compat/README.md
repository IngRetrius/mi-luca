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

| Función                                       | Casos                                                                     | Excel                |
| --------------------------------------------- | ------------------------------------------------------------------------- | -------------------- |
| `datedifMonths` (`DATEDIF(inicio, fin, "m")`) | 18: fin de mes, bisiestos, cambio de año y fecha final anterior (#NUM!)   | 16.113.3, 01/10/2026 |
| `edate` (`EDATE(inicio, meses)`)              | 13: fin de mes, bisiestos, cambio de año, meses negativos y fraccionarios | 16.113.3, 02/10/2026 |
| `roundUp` (`ROUNDUP(valor, decimales)`)       | 11: exactos, negativos, decimales positivos y negativos, y 0,1 * 3 * 10   | 16.113.3, 02/10/2026 |
| `nper` (`NPER(tasa, -cuota, saldo)`)          | 10: tarjeta, vehículo, plazos largos, tasa muy baja y cero, cuota igual o menor que el interés (#NUM!) | 16.113.3, 03/10/2026 |
| `pmt` (`PMT(tasa, periodos, -saldo)`)          | 7: créditos de 1 a 240 cuotas, tasa muy baja, tasa alta y cero | 16.113.3, 03/10/2026 |
