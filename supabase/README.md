# supabase

Todo lo que vive en el proyecto de Supabase, versionado como código.

| Carpeta | Qué contiene |
|---|---|
| `migrations/` | Migraciones SQL en orden. Cada tabla nueva lleva en la misma migración su RLS, sus políticas, sus índices y su disparador de auditoría. |
| `seed/` | Datos de ejemplo solo para desarrollo local (`supabase db reset`). Lo que producción necesita (países, parámetros por país con fuente y fecha, textos legales) va en migraciones, porque `db push` no carga semillas. Nunca datos de clientes. |
| `functions/` | Funciones de servidor de Supabase (Edge Functions) si hacen falta, por ejemplo tareas programadas de limpieza o recordatorios. |
| `tests/database/` | Pruebas de base de datos (pgTAP): políticas RLS por rol y reglas de los disparadores. |

El esquema propuesto está en `docs/03-modelo-de-datos.md`; lo que ya está migrado, en su sección 11.

## Configuración local

`config.toml` lo generó `supabase init` (CLI instalada como dependencia del repositorio: `pnpm supabase ...`). Cambios respecto al valor por defecto:

- `[auth.email] enable_signup = true`: se entra con Google o con correo y contraseña (ADR 0009). Con `false` se apaga el proveedor de correo entero, también el inicio de sesión y la recuperación (probado en local). El registro público lo cierra el gancho `before_user_created` (abajo); las cuentas con contraseña se crean desde el servidor con la API de administración, que no pasa por el gancho.
- `minimum_password_length = 8`, sin reglas de composición (decisión E5 del asesor).
- `site_url` y `additional_redirect_urls` apuntan a `http://localhost:3000` y a su `/auth/callback`.
- `[auth.external.google]` activo (ADR 0009), con el Client ID del cliente web de Google Cloud y el secreto leído de `supabase/.env`.
- `[auth.hook.before_user_created]` activo con `private.before_user_created` (migración `signup_hook`): solo pasan las altas con Google. Verificado en local: un registro por correo recibe 403 y un alta con la API de administración pasa.
- Las semillas se leen de `seed/*.sql`.

## Secretos

Los `env(...)` de `config.toml` se resuelven con `supabase/.env`, que está fuera de git. Para crearlo, copia `supabase/.env.example` y completa los valores. Sin ese archivo, `supabase start` y `supabase config push` no pueden configurar Google.

## Google

- Proyecto de Google Cloud `miluca-510102`, cliente de OAuth de tipo "Web application".
- URIs de redirección registradas en Google: `https://ryhvshstjuuasgwcepua.supabase.co/auth/v1/callback` (remoto) y `http://127.0.0.1:54321/auth/v1/callback` (local). Origen de JavaScript: `http://localhost:3000`. Al desplegar hay que agregar el dominio de producción en Google y en `site_url`.
- Mientras la audiencia de la app esté en modo de prueba en Google Auth Platform, solo entran los usuarios de prueba que se agreguen allí. Para abrirla a clientes hace falta publicarla y, para que Google muestre el nombre y el logo de MiLuca, la verificación de marca con dominio propio [F27].
- Google muestra el secreto solo al crear el cliente. Si se pierde, se crea uno nuevo en la consola y se actualiza `supabase/.env`.

## Correo

- Recuperación de contraseña con un código de 6 dígitos y sin enlace: plantilla `templates/recovery.html` en `[auth.email.template.recovery]` (ADR 0009). En local, los correos los recoge Mailpit (`http://127.0.0.1:54324`); tras cambiar la plantilla hay que reiniciar con `pnpm supabase stop` y `pnpm supabase start`.
- En producción salen del Gmail del responsable (decisión A7c): `[remotes.production.auth.email.smtp]` con `smtp.gmail.com`, puerto 587, y la contraseña de aplicación de Google en `SUPABASE_AUTH_SMTP_PASS` de `supabase/.env` (ver `.env.example`). Se aplica con `pnpm supabase config push`. Gmail personal envía hasta 500 correos al día; el límite de Supabase queda en 30 por hora.

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

## Migraciones y pruebas

Las migraciones se escriben a mano (`pnpm supabase migration new <nombre>`) y se prueban en local antes de subirlas:

