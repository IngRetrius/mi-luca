import type { ReactNode } from 'react';

/** Marco de una pantalla de la app: una columna centrada, pensada primero para el celular. */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-8">{children}</main>
  );
}

/**
 * Acción principal fija abajo, al alcance del pulgar (05-pantallas-y-flujos, principio "Una mano").
 * El relleno inferior respeta la barra de inicio del iPhone. Con ella en pantalla, globals.css deja
 * margen abajo al desplazar hacia un campo enfocado, para que la barra no lo tape.
 */
export function ScreenActions({ children }: { children: ReactNode }) {
  return (
    <div
      data-screen-actions
      className="sticky bottom-0 -mx-4 mt-auto flex flex-col gap-3 border-t border-border bg-bg px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      {children}
    </div>
  );
}
