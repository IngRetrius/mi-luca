import { ViewTransition, type ReactNode } from 'react';

/** Tipos de transición para `<Link transitionTypes>` (ADR 0031). */
export const NAV_FORWARD = ['nav-forward'];
export const NAV_BACK = ['nav-back'];

/**
 * El movimiento entre pantallas de la app (ADR 0031), con las transiciones de vista del navegador
 * [F80]. Entrar a algo (una tarjeta, un paso) desliza el contenido hacia adelante; "volver", hacia
 * atrás. Cualquier otro cambio de pantalla (guardar y volver a la lista, el esqueleto de carga que
 * da paso al contenido, el botón atrás del navegador) es un fundido corto. Actualizar la misma
 * pantalla no se anima. Va en cada pantalla y no en el layout: el layout no se desmonta al navegar.
 * Sin soporte del navegador, o con "reducir movimiento", la pantalla cambia sin animación.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      enter={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'page-fade' }}
      exit={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'page-fade' }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
