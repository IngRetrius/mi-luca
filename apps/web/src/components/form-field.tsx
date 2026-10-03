import type { ReactNode } from 'react';

import { Help, HelpButton, HelpPanel } from './help';

/** Ids que enlazan un control con su ayuda y su error (`aria-describedby`). */
export function describedBy(id: string, hint: boolean, extra = ''): string {
  return [hint ? `${id}-hint` : '', `${id}-error`, extra].filter(Boolean).join(' ');
}

/**
 * Etiqueta, ayuda y error de un campo. El error siempre está presente, aunque vacío, para que los
 * lectores de pantalla lo anuncien cuando aparece. El control va como hijo con `id` y
 * `aria-describedby={describedBy(id, hint !== undefined)}`. Con `help`, un signo de pregunta junto
 * a la etiqueta abre la explicación de qué hace el dato (`Help`); `hint` queda siempre a la vista.
 */
export function Field({
  id,
  label,
  hint,
  help,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  /** `label` es el nombre del botón ("Qué significa: …") y `text`, la explicación. */
  help?: { readonly label: string; readonly text: string };
  error?: string | null;
  children: ReactNode;
}) {
  const labelElement = (
    <label htmlFor={id} className="font-medium">
      {label}
    </label>
  );
  return (
    <div className="flex min-w-0 flex-col gap-1">
      {help ? (
        <Help label={help.label}>
          <div className="flex items-center gap-1">
            {labelElement}
            <HelpButton />
          </div>
          <HelpPanel>{help.text}</HelpPanel>
        </Help>
      ) : (
        labelElement
      )}
      {hint ? (
        <p id={`${id}-hint`} className="text-sm text-text-muted">
          {hint}
        </p>
      ) : null}
      {children}
      <p id={`${id}-error`} aria-live="polite" className="text-sm text-status-alert">
        {error}
      </p>
    </div>
  );
}

/** Grupo de radios o casillas con su leyenda. */
export function ChoiceGroup({
  legend,
  hint,
  children,
}: {
  legend: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 font-medium">{legend}</legend>
      {hint ? <p className="-mt-1 text-sm text-text-muted">{hint}</p> : null}
      {children}
    </fieldset>
  );
}

/** Casilla con su texto y ayuda: toda la fila responde al toque. */
export function Checkbox({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex min-h-12 cursor-pointer items-start gap-3 py-2">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 size-5 shrink-0 accent-primary"
      />
      <span className="flex flex-col">
        {label}
        {hint ? <span className="text-sm text-text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}
