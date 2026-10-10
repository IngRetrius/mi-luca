# 0030. Documentos temporales del cliente para la videollamada

- Estado: Aceptada (pedido del asesor del 09/10/2026; eligió archivos temporales que se borran solos). Cambia la regla 9 de `CLAUDE.md` y actualiza el ADR 0029 en los pasos del núcleo.
- Fecha: 2026-10-09

## Contexto

El asesor quiere que el cliente llegue a la videollamada con sus extractos, por ejemplo los de la tarjeta de crédito, para usar la llamada en hablar del plan y no en dictar cifras. El protocolo ya los pide (pregunta 21: "revise sus extractos de los últimos 2 o 3 meses") y la prueba de realidad depende de ellos (sección 6.2).

Un extracto trae lo que la plataforma prometió no guardar: el número de la tarjeta o de la cuenta (a veces solo los últimos cuatro dígitos), a veces el de documento, y compras que pueden revelar datos de salud. La regla 9 de `CLAUDE.md`, el aviso de privacidad y la bienvenida de la invitación dicen que MiLuca nunca pide esos números.

En Supabase, borrar un archivo con SQL deja el contenido huérfano en el almacenamiento; hay que borrarlo con la API de Storage [F79]. El borrado tiene que estar diseñado desde el principio.

## Decisión

- **Primer paso después de aceptar la invitación:** "Tus documentos" (P-C13), con "Continuar" o "Lo hago después" hacia la guía de instalación. El inicio muestra "Antes de tu videollamada" mientras no haya subido nada ni tenga reportes.
- **Qué se sube:** extractos de tarjetas, cuentas y créditos, y soportes de ingreso, de los últimos 3 meses. PDF, JPG o PNG de hasta 10 MB, hasta 20 activos por cliente. Lo sube solo el cliente, directo del navegador a Storage: las funciones de Vercel no reciben archivos grandes.
- **Temporales:** se borran cuando el asesor marca "Ya los revisé" (P-A26), cuando el cliente los borra o, a más tardar, 30 días después de subidos, con un borrado diario (cron de Vercel, una vez al día en el plan Hobby [F78]).
- **Quién los ve:** el cliente y el asesor con acceso activo, con un enlace de 60 segundos. No van al asistente ni a Claude, ni al plan entregado.
- **Qué queda:** una fila sin contenido por archivo en `client_files` (tipo, formato, tamaño, fechas y motivo del borrado), sin el nombre original, que puede traer números. La ruta en Storage es `{client_id}/{id}.{ext}`.
- **Borrado seguro:** la fila se marca primero y el archivo se borra después con la API de Storage; lo que quede sin fila activa lo quita el borrado diario. `delete_client_data` se niega mientras queden archivos del cliente en Storage.
- **Extractos con clave:** muchos bancos mandan el PDF con clave. Se le pide guardarlo sin clave si puede; si no, lo sube así y lo abren juntos en la videollamada. La app nunca pide ni guarda la clave.
- **Números:** se le sugiere al cliente tapar los números de tarjeta, cuenta y documento. La regla 9 queda: no se guardan esos números salvo dentro de estos documentos temporales.
- **En la ficha:** tarjeta "Documentos del cliente" y paso del núcleo "Revisar los documentos del cliente", omitible, que se marca cuando no queda ninguno por revisar. No frena el control de calidad: los documentos ayudan a registrar, no son datos del cálculo. El asesor recibe un aviso cuando el cliente sube algo (uno sin leer por cliente).

## Consecuencias

- Migración `client_files`: bucket privado, tabla con RLS e historial, políticas de `storage.objects`, aviso `documentos_subidos`, paso `documents` en `skipped_steps` y `delete_client_data` con la guarda de Storage; pruebas pgTAP. Hay que subirla al remoto antes de publicar el código.
- `CRON_SECRET` en Vercel para el borrado diario. Sin él, el borrado diario no corre y los documentos solo se borran al revisarlos o cuando el cliente los borra.
- Los borradores 1.2 de los avisos de tratamiento (Colombia y España) dicen qué pasa con los extractos; el responsable los aprueba antes de pedirle documentos a un cliente real. La bienvenida de la invitación lo dice también.
- Para borrar un cliente a pedido hay que borrar antes su carpeta de Storage (`supabase/README.md`).
- El motor no cambia.

## Alternativas consideradas

- **Guardar hasta que alguien los borre:** más simple, pero guarda números de tarjeta y cuenta sin fecha de fin.
- **No guardar archivos:** el cliente los comparte en pantalla durante la videollamada. No cambia el aviso, pero el asesor no puede revisarlos antes.
- **Extraer los movimientos con IA y descartar el archivo:** ahorraría digitar, pero manda extractos completos a un tercero y la extracción se equivoca; se puede revisar después del piloto.
- **Subir a través de una acción del servidor:** valida todo en un solo paso, pero Vercel no acepta cuerpos de más de unos pocos MB y una foto del celular los supera.
