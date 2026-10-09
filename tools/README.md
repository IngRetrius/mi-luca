# tools

Herramientas de desarrollo que no forman parte de la aplicación.

| Herramienta | Para qué sirve |
|---|---|
| `legal-texts/` | Genera la migración que publica los textos legales aprobados de `docs/legal/textos/`; se niega si alguno sigue en borrador o conserva un `[[POR DEFINIR]]`. |
| `excel-extractor/` | Extrae fórmulas, valores calculados y validaciones de los libros de Excel. Genera el inventario de fórmulas y, más adelante, los casos de prueba de oro. |
| `landing-screenshots/` | Arma un caso inventado en Supabase local, entrega sus reportes y fotografía las pantallas del cliente para el landing, más la imagen para compartir el enlace (`pnpm --filter @miluca/landing-screenshots capture`). Se niega a correr contra el proyecto remoto. |

Las salidas que contengan datos de clientes se escriben fuera del repositorio o en carpetas `salida/`, que git ignora.
