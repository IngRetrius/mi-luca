---
paths:
  - "apps/web/src/**/*.{ts,tsx,css}"
  - "apps/web/public/**/*"
  - "packages/ui/src/**/*.ts"
  - "packages/i18n/messages/**/*.json"
  - "tests/e2e/**/*.ts"
---

# Trabajo de frontend: usa las skills

Esta regla se carga al abrir archivos de interfaz. Aplica a toda tarea que cree o cambie pantallas, componentes, estilos, textos visibles o tokens de diseño.

## Antes de escribir código

Invoca con la herramienta Skill, en la misma tarea y antes de la primera edición, las skills de `.claude/skills/`. Leerlas de memoria no cuenta:

| Skill | Cuándo |
|---|---|
| `vercel-react-best-practices` | Siempre que toques componentes, páginas, acciones de servidor o carga de datos |
| `frontend-ui-engineering` | Siempre que toques interfaz: accesibilidad, estados vacíos, de carga y de error, diseño adaptable |
| `vercel-composition-patterns` | Al crear componentes reutilizables o si un componente acumula props booleanas o variantes |
| `frontend-design` | Solo si la tarea trae decisiones visuales nuevas, siempre dentro de los tokens de `packages/ui` |

## Antes de darlo por terminado

1. Invoca `web-design-guidelines` sobre los archivos de cada pantalla nueva o cambiada y corrige lo que aplique.
2. En el resumen al usuario, di qué skills usaste y qué encontró la revisión (o que no encontró nada).
3. Deben pasar `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` y `pnpm test:e2e`. Las pantallas nuevas llevan su prueba de extremo a extremo en `tests/e2e/specs/`.

## Precedencia

Mandan sobre las skills: `CLAUDE.md` (regla 12 y las demás), `apps/web/AGENTS.md` (Next.js 16 cambia APIs que las skills pueden dar por supuestas), los tokens de `packages/ui`, los textos de `packages/i18n` y las clases de `apps/web/src/components/ui-classes.ts`. Si una skill propone otra paleta, otra tipografía o una librería nueva, se sigue el repositorio.
