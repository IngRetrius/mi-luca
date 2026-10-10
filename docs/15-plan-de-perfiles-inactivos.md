# 15. Plan de perfiles inactivos y borrado a pedido del cliente

Fecha: 09/10/2026. El asesor pidió poder sacar perfiles de su lista ("necesito tener la posibilidad de eliminar perfiles") y luego decidió cómo: "mejor trabajemos con inactividad, de esta forma tenemos el backup en la base de datos; ya si el cliente quiere borrarlo, que se elimine completo". El asesor desactiva y reactiva perfiles sin perder datos, y el borrado completo solo ocurre cuando el cliente lo pide.

El mismo día se vació el remoto para empezar de cero: se borraron con `private.delete_client_data` los dos perfiles de prueba que había y la cuenta de cliente de uno de ellos. Quedan el asesor, su cuenta, los parámetros de país y su historial (19 filas). No había documentos en Storage.

## 1. Qué había antes del plan

| Pieza | Estado |
|---|---|
| `private.delete_client_data(cliente)` | Borra en una transacción el perfil (las claves foráneas arrastran todo lo demás, también reportes entregados y consentimientos), su historial en `audit_log` y la cuenta de Auth si no es de un asesor. Se niega si quedan documentos en Storage. Solo la ejecuta el responsable en el editor SQL, cuando el cliente lo pide por correo |
| Política `clients_delete` | El asesor puede borrar con la API un perfil sin dueño (borrador o invitado). Ninguna pantalla la usa, y si se usara dejaría el historial del perfil en `audit_log` sin borrar |
| `clients.status` | `borrador`, `invitado`, `activo` y `borrado_solicitado`; los tres primeros los pone la base según la invitación. `borrado_solicitado` y `clients.deletion_requested_at` no los usa nada |
| P-C11 Privacidad y datos | Acceso del asesor y consentimientos. "Pedir borrado" quedó para F7 |
| Documentos en Storage | El dueño y el asesor con acceso pueden borrar los archivos de la carpeta del perfil (política `client_files_objects_delete`) |

## 2. Decisiones

Las que llevaban **Supuesto** las aceptó el asesor el 09/10/2026 (G25 en `07-preguntas-abiertas.md`, ADR 0034).

| Tema | Decisión |
|---|---|
| Qué hace el asesor | Desactiva un perfil cuando el cliente deja la asesoría y lo reactiva si vuelve. Nada se borra: los datos, los reportes entregados y el historial se quedan en la base |
| Cómo se guarda | Columna `clients.inactive_at` (vacía si está activo), aparte de `status`: un perfil invitado o activo puede estar inactivo y al reactivarlo vuelve a su estado. La fecha la pone la base; solo el asesor con acceso la cambia |
| Qué cambia para el asesor | El perfil sale de la lista principal y pasa a "Inactivos", con la fecha y la etiqueta "Inactivo". La ficha muestra "Perfil inactivo" con la fecha y "Reactivar perfil". Todo lo demás sigue igual (se puede ver y editar, el motor calcula igual) |
| Invitación pendiente | Al desactivar se anula, como cuando se invita de nuevo. Un perfil inactivo no se invita (RLS lo rechaza); primero se reactiva |
| Qué cambia para el cliente | Nada. Sigue entrando y viendo su plan y sus datos, que son suyos, y puede borrar su cuenta cuando quiera. No ve que está inactivo |
| Borrado completo | Solo a pedido del cliente: él mismo desde Privacidad y datos, o por correo y el responsable en el editor SQL (procedimiento de `supabase/README.md`, sin cambios). Borra lo mismo que hoy `delete_client_data`, también la cuenta de acceso; nunca la de un asesor |
| Cuándo se borra | De inmediato, sin plazo de gracia. No hay copia para recuperar lo que el cliente borra |
| Confirmación del cliente | Pantalla aparte con lo que se borra, una casilla "Entiendo que se borra todo y no se puede deshacer" y el botón. Sin reautenticación (decisión del 29/09/2026) |
| Perfiles sin dueño | Un perfil que nadie aceptó (borrador o invitación sin aceptar) también se desactiva. El asesor puede además borrarlo, como ya permite la base, porque no hay cliente que pueda pedirlo (un perfil creado por error, alguien que no siguió) |
| Un solo camino en la base | Función `public.delete_client(cliente)`: la puede llamar el dueño del perfil, o el asesor con acceso si el perfil no tiene dueño. Llama a `private.delete_client_data`. Se quita el `delete` directo sobre `clients` (política `clients_delete` y su privilegio), para que ningún borrado deje historial suelto |
| Documentos | La app los borra primero con la API de Storage y con la sesión de quien borra (regla 9, ADR 0030); luego llama a la función. Si entre los dos pasos aparece un archivo nuevo, la función se niega y la pantalla pide intentarlo otra vez |
| Aviso al asesor | Cuando el cliente borra su cuenta, el asesor recibe "Un cliente borró su cuenta" con la fecha y sin el nombre, porque guardar el nombre contradice el borrado |
| `borrado_solicitado` | Sigue sin usarse. Se puede quitar en una limpieza aparte junto con `deletion_requested_at` |

