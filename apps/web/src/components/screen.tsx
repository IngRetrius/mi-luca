import type { ReactNode } from 'react';

import { PageTransition } from './page-transition';

const frame = 'mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-8 md:px-8 md:pt-12';

/**
 * Marco de una pantalla de la app: una columna centrada, pensada primero para el celular. Desde la
 * tableta se ensancha hasta un ancho cómodo de lectura; los formularios no pasan de ahí.
 */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <PageTransition>
      <main className={`${frame} md:max-w-2xl`}>{children}</main>
    </PageTransition>
  );
}

/**
 * Marco de una pantalla de resumen (la ficha del cliente, el flujo, el presupuesto, las listas):
 * igual que `Screen` en el celular y la tableta; en el escritorio usa el ancho para poner en
 * columnas lo que son elementos pares.
 */
export function WideScreen({ children }: { children: ReactNode }) {
  return (
    <PageTransition>
      <main className={`${frame} md:max-w-3xl lg:max-w-6xl`}>{children}</main>
    </PageTransition>
  );
}

/**
 * Acción principal fija abajo, al alcance del pulgar (05-pantallas-y-flujos, principio "Una mano").
 * El relleno inferior respeta la barra de inicio del iPhone. Con ella en pantalla, globals.css deja
 * margen abajo al desplazar hacia un campo enfocado, para que la barra no lo tape.
 *
 * Desde la tableta los botones van en fila a la derecha, con su ancho natural y en el orden del
 * código (el mismo del tabulador); un texto (total, estado o error) ocupa su propia línea encima.
 */
export function ScreenActions({ children }: { children: ReactNode }) {
  return (
    <div
      data-screen-actions
      className="sticky bottom-0 -mx-4 mt-auto flex flex-col gap-3 border-t border-border bg-bg px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:-mx-8 md:flex-row md:flex-wrap md:items-center md:justify-end md:px-8 md:*:w-auto md:*:min-w-40 md:[&>p]:basis-full"
    >
      {children}
    </div>
  );
}
