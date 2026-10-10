import { ViewTransition, type ReactNode } from 'react';

/** Tipos de transición para `<Link transitionTypes>` (ADR 0031). */
export const NAV_FORWARD = ['nav-forward'];
export const NAV_BACK = ['nav-back'];

/** Clase de cada lado según el tipo de la transición; sus animaciones están en `globals.css`. */
export const ENTER_CLASSES = {
  'nav-forward': 'forward-in',
  'nav-back': 'back-in',
  default: 'fade-in',
};
export const EXIT_CLASSES = {
  'nav-forward': 'forward-out',
  'nav-back': 'back-out',
  default: 'fade-out',
};

/**
 * El movimiento entre pantallas de la app (ADR 0031), con las transiciones de vista del navegador
 * [F80]. Entrar a algo (una tarjeta, un paso) desliza el contenido hacia adelante; "volver", hacia
 * atrás. Cualquier otro cambio de pantalla (guardar y volver a la lista, el esqueleto de carga que
 * da paso al contenido, el botón atrás del navegador) es un fundido corto. Actualizar la misma
 * pantalla no se anima. Va en cada pantalla y no en el layout: el layout no se desmonta al navegar.
 * Sin soporte del navegador, o con "reducir movimiento", la pantalla cambia sin animación.
 *
 * Entrar y salir llevan clases distintas para que cada capa de la transición se anime una sola vez.
 * Safari conserva la animación de cada capa (`::view-transition-old(nombre)`) de una transición a
 * la siguiente y React la cancela al terminar; si la entrada animara también la capa vieja, la
 * salida de esa misma pantalla, más tarde, quedaba sin fundido y se cortaba de golpe.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={ENTER_CLASSES} exit={EXIT_CLASSES} default="none">
      {children}
    </ViewTransition>
  );
}
