# excel-extractor

Lee un libro de Excel dos veces con openpyxl: una para las fórmulas y otra con `data_only=True` para los valores que Excel guardó al recalcular.

## Uso

```bash
# Volcado completo (celdas, metadatos, inventario plano)
uv run --with openpyxl python tools/excel-extractor/extract.py referencia/Plantilla_Asesoria_Financiera.xlsx <carpeta_salida>

# Inventario compacto por hoja (agrupa fórmulas repetidas)
uv run --with openpyxl python tools/excel-extractor/inventory.py referencia/Plantilla_Asesoria_Financiera.xlsx docs/anexos/inventario-formulas/plantilla-asesoria.md
```

Nunca ejecutes estas herramientas sobre `referencia/casos/` con salida dentro del repositorio: esos libros tienen datos de clientes.
