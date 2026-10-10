# 13. Plan de documentos del cliente

Fecha: 09/10/2026. El asesor pidió que el cliente llegue a la videollamada con sus extractos (por ejemplo, los de la tarjeta de crédito): después de aceptar la invitación, el primer paso es subir sus documentos; el resto se hace hablando en la videollamada. Decidió que los archivos sean temporales y se borren solos (ADR 0030).

## 1. Decisiones

| Tema | Decisión |
|---|---|
| Qué se sube | Extractos de tarjetas de crédito, de cuentas y de créditos, y soportes de ingreso (desprendible de nómina o cuenta de cobro), de los últimos 3 meses (protocolo, pregunta 21). PDF, JPG o PNG de hasta 10 MB; hasta 20 archivos a la vez por cliente |
| Quién los ve | Solo el cliente y el asesor con acceso activo. No van a Claude ni salen en el plan entregado |
| Cuánto duran | Se borran cuando el asesor marca "Ya los revisé", cuando el cliente los borra o, a más tardar, 30 días después de subidos |
| Qué queda | Una fila sin contenido por archivo (tipo, fecha, tamaño y por qué se borró), para que el cliente y el asesor sepan qué pasó. Nunca el nombre original del archivo, que puede traer números |
| Números | Se le sugiere al cliente tapar los números de tarjeta, cuenta y documento; el asesor no los necesita. La regla 9 de `CLAUDE.md` cambia para decir esta excepción |
| Borrado | Siempre con la API de Storage: borrar la fila en SQL deja el archivo huérfano [F79] |

## 2. Pasos

Cada paso es un cambio con sus pruebas. Se marca al terminar.

### Fase B. Base de datos (migración `client_files`)

- [x] **B1. Bucket privado `client-files`** con límite de 10 MB y solo PDF, JPG y PNG.
- [x] **B2. Tabla `client_files`** con RLS: el cliente registra lo que subió a su carpeta; cliente y asesor con acceso la leen y marcan el borrado. La base pone quién, cuándo y el vencimiento (30 días); no deja más de 20 archivos activos; historial como las demás tablas.
- [x] **B3. Políticas de `storage.objects`** para el bucket: el dueño sube solo a la carpeta de su perfil; el dueño y el asesor con acceso descargan y borran. Sin sobrescribir.
- [x] **B4. Aviso al asesor** `documentos_subidos` cuando el cliente sube algo (uno sin leer por cliente).
- [x] **B5. Paso omitible `documents`** en `case_settings.skipped_steps`.
- [x] **B6. `delete_client_data`** se niega si quedan archivos del cliente en Storage y dice cómo borrarlos.
- [x] **B7. Archivos por borrar** (`client_files_orphans`), solo para la clave secreta: objetos sin fila activa de más de una hora (revisados, borrados, vencidos o subidos sin registrar).
- [x] **B8. Pruebas pgTAP** de la tabla, de Storage y de la función.

### Fase S. Servidor

- [x] **S1. `features/client-files`:** validación (tipo de documento, formato, tamaño, ruta), consultas y acciones: registrar lo subido (comprueba el archivo en Storage), borrar uno y "Ya los revisé".
- [x] **S2. Borrado diario:** ruta `/api/cron/documentos` con `CRON_SECRET` [F78] que borra los vencidos y los huérfanos con la API de Storage; `vercel.json` una vez al día (Hobby).
- [x] **S3. Pruebas unitarias** de la validación, del paso y de la ruta.

### Fase C. Cliente

- [x] **C1. Pantalla Tus documentos (`/documentos`, P-C13):** qué subir, el aviso corto (quién lo ve, cuándo se borra, tapar números), subir desde el celular (también con la cámara), lista con su vencimiento y "Borrar".
- [x] **C2. Primer paso tras aceptar la invitación:** `/documentos?inicio=1` antes de la guía de instalación, con "Continuar" y "Lo hago después".
- [x] **C3. Inicio:** tarjeta "Antes de tu videollamada" mientras no haya subido nada ni tenga reportes; enlace en Más.

### Fase A. Asesor

- [x] **A1. Pantalla Documentos del cliente (`/clientes/[id]/documentos`, P-A26):** lista con tipo, fecha y vencimiento; "Ver" abre el archivo con un enlace de 60 segundos; "Ya los revisé" los borra todos, con confirmación.
- [x] **A2. Ficha:** tarjeta en Datos básicos y paso "Revisar los documentos del cliente", omitible, que se marca cuando ya no quedan archivos por revisar.
- [x] **A3. Avisos:** "Subió documentos" con enlace a la pantalla.

### Fase L. Privacidad y documentación

- [x] **L1. Textos legales y reglas:** regla 9 de `CLAUDE.md`; ADR 0030; borradores 1.2 de los avisos de Colombia y España (tratamiento y datos sensibles), que aprueba el responsable.
- [x] **L2. Documentación:** `03-modelo-de-datos.md`, `05-pantallas-y-flujos.md`, `glosario.md`, `fuentes.md`, `07-preguntas-abiertas.md`, `10-plan-de-lanzamiento.md` y `supabase/README.md` (borrado de un cliente).

### Fase V. Verificación

- [x] **V1. Revisión de interfaz** con `web-design-guidelines` de cada pantalla nueva o cambiada (regla 12).
- [x] **V2. Pruebas:** `pnpm format:check`, `lint`, `typecheck`, `test`, `test:db`, `build` y `test:e2e`.
- [x] **V3. Recorrido** contra Supabase local con datos inventados: el cliente acepta y sube un PDF y una foto; el asesor recibe el aviso, ve los archivos y marca "Ya los revisé"; los archivos desaparecen de Storage; el borrado diario quita uno vencido.

**Estado al 09/10/2026:** todos los pasos hechos y verificados contra Supabase local: `pnpm format:check`, `lint`, `typecheck`, `test` (1.159 pruebas), `test:db` (539), `build` y `test:e2e` (385) pasan. El recorrido encontró y se corrigieron dos cosas: el guardián de `client_files` necesitaba correr como su dueño para el borrado diario (la clave secreta no ve el esquema `private`), y dos documentos del mismo tipo y día tenían el mismo nombre accesible en "Ver".

## 3. Lo que queda para el asesor

- Aprobar los avisos 1.2 antes de pedirle documentos a un cliente real.
- Subir la migración al remoto (`pnpm supabase db push --dry-run` y `pnpm supabase db push`) antes de publicar el código.
- Crear `CRON_SECRET` en Vercel (16 caracteres o más) para el borrado diario.
