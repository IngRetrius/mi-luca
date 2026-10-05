# 0020. El PDF del plan entregado se genera al pedirlo, sin guardarlo en Storage

- Estado: Aceptada
- Fecha: 2026-10-04

## Contexto

La arquitectura preveía generar el PDF de la carta al entregar el plan, guardarlo en el bucket privado `deliveries` de Storage (`{client_id}/{delivery_id}.pdf`) y anotar la ruta en `plan_deliveries.pdf_path`. Todavía no existe ningún bucket. Desde ADR 0019, el plan entregado guarda la carta y las notas con las cifras ya escritas (`documents`), y la fila no cambia: un disparador rechaza cualquier `update` y su sha256 cubre entradas, resultados y documentos.

## Decisión

- El PDF se arma cuando el cliente o el asesor lo descargan, con `@react-pdf/renderer` (la librería que ya eligió la arquitectura), a partir de lo que quedó fijo en la entrega: la carta, las notas publicadas y las cifras clave del día de la entrega. El exportador (`@miluca/exporters/pdf`) recibe todo escrito; no consulta la base ni calcula.
- Rutas: `/mi-plan/pdf?version=` para el cliente y `/clientes/[id]/planes/[deliveryId]/pdf` para el asesor. Las dos leen con la sesión de quien pide (RLS) y devuelven el mismo archivo, en el trato del cliente, con `Cache-Control: private, no-store`.
- No se crea el bucket `deliveries` y `pdf_path` queda vacío.
- Helvetica, las fuentes estándar del PDF: cubre el español, el € y las comillas sin incrustar archivos de fuente. Los espacios finos que usa `Intl` en algunos formatos se cambian por espacios duros.

## Consecuencias

- Menos piezas: sin bucket, sin políticas de Storage, sin escribir con la clave secreta y sin archivos que borrar cuando el cliente pide la supresión.
- El contenido es siempre el mismo, porque sale de una fila inmutable. Si cambia el diseño del PDF, una entrega vieja se descarga con el diseño nuevo y las mismas palabras y cifras.
- Cada descarga cuesta generar el PDF en el servidor (milisegundos para una carta). Si algún día pesa, se puede guardar en Storage sin cambiar las rutas.
- La librería se carga solo al pedir un PDF, no en las demás pantallas.

## Alternativas consideradas

- **Guardar el PDF en Storage al entregar (diseño original).** Conserva el archivo exacto, pero suma un bucket, sus políticas, la escritura desde el servidor y el borrado, para un contenido que ya está fijo en la base.
- **Generarlo en el navegador.** Evita trabajo en el servidor, pero carga la librería en el teléfono del cliente.
- **Incrustar la fuente Livvic de la app.** Más fiel a la marca, pero hay que traer y licenciar el archivo de fuente; queda para cuando se defina la imagen de los entregables.
