'use client';

import { createContext, use, useId, useState, type ReactNode } from 'react';

import { focusRing } from './ui-classes';

interface HelpContextValue {
  readonly open: boolean;
  readonly toggle: () => void;
  readonly close: () => void;
  readonly panelId: string;
  /** Nombre accesible del botón, por ejemplo "Qué significa: Umbral de deuda cara". */
  readonly label: string;
}

const HelpContext = createContext<HelpContextValue | null>(null);

function useHelp(): HelpContextValue {
  const value = use(HelpContext);
  if (!value) throw new Error('HelpButton y HelpPanel van dentro de Help');
  return value;
}

/**
 * Ayuda de un dato (patrón de divulgación): `HelpButton` abre y cierra `HelpPanel` con clic, toque
 * o teclado, y Escape la cierra. No agrega nada al DOM: el botón va junto a la etiqueta y el panel
 * debajo, donde quepa en cada pantalla. No se abre al pasar el puntero: en el celular no existe y
 * movería el contenido.
 */
export function Help({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <HelpContext
      value={{
        open,
        toggle: () => setOpen((current) => !current),
        close: () => setOpen(false),
        panelId,
        label,
      }}
    >
      {children}
    </HelpContext>
  );
}

const helpIcon = (
  <svg
    aria-hidden="true"
    viewBox="0 0 20 20"
    className="size-5"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
  >
    <circle cx="10" cy="10" r="8" />
    <path
      d="M7.75 7.9a2.25 2.25 0 1 1 3.1 2.08c-.5.2-.85.68-.85 1.22v.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="10" cy="14.3" r="1" fill="currentColor" stroke="none" />
  </svg>
);

/** El signo de pregunta, con 44 px de zona táctil sin agrandar la fila. */
export function HelpButton() {
  const { open, toggle, close, panelId, label } = useHelp();
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={panelId}
      aria-label={label}
      onClick={toggle}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault();
          close();
        }
      }}
      className={`-my-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-link transition-colors hover:bg-surface active:bg-surface aria-expanded:bg-surface ${focusRing}`}
    >
      {helpIcon}
    </button>
  );
}

/** La explicación: está en la página desde el servidor y se muestra solo abierta. */
export function HelpPanel({ children }: { children: ReactNode }) {
  const { open, panelId } = useHelp();
  return (
    <div id={panelId} hidden={!open} className="rounded-xl bg-surface p-3 text-sm">
      {children}
    </div>
  );
}
