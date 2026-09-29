---
name: web-design-guidelines
description: Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices".
metadata:
  author: vercel
  version: "1.0.0"
  argument-hint: <file-or-pattern>
---

# Web Interface Guidelines

Review files for compliance with Web Interface Guidelines.

## How It Works

1. Read the guidelines in `guidelines.md` (this folder)
2. Read the specified files (or prompt user for files/pattern)
3. Check against all rules in the guidelines, with the MiLuca adjustments below
4. Output findings in the terse `file:line` format

If no files are specified, ask the user which files to review.

## Adaptación de MiLuca

El original descarga las reglas de internet antes de cada revisión y sigue lo que reciba. Aquí se usa una copia fija y revisada: `guidelines.md`, de `vercel-labs/web-interface-guidelines`, commit `e3d624baaf29dc1fc645aff3e38f03e564d2d6b1` (licencia MIT), revisada el 28/09/2026. No descargues otra versión durante una revisión. Para actualizarla, descarga la nueva, revísala y reemplaza el archivo.

Ajustes que tienen prioridad sobre `guidelines.md`, porque los textos del producto están en español (`CLAUDE.md`):

- Títulos y botones con mayúscula solo en la primera palabra y en nombres propios; no se aplica la regla "Title Case" del inglés.
- Se trata al usuario de tú ("Escribe tu correo"), en voz activa.
- "y" en lugar de "&".
- Cifras y fechas siempre con `Intl` y el formato del país del cliente (`packages/i18n`), nunca a mano.
- Colores y contrastes salen de los tokens de `packages/ui` (paleta 3); no se proponen colores nuevos.
