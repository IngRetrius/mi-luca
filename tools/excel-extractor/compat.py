"""Evalúa fórmulas sueltas en Microsoft Excel para las pruebas de compatibilidad del motor.

Uso:
    uv run --with openpyxl python tools/excel-extractor/compat.py <casos.json> <resultados.json>

casos.json es una lista de casos, cada uno con un identificador y una fórmula:
    {"id": "fin-de-mes", "formula": "=DATEDIF(DATE(2026,1,31),DATE(2026,2,28),\\"m\\")"}

Escribe cada fórmula en un libro en blanco, lo recalcula dentro de Excel con recalc.py y guarda
en resultados.json la versión de Excel, la fecha y el valor de cada caso. Los errores de Excel
quedan como texto ("#NUM!"). Números como JSON (doble precisión), fechas como "AAAA-MM-DD".
"""

import argparse
import json
import subprocess
import sys
import tempfile
from datetime import date, datetime
from pathlib import Path

import openpyxl

SHEET = "Casos"
RECALC = Path(__file__).with_name("recalc.py")


def plain(value):
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return value


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("cases", type=Path)
    parser.add_argument("target", type=Path)
    args = parser.parse_args()

    cases = json.loads(args.cases.read_text(encoding="utf-8"))
    ids = [case["id"] for case in cases]
    if len(set(ids)) != len(ids):
        print("Hay identificadores repetidos en los casos", file=sys.stderr)
        return 1

    with tempfile.TemporaryDirectory() as tmp:
        blank = Path(tmp) / "en-blanco.xlsx"
        book = openpyxl.Workbook()
        book.active.title = SHEET
        book.save(blank)

        edits = Path(tmp) / "cambios.json"
        edits.write_text(
            json.dumps(
                [{"sheet": SHEET, "cell": f"A{row}", "formula": case["formula"]} for row, case in enumerate(cases, 1)]
            ),
            encoding="utf-8",
        )
        recalculated = Path(tmp) / "recalculado.xlsx"
        # recalc.py exige una fecha de corte; aquí va a una celda que ninguna fórmula usa.
        result = subprocess.run(
            [sys.executable, str(RECALC), str(blank), str(recalculated), "--cutoff", date.today().isoformat(),
             "--cutoff-cell", f"{SHEET}!Z1", "--edits", str(edits)],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            print(result.stderr.strip(), file=sys.stderr)
            return 1
        version = result.stdout.split("Excel ", 1)[1].split(":", 1)[0]

        sheet = openpyxl.load_workbook(recalculated, data_only=True)[SHEET]
        rows = [
            {"id": case["id"], "formula": case["formula"], "value": plain(sheet[f"A{row}"].value)}
            for row, case in enumerate(cases, 1)
        ]

    output = {"excel": version, "generated": date.today().isoformat(), "results": rows}
    args.target.parent.mkdir(parents=True, exist_ok=True)
    args.target.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(rows)} casos evaluados con Excel {version}: {args.target}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
