# Anexos

| Archivo | Contenido |
|---|---|
| [inventario-formulas/plantilla-asesoria.md](inventario-formulas/plantilla-asesoria.md) | Todas las celdas con texto, fórmula o dato editable de las 17 hojas de `Plantilla_Asesoria_Financiera.xlsx`, agrupadas por patrón |
| [inventario-formulas/plantilla-creditos.md](inventario-formulas/plantilla-creditos.md) | Lo mismo para `Plantilla_Creditos.xlsx` (las hojas Crédito 2 a 8 se remiten a Crédito 1, porque son idénticas) |

Se regeneran con:

```bash
uv run --with openpyxl python tools/excel-extractor/inventory.py referencia/Plantilla_Asesoria_Financiera.xlsx docs/anexos/inventario-formulas/plantilla-asesoria.md
uv run --with openpyxl python tools/excel-extractor/inventory.py referencia/Plantilla_Creditos.xlsx docs/anexos/inventario-formulas/plantilla-creditos.md
```

Los inventarios solo se generan a partir de las plantillas vacías. Nunca a partir de libros de clientes.
