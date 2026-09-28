# 0001. Monorepo con pnpm y Turborepo

- Estado: Propuesta
- Fecha: 2026-09-28

## Contexto

El motor de cálculo se usa en el navegador, en el servidor y en los exportadores. Los tipos del dominio los comparten todos. Una sola persona mantiene el proyecto.

## Decisión

Un solo repositorio con pnpm workspaces: una app (`apps/web`) y paquetes con responsabilidad única (`engine`, `domain`, `ui`, `i18n`, `exporters`, `db`, `config`). Turborepo orquesta compilación y pruebas con caché.

## Consecuencias

- Un cambio en el dominio se prueba en todas sus capas en el mismo pull request.
- Las reglas de dependencia entre paquetes se hacen cumplir con lint (`docs/08-estructura-del-repositorio.md`).
- Hay algo más de configuración inicial que en una app única.

## Alternativas consideradas

- App única con carpetas: más simple al inicio, pero el motor quedaría mezclado con la app y sería fácil que importara cosas de Next.js.
- Varios repositorios: demasiada coordinación para una persona.
