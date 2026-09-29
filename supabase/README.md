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

- `[auth.email] enable_signup = true`: se entra con Google o con correo y contraseña (ADR 0009). Con `false` se apaga el proveedor de correo entero, también el inicio de sesión y la recuperación (probado en local). El registro público por correo lo cerrará el gancho `before_user_created` en F1; las cuentas con contraseña se crean desde el servidor con la API de administración, que no pasa por el gancho.
- `minimum_password_length = 12`, sin reglas de composición (supuesto, pregunta E5).
- `site_url` y `additional_redirect_urls` apuntan a `http://localhost:3000` y a su `/auth/callback`.
- Las semillas se leen de `seed/*.sql`.

## Supabase local

Corre en Docker. En macOS se usa Colima (libre y sin interfaz gráfica), instalado con Homebrew:

```sh
brew install colima docker            # una sola vez
colima start --cpu 4 --memory 8 --disk 60 --vm-type vz --mount-type virtiofs
pnpm supabase start                   # API en http://127.0.0.1:54321, Studio en :54323, correos en Mailpit :54324
pnpm supabase status                  # muestra URL y claves locales
pnpm supabase stop                    # detiene los contenedores (conserva los datos)
colima stop                           # apaga la máquina virtual
```

Las claves locales son públicas y de prueba; no se mezclan con las del proyecto remoto.

## Proyecto remoto

El proyecto (us-east-2) se vincula una sola vez desde una terminal, porque pide abrir el navegador:

```sh
pnpm supabase login
pnpm supabase link --project-ref ryhvshstjuuasgwcepua
```

El servidor MCP de Supabase para agentes está en `.mcp.json` (raíz del repositorio) y se autentica una vez con `/mcp` en Claude Code.
