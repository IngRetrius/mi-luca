'use client';

import { useActionState } from 'react';

import type { StageToggleState } from './actions';

/**
 * Activar u ocultar una etapa (ADR 0025): un botón que se desactiva mientras la acción corre y
 * avisa si falló. Los textos llegan resueltos desde el servidor.
 */
export function StageToggle({
  action,
  label,
  pendingLabel,
  errorText,
  hint,
  buttonClassName,
}: {
  action: (previous: StageToggleState) => Promise<StageToggleState>;
  label: string;
  pendingLabel: string;
  errorText: string;
  hint?: string;
  buttonClassName: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <button type="submit" disabled={pending} className={`${buttonClassName} disabled:opacity-70`}>
        {pending ? pendingLabel : label}
      </button>
      {hint ? <p className="text-sm text-text-muted">{hint}</p> : null}
      {state === 'error' ? (
        <p role="alert" className="text-sm text-status-alert">
          {errorText}
        </p>
      ) : null}
    </form>
  );
}