```sh
pnpm supabase migration up          # aplica las migraciones nuevas a la base local sin borrar datos
pnpm test:db                        # pruebas pgTAP de tests/database/ (cada archivo se deshace al terminar)
pnpm supabase db lint --local       # revisa las funciones de SQL
pnpm db:types                       # regenera los tipos de packages/db/src/database.types.ts
pnpm supabase db reset              # opcional: base local desde cero (borra también los usuarios locales)
```

CI repite estos pasos en el trabajo "Base de datos" y falla si los tipos generados no están al día.

## Proyecto remoto

El proyecto de producción (`miluca`, us-east-2) está vinculado desde el 28/09/2026. El vínculo vive en `supabase/.temp/` (fuera de git), así que en otro equipo se repite una vez, porque `login` abre el navegador:

```sh
pnpm supabase login
pnpm supabase link --project-ref ryhvshstjuuasgwcepua
```

La configuración del remoto también es código. Hereda todo `config.toml`, y el bloque `[remotes.production]` solo cambia lo que difiere del entorno local: la URL de la app publicada (`https://mi-luca.vercel.app`, conservando `localhost:3000` para desarrollar contra el remoto), exigir confirmar el correo, esperar 1 minuto entre correos a la misma persona y conservar la analítica de Storage.

```sh
pnpm supabase config diff   # solo lectura: diferencias entre config.toml y el remoto
pnpm supabase config push   # aplica config.toml al remoto; muestra el cambio y pide confirmación
```

`config push` no cambia el tamaño del pooler ni apaga el proveedor de SMS; eso se hace en el panel si hace falta.

### Subir migraciones al remoto

Las ejecuta el asesor desde su terminal: el agente no despliega a producción. El orden importa, porque el gancho de registro apunta a una función que crea la migración; si se activa antes, fallan todas las altas, también las de Google.

```sh
pnpm supabase db push --dry-run   # solo lectura: qué migraciones faltan en el remoto
pnpm supabase db push             # aplica las migraciones; pide confirmación
pnpm supabase config diff         # debe mostrar solo el bloque del gancho
pnpm supabase config push         # activa el gancho en el remoto; pide confirmación
```

Después de subir, el asesor de seguridad del panel (o `get_advisors` del MCP) muestra avisos que no hay que corregir:

- `create_client` y `accept_invitation` se pueden ejecutar con sesión (lint 0029): es intencional, son las funciones que llama la app y validan quién las llama.
- `get_invitation` se puede ejecutar sin sesión (lints 0028 y 0029): es intencional, P-C01 se abre antes de tener cuenta. Sin el token de 32 bytes no devuelve nada. Si aparece cualquier otra función en el lint 0028, es un error: Supabase da `EXECUTE` a `anon` en cada función nueva y hay que revocarlo en la migración (la prueba pgTAP de permisos también falla).
- Protección de contraseñas filtradas desactivada y pocas opciones de MFA: la primera requiere el plan Pro, que se contrata antes del primer cliente real (ADR 0009); el segundo factor es una mejora futura (`docs/02-arquitectura.md`, 5.5).
- `public.rls_auto_enable()` (lints 0028 y 0029): la creó Supabase con el proyecto remoto para el disparador de eventos `ensure_rls`, que activa RLS en cada tabla nueva de `public`. No existe en local ni está en las migraciones. Una función de disparador de eventos no se puede ejecutar desde la API.

La migración `unclaimed_account_cleanup` activa `pg_cron` y programa `delete-unclaimed-accounts` (todos los días a las 08:00 UTC). Para revisar sus ejecuciones: `select * from cron.job_run_details order by start_time desc limit 10;` en el editor SQL.

Cuando exista el proyecto de staging, las migraciones pasan primero por allí y a producción desde CI con aprobación manual (`docs/02-arquitectura.md`, sección 8).

### Primer asesor

Las filas de `advisors` no se crean desde la app. El asesor entra una vez con Google en la app conectada al remoto (así existe su usuario en Auth) y luego, en el editor SQL del panel de Supabase, se ejecuta con su correo y el nombre que verán sus clientes:

```sql
insert into public.advisors (user_id, display_name)
select id, 'Nombre visible' from auth.users where email = 'correo-del-asesor@example.com';
```

El correo real no se escribe en el repositorio.

El servidor MCP de Supabase para agentes está registrado en el alcance local de Claude Code (fuera del repositorio) y se autentica una vez con `claude mcp login`.
