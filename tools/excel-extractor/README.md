# excel-extractor

Herramientas para leer las plantillas de Excel y generar los casos de prueba de oro del motor.

| Script | Qué hace |
|---|---|
| `extract.py` | Volcado completo de un libro: celdas, fórmulas, valores calculados, validaciones y nombres definidos |
| `inventory.py` | Inventario compacto de fórmulas por hoja (el de `docs/anexos/inventario-formulas/`) |
| `recalc.py` | Aplica cambios a una copia del libro, fija la fecha de corte y la recalcula en Microsoft Excel para macOS |
| `golden.py` | Extrae de un libro recalculado las entradas y los valores esperados de un caso de oro |
| `compat.py` | Evalúa fórmulas sueltas en Excel para las pruebas de `packages/engine/test/excel-compat/` |

## Casos de prueba de oro

```bash
# 1. Copia recalculada con fecha de corte fija (y cambios de anonimización, si los hay)
python3 tools/excel-extractor/recalc.py referencia/Plantilla_Asesoria_Financiera.xlsx \
  tools/excel-extractor/salida/c3-plantilla-vacia.xlsx --cutoff 2026-09-28 [--edits cambios.json]

# 2. Entradas y valores esperados dentro del paquete del motor
uv run --with openpyxl python tools/excel-extractor/golden.py \
  tools/excel-extractor/salida/c3-plantilla-vacia.xlsx packages/engine/test/golden/c3-plantilla-vacia \
  --case c3-plantilla-vacia --template Plantilla_Asesoria_Financiera.xlsx [--forbid terminos.txt]
```

- `recalc.py` trabaja dentro de Excel (no guarda con openpyxl) sobre una copia con nombre único, sin tocar otros libros abiertos. La primera vez, macOS pide permiso para que la terminal o VS Code controle Excel.
- Validación del método (28/09/2026): recalculando la plantilla con la fecha en que se guardó, las 5.738 fórmulas coincidieron exactamente con los valores que Excel había guardado.
- `golden.py` falla si la fecha de corte es una fórmula, si hay errores de Excel o si aparece un término de `--forbid`. Ese archivo, con los nombres reales y las entidades del cliente, vive en `referencia/casos/` (fuera de git).
- Los libros de `salida/` y los archivos de cambios de casos reales no se suben (`.gitignore`).

## Volcado e inventario

```bash
uv run --with openpyxl python tools/excel-extractor/extract.py referencia/Plantilla_Asesoria_Financiera.xlsx <carpeta_salida>
uv run --with openpyxl python tools/excel-extractor/inventory.py referencia/Plantilla_Asesoria_Financiera.xlsx docs/anexos/inventario-formulas/plantilla-asesoria.md
```

Nunca ejecutes estas herramientas sobre `referencia/casos/` con salida dentro del repositorio, salvo `golden.py` sobre un libro ya anonimizado y con `--forbid`.
