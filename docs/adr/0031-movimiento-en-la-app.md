# 0031. Movimiento en la app

- Estado: Aceptada (el asesor pidió el 09/10/2026 animaciones sencillas en el panel del cliente y del asesor, "para que no se sienta tan plana la app", como en el landing). Amplía el ADR 0026, que dejaba el movimiento solo en las páginas públicas.
- Fecha: 2026-10-09

## Contexto

La app cambia de pantalla de golpe: una pantalla desaparece y la otra aparece, sin decir si se entró a algo o se volvió. Los botones, los desplegables, los avisos y el panel del asistente tampoco responden con movimiento. El landing ya tiene un lenguaje de movimiento corto, en CSS y respetuoso de "reducir movimiento" (ADR 0026) [F71].

La app es una herramienta de uso diario para el asesor y de consulta para el cliente. El movimiento que no responde a nada (entradas en cada sección, efectos en cada tarjeta) cansa y se ve genérico; el que responde a lo que hace la persona muestra qué cambió.

Next.js 16 trae las transiciones de vista de React (`ViewTransition`) sin configuración ni librerías [F80].

## Decisión

- **Entre pantallas** (`components/page-transition.tsx`, en `Screen`, `WideScreen` y el inicio del cliente): entrar a algo (una tarjeta, un paso, un cliente, un enlace del inicio) desliza el contenido 40 px hacia adelante; "volver" (`BackLink`, "Clientes"), hacia atrás. Lo viejo sale en 150 ms y lo nuevo entra en 210 ms, con un desplazamiento de 320 ms. Cualquier otro cambio (guardar y volver a la lista, el esqueleto de carga que da paso al contenido) es un fundido corto. Actualizar la misma pantalla no se anima, y el fondo y el botón del asistente se quedan quietos.
- **Respuesta a lo que se hace:** los botones se hunden un poco al tocarlos (`scale` 0,98); lo que se abre en un desplegable entra desde su título; un aviso o un error (`role="alert"`) entra para que se note; el panel del asistente sube al abrirse; la subida de documentos muestra una barra que se llena.
- **Cifras que importan:** la barra del avance del fondo de emergencia se llena al abrir su pantalla.
- **Un solo momento de marca:** en el inicio del cliente, la ranura se abre y la moneda cae, como en el landing (`components/coin-slot.tsx`, compartido). En la app del asesor no hay ninguno.
- **Reglas:** solo `transform`, `translate`, `scale` y `opacity`, con ease-out; el texto no se anima por sí solo; nada se mueve con "reducir movimiento" (las transiciones de vista quedan en 0 s). Sin librerías: CSS en `globals.css` y el componente de React. Sin soporte del navegador, la pantalla cambia como antes.

## Consecuencias

- Los enlaces de navegación llevan `transitionTypes` (`NAV_FORWARD` o `NAV_BACK`); un enlace nuevo sin tipo cambia de pantalla con el fundido.
- Las tarjetas y las listas no tienen entradas propias: el movimiento está en el cambio de pantalla y en las respuestas.
- El atrás del navegador no tiene tipo y cambia sin deslizar (comportamiento del navegador) [F80].
- Entrar y salir usan clases distintas (`forward-in` y `forward-out`, `back-in` y `back-out`, `fade-in` y `fade-out`), y cada una anima un solo lado de la transición. Safari conserva la animación de cada capa (`::view-transition-old(nombre)`) entre una transición y la siguiente, y React la cancela al terminar. Con una sola clase para los dos lados, la salida de una pantalla que ya había entrado se quedaba sin fundido y se cortaba de golpe, por ejemplo del esqueleto al contenido. Se midió en WebKit 26.6 con Playwright el 09/10/2026; `page-transition.test.ts` comprueba la regla.
- `docs/diseno/tokens.md` (Movimiento) describe las duraciones y dónde vive cada animación.

## Alternativas consideradas

- **Entrada con fundido y subida en cada sección y cada tarjeta:** es el movimiento genérico; en una herramienta que se abre muchas veces al día cansa y retrasa la lectura [F72].
- **Una librería (Framer Motion):** más control, pero más JavaScript y componentes de cliente para lo que cabe en CSS y en `ViewTransition`.
- **Animar las cifras (contar desde cero):** cambia el texto mientras se lee y obliga a JavaScript en el cliente.