## 3. Pasos

Cada paso es un cambio con sus pruebas. Se marca al terminar.

### Fase D. Base de datos (migración `client_inactivity_deletion`)

- [x] **D1. `clients.inactive_at`**, sin índice (pocos perfiles por asesor). Solo el asesor con acceso la cambia: se suma a las columnas de `guard_advisor_columns`. `private.stamp_client_inactivity` pone `now()` o la vacía, sin aceptar otra fecha; el historial registra el cambio como en las demás columnas. Privilegio de `update (inactive_at)` para `authenticated`.
- [x] **D2. Invitaciones:** al desactivar se anulan las pendientes (`revoked_at`, correo vacío); la política `invitations_insert` rechaza un perfil inactivo (`private.is_inactive`). Las invitaciones se crean con un `insert` directo, no con una función.
- [x] **D3. `public.delete_client(p_client_id)`**, `security definer`: acepta al dueño, o al asesor con acceso si `owner_user_id` es nulo; si no, `42501`. Devuelve lo que devuelve `private.delete_client_data`. `EXECUTE` solo para `authenticated`.
- [x] **D4. Sin borrado directo:** `drop policy clients_delete` y `revoke delete on public.clients from authenticated`. La clave secreta y el editor SQL siguen pudiendo.
- [x] **D5. Aviso `cliente_borro_cuenta`** en `notifications.kind`, sin `client_id` ni nombre, para los asesores con acceso activo; lo inserta `delete_client` cuando borra el dueño.
- [x] **D6. Pruebas pgTAP** en `supabase/tests/database/client_inactivity_deletion.test.sql`. Inactividad: el asesor desactiva y reactiva; el dueño, otro asesor y `anon` no pueden; la fecha la pone la base; se anula la invitación pendiente y no se invita un inactivo; el dueño sigue leyendo y escribiendo sus datos. Borrado: el dueño borra el suyo (perfil, historial y cuenta desaparecen); el asesor borra un perfil sin dueño y no uno con dueño; otro asesor, un cliente ajeno y `anon` no pueden; nunca se borra la cuenta de un asesor; con un archivo en Storage se niega (`55000`); el `delete` directo ya no funciona; el aviso llega sin nombre. Ajustar las pruebas que hoy borran perfiles con `delete` directo (`identity_access`, `client_inputs`, `proposals`).

### Fase S. Servidor (`features/clients` y `features/consent`)

- [x] **S1. `listClients`** con el filtro de activos o inactivos y `inactiveAt` en el resumen; `getClientDetail` con `inactiveAt`.
- [x] **S2. Acciones del asesor `deactivateClient` y `reactivateClient`:** `requireAdvisor`, el id validado, actualizan `inactive_at` y revalidan la lista y la ficha.
- [x] **S3. Acción del asesor `deleteUnclaimedClient`:** solo para perfiles sin dueño; escribir el nombre del cliente para confirmar (sin distinguir mayúsculas ni espacios de más), borrar la carpeta `{id}/` del bucket `client-files` con la API de Storage, llamar a `delete_client` y redirigir a `/clientes?borrado=1`.
- [x] **S4. Acción del cliente `deleteMyAccount`:** `requireClient`, la casilla marcada, lo mismo con su perfil y después `signOut({ scope: 'local' })` para limpiar la sesión (la cuenta ya no existe) y redirigir a `/entrar?aviso=cuenta-borrada`. Errores: `55000` (aparecieron documentos, intentar otra vez) u otro (no se pudo, nada se borró).
- [x] **S5. Pruebas unitarias** de la validación de cada confirmación (`validation.test.ts`), de `deleteClientProfile` (orden Storage y luego función, manejo de cada error) y de `discardClientFolder`, con el cliente de Supabase simulado.

### Fase A. Asesor

- [x] **A1. Clientes (P-A01):** pestañas "Activos" e "Inactivos" con su número, solo cuando hay inactivos; las tarjetas inactivas dicen "Inactivo desde el..." y llevan la etiqueta "Inactivo" en lugar de la de la invitación (lo encontró la revisión de interfaz); la búsqueda respeta la pestaña. Con `?borrado=1`, el aviso "Se borró el perfil" en una región `aria-live`.
- [x] **A2. Ficha (P-A03):** "Desactivar perfil" en Datos básicos, con una confirmación corta que dice que los datos se guardan. Si está inactivo, una franja arriba con la fecha y "Reactivar", y sin el botón de invitar.
- [x] **A3. Pantalla Borrar perfil sin dueño (`/clientes/[id]/borrar`, P-A27):** el enlace solo aparece en perfiles sin dueño; qué se borra, que no se puede deshacer, el campo con el nombre y "Borrar para siempre" en color de alerta (`dangerButton`). Los botones van en el contenido y no en la barra fija: en una pantalla tan corta, el botón del asistente la tapaba. Funciona sin JavaScript.
- [x] **A4. Avisos:** "Un cliente borró su cuenta", sin enlace.

