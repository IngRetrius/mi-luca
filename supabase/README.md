# supabase

Todo lo que vive en el proyecto de Supabase, versionado como código.

| Carpeta | Qué contiene |
|---|---|
| `migrations/` | Migraciones SQL en orden. Cada tabla nueva lleva en la misma migración su RLS, sus políticas, sus índices y su disparador de auditoría. |
| `seed/` | Datos semilla: países, parámetros por país con fuente y fecha, catálogos y textos legales versionados. Nunca datos de clientes. |
| `functions/` | Funciones de servidor de Supabase (Edge Functions) si hacen falta, por ejemplo tareas programadas de limpieza o recordatorios. |
| `tests/` | Pruebas de base de datos (pgTAP): políticas RLS por rol y reglas de los disparadores. |

El esquema propuesto está en `docs/03-modelo-de-datos.md`.

## Configuración local

`config.toml` lo generó `supabase init` (CLI instalada como dependencia del repositorio: `pnpm supabase ...`). Cambios respecto al valor por defecto:

- `[auth.email] enable_signup = false`: no se entra con correo; solo Google y Apple (decisión tomada). El registro general (`[auth] enable_signup`) sigue activo para que un cliente invitado pueda crear su cuenta con OAuth.
- `site_url` y `additional_redirect_urls` apuntan a `http://localhost:3000` y a su `/auth/callback`.
- Las semillas se leen de `seed/*.sql`.

Para levantar Supabase en local hace falta Docker (`pnpm supabase start`). El proyecto remoto (us-east-2) se vincula con `pnpm supabase link --project-ref ryhvshstjuuasgwcepua`, que pide iniciar sesión.
