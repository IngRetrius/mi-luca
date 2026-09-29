#!/usr/bin/env python3
"""Genera la migración que publica los textos legales aprobados (docs/legal/textos/).

Cada archivo .md lleva un comentario HTML inicial con `kind`, `country_code`, `version` y
`title`, y después el cuerpo tal como se mostrará en P-C02. El script se niega a generar la
migración si algún texto conserva un `[[POR DEFINIR` o si su estado no dice `aprobado`: un
texto publicado no se puede cambiar ni borrar una vez que tiene consentimientos.

Uso:
    python3 tools/legal-texts/build_migration.py            # comprueba y muestra qué publicaría
    python3 tools/legal-texts/build_migration.py --write    # escribe supabase/migrations/<fecha>_legal_texts_<versión>.sql
"""

from __future__ import annotations

import argparse
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TEXTS = ROOT / "docs" / "legal" / "textos"
MIGRATIONS = ROOT / "supabase" / "migrations"
KINDS = {"privacidad", "terminos", "tratamiento_datos", "datos_sensibles", "alcance_asesoria"}
HEADER = re.compile(r"\A<!--(.*?)-->\s*", re.S)


def parse(path: Path) -> dict[str, str]:
    raw = path.read_text(encoding="utf-8")
    match = HEADER.match(raw)
    if not match:
        raise ValueError(f"{path.name}: falta el comentario inicial con los metadatos")
    meta: dict[str, str] = {}
    for line in match.group(1).strip().splitlines():
        key, _, value = line.partition(":")
        meta[key.strip()] = value.strip()
    for key in ("kind", "version", "title", "estado"):
        if not meta.get(key):
            raise ValueError(f"{path.name}: falta `{key}` en los metadatos")
    if meta["kind"] not in KINDS:
        raise ValueError(f"{path.name}: `kind` desconocido: {meta['kind']}")
    meta["body"] = raw[match.end() :].strip()
    meta["file"] = path.name
    return meta


def problems(text: dict[str, str]) -> list[str]:
    found = []
    if "[[POR DEFINIR" in text["body"] or "[[POR DEFINIR" in text["title"]:
        found.append("conserva datos [[POR DEFINIR]]")
    if not text["estado"].lower().startswith("aprobado"):
        found.append(f"estado «{text['estado']}» (debe empezar por «aprobado»)")
    return found


def dollar_quote(value: str) -> str:
    tag = "texto"
    while f"${tag}$" in value:
        tag += "_"
    return f"${tag}${value}${tag}$"


def row_prefix(text: dict[str, str]) -> str:
    """Comienzo de la fila de un texto: tipo, país y versión, que lo identifican en la tabla."""
    country = f"'{text['country_code']}'" if text.get("country_code") else "null"
    return f"  ('{text['kind']}', {country}, {dollar_quote(text['version'])}, "


def already_published(text: dict[str, str]) -> bool:
    """La versión ya está en alguna migración: publicarla otra vez violaría la clave única."""
    prefix = row_prefix(text)
    return any(prefix in path.read_text(encoding="utf-8") for path in MIGRATIONS.glob("*.sql"))


def sql(texts: list[dict[str, str]]) -> str:
    rows = []
    for text in texts:
        rows.append(
            f"{row_prefix(text)}"
            f"{dollar_quote(text['title'])},\n   {dollar_quote(text['body'])})"
        )
    files = ", ".join(t["file"] for t in texts)
    return (
        "-- Textos legales aprobados por el responsable del tratamiento (decisión A7), generados por\n"
        f"-- tools/legal-texts/build_migration.py desde docs/legal/textos/ ({files}).\n"
        "-- Un texto publicado no se cambia: una corrección es una versión nueva.\n\n"
        "insert into public.legal_texts (kind, country_code, version, title, body_markdown) values\n"
        + ",\n".join(rows)
        + ";\n"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--write", action="store_true", help="escribe la migración")
    args = parser.parse_args()

    texts = []
    for path in sorted(TEXTS.glob("*.md")):
        if path.name == "README.md":
            continue
        text = parse(path)
        if already_published(text):
            print(f"{text['file']}: v{text['version']} ya publicada")
        else:
            texts.append(text)
    if not texts:
        print("\nNada nuevo que publicar.")
        return 0
    blocked = False
    for text in texts:
        issues = problems(text)
        status = "; ".join(issues) if issues else "listo"
        blocked = blocked or bool(issues)
        print(f"{text['file']}: {text['kind']} {text.get('country_code') or 'común'} v{text['version']} — {status}")
    if blocked:
        print("\nNo se genera la migración: completa y aprueba los textos primero.", file=sys.stderr)
        return 1
    versions = sorted({t["version"] for t in texts})
    if not args.write:
        print("\nTodo listo. Vuelve a ejecutar con --write para escribir la migración.")
        return 0
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    name = f"{stamp}_legal_texts_{'_'.join(v.replace('.', '_') for v in versions)}.sql"
    (MIGRATIONS / name).write_text(sql(texts), encoding="utf-8")
    print(f"\nEscrita supabase/migrations/{name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
