'use client';

import { useActionState, useEffect, useRef, useState } from 'react';

import type { Messages } from '@miluca/i18n';

import { secondaryButton } from '@/components/ui-classes';
import type { Addressed } from '@/lib/address';

import type { WithdrawState } from './actions';

type PrivacyText = Addressed<Messages['privacy']>;

/** P-C11: retirar el consentimiento de datos sensibles, con confirmación. */
export function WithdrawConsent({
  text,
  action,
}: {
  text: PrivacyText;
  /** `withdrawSensitiveConsent` con el consentimiento ya fijado. */
  action: () => Promise<WithdrawState>;
}) {
  const [state, formAction, pending] = useActionState<WithdrawState | null>(() => action(), null);
  const [confirming, setConfirming] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef(false);

  // Al pedir confirmación, el foco va a confirmar; al cancelar, vuelve al botón.
  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
    else if (returnFocusRef.current) openRef.current?.focus();
    returnFocusRef.current = false;
  }, [confirming]);

  return (
    <div className="flex flex-col gap-2">
      {confirming ? (
        <form
          action={() => {
            setConfirming(false);
            formAction();
          }}
          className="flex flex-col gap-3 rounded-xl border border-status-alert p-3"
        >
          <p>{text.withdrawConfirm}</p>
          <button ref={confirmRef} type="submit" className={`w-full ${secondaryButton}`}>
            {text.withdrawYes}
          </button>
          <button
            type="button"
            onClick={() => {
              returnFocusRef.current = true;
              setConfirming(false);
            }}
            className={`w-full ${secondaryButton}`}
          >
            {text.withdrawCancel}
          </button>
        </form>
      ) : (
        <button
          ref={openRef}
          type="button"
          disabled={pending}
          onClick={() => setConfirming(true)}
          className={`self-start ${secondaryButton}`}
        >
          {pending ? text.saving : text.withdraw}
        </button>
      )}
      <p aria-live="polite" className="text-sm">
        {state?.error ? text.errors.unavailable : null}
      </p>
    </div>
  );
}
