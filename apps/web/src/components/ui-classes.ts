/**
 * Clases de Tailwind compartidas por los controles de la app, con los colores de los tokens de
 * packages/ui. Mientras no existan componentes base en packages/ui, así se mantienen iguales el
 * foco, el paso del puntero y la respuesta al toque en todas las pantallas.
 */

/** Foco visible solo con teclado (WCAG 2.4.7). */
export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

/**
 * Al tocarlo, el botón se hunde un poco (ADR 0031): responde al toque sin esperar a la acción. Con
 * "reducir movimiento", solo cambia el color.
 */
const press =
  'transition-[color,background-color,border-color,scale] motion-safe:active:scale-[0.98]';

const control = `min-h-12 rounded-xl px-4 font-medium ${press} ${focusRing}`;

/** Acción principal de la pantalla. */
export const primaryButton = `${control} bg-primary text-on-primary hover:bg-primary/90 active:bg-primary/80 disabled:opacity-70`;

/** Acción secundaria con borde; al pasar el puntero o tocar, el borde gana contraste. */
export const secondaryButton = `${control} border border-border hover:border-text-muted active:border-text`;

/** Acción principal de las páginas públicas de la marca (ADR 0026): el marino del logo. */
export const brandButton = `${control} bg-brand text-on-brand hover:bg-brand/90 active:bg-brand/80`;

/** Acción secundaria de las páginas públicas: borde y texto del color de los enlaces. */
export const brandSecondaryButton = `${control} border border-link text-link hover:bg-link/10 active:bg-link/15`;

/** Acción de texto, como un enlace. */
export const textButton = `min-h-12 rounded-xl px-3 text-link hover:underline active:opacity-80 ${focusRing}`;

/** Campo de texto. `min-w-0` deja que se encoja dentro de una fila flex en pantallas de 320 px. */
export const textField = `min-h-12 w-full min-w-0 rounded-xl border border-border bg-bg px-3 transition-colors hover:border-text-muted aria-[invalid=true]:border-status-alert ${focusRing}`;

/** Enlace con forma de botón: centra el texto como un `<button>`. */
export const linkButton = 'inline-flex items-center justify-center text-center';

/** Opción de un grupo de radios como tarjeta: todo el recuadro responde al toque. */
export const choiceCard = `flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 transition-colors hover:border-text-muted has-[:checked]:border-primary has-[:checked]:bg-surface has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary`;

/** Radio dentro de `choiceCard`, con el color primario de los tokens. */
export const choiceInput = 'size-5 shrink-0 accent-primary';

/**
 * Lista de enlaces o filas pares: en el celular, un recuadro con divisores; desde la tableta,
 * tarjetas en rejilla (se elige el número de columnas con `md:grid-cols-*`). Cada `<li>` lleva
 * `gridListItem`.
 */
export const gridList =
  'flex flex-col divide-y divide-border rounded-xl border border-border md:grid md:gap-3 md:divide-y-0 md:rounded-none md:border-0';

/** Elemento de `gridList`: tarjeta con borde propio desde la tableta. */
export const gridListItem = 'md:rounded-xl md:border md:border-border';
