"""Genera un inventario compacto de fórmulas por hoja, en Markdown.

Agrupa las fórmulas que se repiten en notación relativa: primero por columnas contiguas
de una misma fila y luego por filas contiguas con la misma estructura. Así una tabla de
360 cuotas ocupa una sola línea.

Uso:
    uv run --with openpyxl python tools/excel-extractor/inventory.py <libro.xlsx> <salida.md>
"""

import re
import sys
from pathlib import Path

import openpyxl
from openpyxl.utils import column_index_from_string

REF = re.compile(r"(\$?)([A-Z]{1,3})(\$?)(\d+)(?![\w(])")
# Números sueltos (no parte de una referencia): índices de mes o de cuota que cambian por fila.
LITERAL = re.compile(r"(?<![A-Z\d\]\[.])\d+(?:\.\d+)?(?![\d\]])")
EDITABLE_FILLS = {"FFFFF8E6": "editable", "FFFDE9B8": "por confirmar"}


def relative(formula: str, col: int, row: int) -> str:
    def sub(m):
        cabs, c, rabs, r = m.groups()
        ci, ri = column_index_from_string(c), int(r)
        rs = f"R{ri}" if rabs else f"R[{ri - row}]"
        cs = f"C{ci}" if cabs else f"C[{ci - col}]"
        return rs + cs

    return LITERAL.sub("n", REF.sub(sub, formula))


def formula_text(value):
    if isinstance(value, str) and value.startswith("="):
        return value
    text = getattr(value, "text", None)
    if isinstance(text, str):
        return text if text.startswith("=") else "=" + text
    return None


def cell_fill(cell):
    fg = cell.fill.fgColor if cell.fill else None
    return fg.rgb if fg is not None and fg.type == "rgb" else None


def render_row(cells, row):
    parts, signature, run, prev = [], [], [], None

    def flush():
        if not run:
            return
        first, last = run[0][1], run[-1][1]
        rng = first.coordinate if len(run) == 1 else f"{first.coordinate}:{last.coordinate}"
        f = run[0][2].replace("|", "\\|")
        parts.append(f"`{rng}` `{f}`")

    for col, cell in cells:
        f = formula_text(cell.value)
        if f:
            key = relative(f, col, row)
            signature.append((col, key))
            if run and key == prev and col == run[-1][0] + 1:
                run.append((col, cell, f))
                continue
            flush()
            run, prev = [(col, cell, f)], key
        else:
            flush()
            run, prev = [], None
            kind = EDITABLE_FILLS.get(cell_fill(cell))
            if cell.value is None and kind:
                signature.append((col, "E"))
                parts.append(f"`{cell.coordinate}` [{kind}]")
            elif cell.value is not None:
                signature.append((col, "V"))
                text = str(cell.value).replace("|", "\\|").replace("\n", " ")
                tag = f" [{kind}]" if kind else ""
                parts.append(f"`{cell.coordinate}`{tag} {text[:90]}")
    flush()
    return parts, tuple(signature)


def main(src: Path, out: Path) -> None:
    wb = openpyxl.load_workbook(src)
    lines = [
        f"# Inventario de fórmulas: {src.name}",
        "",
        "Generado con `tools/excel-extractor/inventory.py`. Las filas contiguas con la misma estructura de fórmulas "
        "se muestran una sola vez con su rango (por ejemplo `R13-20`). Las fórmulas se muestran tal como aparecen en "
        "la primera celda del grupo; dentro de un grupo pueden cambiar las constantes numéricas (por ejemplo, el "
        "número de mes o de cuota). [editable] marca celdas crema; [por confirmar], celdas ámbar.",
        "",
    ]
    seen = {}
    for ws in wb.worksheets:
        lines += [f"## {ws.title}", ""]
        fingerprint = tuple(
            (c.coordinate, relative(formula_text(c.value) or "", c.column, c.row).replace(ws.title, "{hoja}"))
            for row in ws.iter_rows() for c in row if formula_text(c.value)
        )
        if fingerprint and fingerprint in seen:
            lines += [f"Idéntica a la hoja {seen[fingerprint]}: mismas celdas y mismas fórmulas.", ""]
            continue
        seen[fingerprint] = ws.title
        rows = {}
        for row in ws.iter_rows():
            for c in row:
                if c.value is not None or EDITABLE_FILLS.get(cell_fill(c)):
                    rows.setdefault(c.row, []).append((c.column, c))
        groups, last_sig, start, last_row, last_parts = [], None, None, None, None
        for r in sorted(rows):
            parts, sig = render_row(sorted(rows[r], key=lambda t: t[0]), r)
            if sig == last_sig and last_row is not None and r == last_row + 1:
                last_row = r
                continue
            if last_parts is not None:
                groups.append((start, last_row, last_parts))
            start, last_row, last_sig, last_parts = r, r, sig, parts
        if last_parts is not None:
            groups.append((start, last_row, last_parts))
        for s, e, p in groups:
            label = f"R{s}" if s == e else f"R{s}-{e}"
            lines.append(f"- **{label}**: " + " · ".join(p))
        lines.append("")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(lines))


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(Path(sys.argv[1]), Path(sys.argv[2]))
