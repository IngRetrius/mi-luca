# Skills del proyecto

Skills de Claude Code para el trabajo de frontend en `apps/web` y `packages/ui`. Son instrucciones de terceros: cada una se leyó completa antes de agregarla y queda fijada en un commit. No se actualizan solas; para actualizar una, descarga la versión nueva, revísala y reemplaza la carpeta.

| Skill | Para qué | Origen | Commit | Licencia | Cambios de MiLuca |
|---|---|---|---|---|---|
| `frontend-design` | Dirección visual y textos de interfaz | [anthropics/skills](https://github.com/anthropics/skills) | `8a1541c` | Apache 2.0 (`LICENSE.txt`) | Ninguno |
| `frontend-ui-engineering` | Componentes, accesibilidad WCAG, estados vacíos y de error, diseño adaptable | [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | `2686b62` | MIT (`LICENSE`) | Se incluye `references/accessibility-checklist.md` y se ajusta su ruta |
| `vercel-react-best-practices` | Rendimiento de React y Next.js: cascadas de peticiones, tamaño del paquete, servidor, renders | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | `063bee9` | MIT | Sin el README de desarrollo del repositorio de origen |
| `vercel-composition-patterns` | Patrones de composición de componentes en React 19 | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | `063bee9` | MIT | Sin el README de desarrollo del repositorio de origen |
| `web-design-guidelines` | Revisión de UI contra las Web Interface Guidelines | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) y [web-interface-guidelines](https://github.com/vercel-labs/web-interface-guidelines) | `063bee9` y `e3d624b` | MIT | Lee una copia fija de las reglas en lugar de descargarlas en cada uso; ajustes para textos en español |

Revisadas el 28/09/2026: sin comandos que se ejecuten solos, sin descargas en tiempo de uso (después del ajuste de `web-design-guidelines`) y sin instrucciones fuera de su tema.

## Cómo se aplican

La regla 12 de `CLAUDE.md` y `.claude/rules/frontend.md` piden invocar `vercel-react-best-practices`, `frontend-ui-engineering` y, según el caso, `vercel-composition-patterns` y `frontend-design` antes de escribir interfaz, y revisar cada pantalla con `web-design-guidelines`. La regla tiene rutas (`paths`), así que Claude Code la carga sola al abrir archivos de `apps/web`, `packages/ui`, `packages/i18n` o `tests/e2e`. La parte que se puede comprobar sola la exige el lint de `apps/web` (reglas recomendadas de `jsx-a11y` y dependencias de los efectos, como error).

## Precedencia

Las reglas del repositorio mandan sobre cualquier skill: `CLAUDE.md`, `apps/web/AGENTS.md` (Next.js 16 cambia APIs que las skills pueden dar por supuestas), los tokens de `packages/ui` y los textos de `packages/i18n`. Si una skill propone algo distinto (otra paleta, otra tipografía, una librería nueva), se sigue el repositorio.

## Descartadas

- `webapp-testing` (Anthropic): pruebas con Playwright en Python; el proyecto ya usa Playwright en TypeScript (`tests/e2e`).
- Colecciones comunitarias con cientos de skills: demasiado grandes para revisarlas una por una.
