'use client';

import { useActionState, useEffect, useId, useRef, type ReactNode } from 'react';

import type { Messages } from '@miluca/i18n';

import { ScreenActions } from '@/components/screen';
import { choiceCard, choiceInput, primaryButton } from '@/components/ui-classes';
import type { Addressed } from '@/lib/address';

import { giveConsent } from './client-actions';

type ConsentText = Addressed<Messages['invitation']['consent']>;

/**
 * P-C02: casilla obligatoria para el tratamiento de datos y casilla aparte, facultativa, para los
 * datos de salud. Los textos legales llegan ya armados desde el servidor; los ids viajan con el
 * formulario para comprobar que se aceptó la versión que se leyó.
 */
export function ConsentForm({
  text,
  requiredTextId,
  requiredText,
  sensitive,
}: {
  text: ConsentText;
  requiredTextId: string;
  requiredText: ReactNode;
  sensitive: { readonly id: string; readonly text: ReactNode } | null;
}) {
  const [state, formAction, pending] = useActionState(giveConsent, null);
  const errorId = useId();
  const requiredRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.error === 'required') requiredRef.current?.focus();
  }, [state]);

  return (
    <form action={formAction} noValidate className="flex flex-1 flex-col gap-6">
      <input type="hidden" name="requiredTextId" value={requiredTextId} />
      {requiredText}
      <label
        className={`${choiceCard} py-3 ${state?.error === 'required' ? 'border-status-alert' : 'border-border'}`}
      >
        <input
          ref={requiredRef}
          type="checkbox"
          name="acceptRequired"
          required
          aria-invalid={state?.error === 'required' ? true : false}
          aria-describedby={errorId}
          className={choiceInput}
        />
        {text.accept}
      </label>

      {sensitive ? (
        <>
          <input type="hidden" name="sensitiveTextId" value={sensitive.id} />
          {sensitive.text}
          <p className="-mt-3 text-sm text-text-muted">{text.sensitiveIntro}</p>
          <label className={`${choiceCard} border-border py-3`}>
            <input type="checkbox" name="acceptSensitive" className={choiceInput} />
            {text.acceptSensitive}
          </label>
        </>
      ) : null}

      <ScreenActions>
        {/* Junto al botón, siempre a la vista; la casilla lo referencia con aria-describedby. */}
        {state?.error ? (
          <p id={errorId} role="alert" className="text-sm text-status-alert">
            {text.errors[state.error]}
          </p>
        ) : null}
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? text.submitting : text.submit}
        </button>
      </ScreenActions>
    </form>
  );
}
