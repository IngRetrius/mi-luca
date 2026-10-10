'use client';

import { useActionState } from 'react';

import { textButton } from '@/components/ui-classes';

import type { StageToggleState } from './actions';

/**
 * Omitir un paso opcional o deshacer la omisión (ADR 0029): un botón que se desactiva mientras la
 * acción corre y avisa si falló. El nombre accesible lleva el paso, porque la lista tiene varios
 * botones iguales. Los textos llegan resueltos desde el servidor.
 */
export function StepSkip({
  action,
  label,
  stepLabel,
  pendingLabel,
  errorText,
}: {
  action: (previous: StageToggleState) => Promise<StageToggleState>;
  label: string;
  stepLabel: string;
  pendingLabel: string;
  errorText: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex shrink-0 flex-col items-end">
      <button
        type="submit"
        disabled={pending}
        aria-label={`${pending ? pendingLabel : label}: ${stepLabel}`}
        className={`${textButton} disabled:opacity-70`}
      >
        {pending ? pendingLabel : label}
      </button>
      {state === 'error' ? (
        <p role="alert" className="px-3 pb-2 text-right text-sm text-status-alert">
          {errorText}
        </p>
      ) : null}
    </form>
  );
}