### Fase C. Cliente

- [x] **C1. Privacidad y datos (P-C11):** sección "Borrar mi cuenta" con enlace a la pantalla de confirmación.
- [x] **C2. Pantalla Borrar mi cuenta (`/privacidad-y-datos/borrar`, P-C14):** qué se borra (datos, reportes, documentos y la cuenta), que su asesor deja de verlo todo y que no se puede deshacer; la casilla y el botón. En tú o en usted según el perfil.
- [x] **C3. Entrar (P-G01):** con `?aviso=cuenta-borrada`, "Tu cuenta y tus datos se borraron".

### Fase L. Textos y documentación

- [x] **L1. Textos** en `packages/i18n/messages/es.json` y `en.json` con las mismas claves (ADR 0022).
- [x] **L2. ADR 0034** "Perfiles inactivos y borrado a pedido del cliente": el asesor desactiva en lugar de borrar; el cliente borra desde la app; amplía la decisión del 08/10/2026 (borrado solo en el editor SQL).
- [x] **L3. Documentación:** `03-modelo-de-datos.md` (columna, permisos de `clients`, punto 41 y nuevo punto), `05-pantallas-y-flujos.md` (P-A01, P-A03, P-A27, P-C11, P-C14, P-G01), `glosario.md` (inactivo `inactive_at`, desactivar `deactivateClient`, reactivar `reactivateClient`, `delete_client`, `deleteUnclaimedClient`, `deleteMyAccount`), `07-preguntas-abiertas.md`, `10-plan-de-lanzamiento.md` (el caso inventado se borra con la cuenta de prueba desde Privacidad y datos) y `supabase/README.md`.
- [x] **L4. Avisos legales:** no cambian; el correo de contacto sigue valiendo para pedir el borrado. Si se publica una versión nueva por otra razón, se agrega que también se puede desde la app y que al dejar la asesoría los datos se guardan hasta que el cliente pida borrarlos.

### Fase V. Verificación

- [x] **V1. Revisión de interfaz** con `web-design-guidelines` de cada pantalla nueva o cambiada (regla 12).
- [x] **V2. Pruebas de extremo a extremo** en `tests/e2e/specs/`: las dos pantallas nuevas piden sesión y vuelven a su ruta, y Entrar muestra el aviso de cuenta borrada. Los flujos con sesión (CI corre sin Supabase) se recorrieron en V4.
- [x] **V3. Pruebas:** `pnpm format:check`, `lint`, `typecheck`, `test`, `test:db`, `build` y `test:e2e`.
- [x] **V4. Recorrido** contra Supabase local con datos inventados, con Playwright: el asesor desactiva un perfil, lo ve en Inactivos con la fecha y lo reactiva sin perder nada; no puede borrar uno con dueño; con el nombre mal escrito no borra un borrador y con el nombre en minúsculas y espacios de más sí; el cliente sube un documento, sin la casilla no borra, con ella borra su cuenta y queda en Entrar con el aviso; no queda nada en tablas, historial, Storage ni Auth, y la asesora ve el aviso sin nombre.
- [ ] **V5. Remoto:** el asesor ejecuta `pnpm supabase db push` desde su terminal y se verifica con solo lectura que la columna, la función y las políticas quedaron.

**Estado al 09/10/2026:** todo hecho y verificado contra Supabase local salvo V5. Pasan `pnpm format:check`, `lint`, `typecheck`, `test` (325 pruebas en `apps/web`), `test:db` (579), `build` y `test:e2e` (403). En la primera pasada completa de `test:e2e` falló una vez "la privacidad pública abre sin sesión" en iPhone, que lee los avisos del Supabase remoto; repetida, pasó en los cuatro dispositivos y la segunda pasada completa salió limpia.

## 4. Riesgos

| Riesgo | Cómo se cubre |
|---|---|
| Inactivo no es una copia de seguridad | Guarda los datos en la base, pero si se pierde la base o el cliente los borra, se pierden. Las copias de la base son otro tema |
| Datos guardados sin límite de tiempo | Se guardan mientras el cliente no pida borrarlos, y él lo puede hacer solo desde la app. Si se publican avisos nuevos, lo dicen (L4) |
| El cliente borra por error | Casilla y pantalla aparte; el texto dice que no se puede deshacer. No hay copia para recuperar |
| Borrar el perfil sin dueño equivocado | Escribir el nombre; el botón vive en una pantalla aparte y solo para perfiles que nadie aceptó |
| Archivos huérfanos si Storage falla a mitad | La función se niega mientras quede un archivo; el borrado diario quita los que pierdan su fila |
