"""Prepara un libro para una prueba de oro: aplica cambios, fija la fecha de corte y lo recalcula
en Microsoft Excel para macOS.

Uso:
    python3 tools/excel-extractor/recalc.py <entrada.xlsx> <salida.xlsx> --cutoff 2026-09-28
        [--cutoff-cell "Supuestos!C12"] [--edits cambios.json]

cambios.json es una lista de cambios, cada uno con hoja, celda y un solo contenido:
    {"sheet": "Supuestos", "cell": "C7", "value": "Cliente Colombia"}
    {"sheet": "Supuestos", "cell": "C8", "date": "1990-05-01"}
    {"sheet": "Ingresos", "cell": "E6", "formula": "=1000*12"}
    {"sheet": "Ingresos", "cell": "C9", "value": null}          (vacía la celda)

Todo el trabajo ocurre dentro de Excel (no se guarda con openpyxl, que pierde metadatos de
fórmulas). El libro se copia con un nombre único a la carpeta de Excel, para que no pida permisos
de archivo ni choque con un libro abierto del mismo nombre. No se usa "calculate full", porque
recalcula todos los libros abiertos: los cambios se aplican con el cálculo automático activo, que
actualiza todas las celdas dependientes, y luego se calcula cada hoja del libro dos veces. Si algo
falla, la copia se cierra sin guardar.
"""

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
import uuid
from datetime import date
from pathlib import Path

EXCEL_TMP = Path.home() / "Library/Containers/com.microsoft.Excel/Data/tmp"
EXCEL_EPOCH = date(1899, 12, 30)


def excel_serial(iso: str) -> int:
    return (date.fromisoformat(iso) - EXCEL_EPOCH).days


def applescript_string(text: str) -> str:
    return '"' + text.replace("\\", "\\\\").replace('"', '\\"') + '"'


def edit_line(edit: dict) -> str:
    sheet, cell = edit["sheet"], edit["cell"]
    target = f"range {applescript_string(cell)} of worksheet {applescript_string(sheet)} of wb"
    kinds = [k for k in ("value", "date", "formula") if k in edit]
    if len(kinds) != 1:
        raise ValueError(f"{sheet}!{cell}: cada cambio lleva exactamente uno de value, date o formula")
    kind = kinds[0]
    if kind == "formula":
        return f"set formula of {target} to {applescript_string(edit['formula'])}"
    if kind == "date":
        return f"set value of {target} to {excel_serial(edit['date'])}"
    value = edit["value"]
    if value is None:
        return f"clear contents {target}"
    if isinstance(value, bool):
        return f"set value of {target} to {'true' if value else 'false'}"
    if isinstance(value, (int, float)):
        return f"set value of {target} to {repr(value)}"
    return f"set value of {target} to {applescript_string(str(value))}"


def build_script(work_in: Path, work_out: Path, edits: list[dict]) -> str:
    lines = "\n        ".join(edit_line(e) for e in edits)
    return f"""
set inPath to (POSIX file {applescript_string(str(work_in))}) as text
set outPath to (POSIX file {applescript_string(str(work_out))}) as text
tell application "Microsoft Excel"
    set display alerts to false
    set previousMode to calculation
    open workbook workbook file name inPath update links do not update links
    set wb to workbook {applescript_string(work_in.name)}
    try
        set calculation to calculation automatic
        {lines}
        repeat 2 times
            repeat with i from 1 to (count of worksheets of wb)
                calculate (worksheet i of wb)
            end repeat
        end repeat
        save workbook as wb filename outPath file format Excel XML file format
        close workbook {applescript_string(work_out.name)} saving no
    on error errorMessage number errorNumber
        try
            close wb saving no
        end try
        set calculation to previousMode
        error errorMessage number errorNumber
    end try
    set calculation to previousMode
    return version
end tell
"""


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("source", type=Path)
    parser.add_argument("target", type=Path)
    parser.add_argument("--cutoff", required=True, help="Fecha de corte fija, AAAA-MM-DD")
    parser.add_argument("--cutoff-cell", default="Supuestos!C12")
    parser.add_argument("--edits", type=Path)
    args = parser.parse_args()

    sheet, cell = args.cutoff_cell.split("!")
    edits = [{"sheet": sheet, "cell": cell, "date": args.cutoff}]
    if args.edits:
        edits += json.loads(args.edits.read_text(encoding="utf-8"))

    EXCEL_TMP.mkdir(parents=True, exist_ok=True)
    token = uuid.uuid4().hex[:12]
    work_in = EXCEL_TMP / f"miluca-oro-{token}.xlsx"
    work_out = EXCEL_TMP / f"miluca-oro-{token}-recalculado.xlsx"
    shutil.copyfile(args.source, work_in)
    try:
        with tempfile.NamedTemporaryFile("w", suffix=".applescript", encoding="utf-8", delete=False) as f:
            f.write(build_script(work_in, work_out, edits))
            script = Path(f.name)
        result = subprocess.run(["osascript", str(script)], capture_output=True, text=True, timeout=600)
        script.unlink()
        if result.returncode != 0:
            print(f"Excel devolvió un error:\n{result.stderr.strip()}", file=sys.stderr)
            return 1
        args.target.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(work_out, args.target)
    finally:
        work_in.unlink(missing_ok=True)
        work_out.unlink(missing_ok=True)

    print(f"Recalculado con Excel {result.stdout.strip()}: {args.target} ({len(edits)} cambios)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
