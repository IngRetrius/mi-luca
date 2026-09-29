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
- `minimum_password_length = 8`, sin reglas de composición (decisión E5 del asesor).
- `site_url` y `additional_redirect_urls` apuntan a `http://localhost:3000` y a su `/auth/callback`.
- `[auth.external.google]` activo (ADR 0009), con el Client ID del cliente web de Google Cloud y el secreto leído de `supabase/.env`.
- Las semillas se leen de `seed/*.sql`.

## Secretos

Los `env(...)` de `config.toml` se resuelven con `supabase/.env`, que está fuera de git. Para crearlo, copia `supabase/.env.example` y completa los valores. Sin ese archivo, `supabase start` y `supabase config push` no pueden configurar Google.

## Google

- Proyecto de Google Cloud `miluca-510102`, cliente de OAuth de tipo "Web application".
- URIs de redirección registradas en Google: `https://ryhvshstjuuasgwcepua.supabase.co/auth/v1/callback` (remoto) y `http://127.0.0.1:54321/auth/v1/callback` (local). Origen de JavaScript: `http://localhost:3000`. Al desplegar hay que agregar el dominio de producción en Google y en `site_url`.
- Mientras la audiencia de la app esté en modo de prueba en Google Auth Platform, solo entran los usuarios de prueba que se agreguen allí. Para abrirla a clientes hace falta publicarla y, para que Google muestre el nombre y el logo de MiLuca, la verificación de marca con dominio propio [F27].
- Google muestra el secreto solo al crear el cliente. Si se pierde, se crea uno nuevo en la consola y se actualiza `supabase/.env`.

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

El proyecto de producción (`miluca`, us-east-2) está vinculado desde el 28/09/2026. El vínculo vive en `supabase/.temp/` (fuera de git), así que en otro equipo se repite una vez, porque `login` abre el navegador:

```sh
pnpm supabase login
pnpm supabase link --project-ref ryhvshstjuuasgwcepua
```

La configuración del remoto también es código. Hereda todo `config.toml`, y el bloque `[remotes.production]` solo cambia lo que el entorno local relaja para desarrollo: el remoto exige confirmar el correo, espera 1 minuto entre correos a la misma persona y conserva la analítica de Storage.

```sh
pnpm supabase config diff   # solo lectura: diferencias entre config.toml y el remoto
pnpm supabase config push   # aplica config.toml al remoto; muestra el cambio y pide confirmación
```

`config push` no cambia el tamaño del pooler ni apaga el proveedor de SMS; eso se hace en el panel si hace falta.

El servidor MCP de Supabase para agentes está registrado en el alcance local de Claude Code (fuera del repositorio) y se autentica una vez con `claude mcp login`.
