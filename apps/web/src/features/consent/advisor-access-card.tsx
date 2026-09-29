'use client';

import { useActionState, useEffect, useRef, useState } from 'react';

import type { Messages } from '@miluca/i18n';

import { secondaryButton } from '@/components/ui-classes';
import type { Addressed } from '@/lib/address';

import type { AccessState } from './actions';

type PrivacyText = Addressed<Messages['privacy']>;

/**
 * P-C11, acceso del asesor: estado en texto y símbolo, retirar (con confirmación) o devolver. El
 * estado llega del servidor; la página se vuelve a pedir tras cada cambio.
 */
export function AdvisorAccessCard({
  advisorName,
  status,
  text,
  action,
}: {
  advisorName: string;
  status: 'active' | 'revoked';
  text: PrivacyText;
  /** `setAdvisorAccess` con el asesor ya fijado; recibe el estado nuevo. */
  action: (status: 'active' | 'revoked') => Promise<AccessState>;
}) {
  const [state, formAction, pending] = useActionState(
    (_previous: AccessState | null, formData: FormData) =>
      action(formData.get('status') === 'active' ? 'active' : 'revoked'),
    null,
  );
  const [confirming, setConfirming] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const active = status === 'active';

  // Al pedir confirmación, el foco va a confirmar; al cancelar o al terminar, al botón principal.
  const returnFocusRef = useRef(false);
  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
    else if (returnFocusRef.current) actionRef.current?.focus();
    returnFocusRef.current = false;
  }, [confirming]);
  useEffect(() => {
    if (state?.status) actionRef.current?.focus();
  }, [state]);

  function cancel() {
    returnFocusRef.current = true;
    setConfirming(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p translate="no" className="font-medium wrap-anywhere">
          {advisorName}
        </p>
        <p className="inline-flex items-center gap-2 text-sm">
          <span
            aria-hidden="true"
            className={`size-3 rounded-full ${active ? 'bg-status-ok' : 'border-2 border-text-muted'}`}
          />
          {text.access[status]}
        </p>
      </div>
      <p className="text-text-muted">{active ? text.activeHint : text.revokedHint}</p>

      {confirming && active ? (
        <form
          action={(formData) => {
            setConfirming(false);
            formAction(formData);
          }}
          className="flex flex-col gap-3 rounded-xl border border-status-alert p-3"
        >
          <input type="hidden" name="status" value="revoked" />
          <p>{text.revokeConfirm}</p>
          <button ref={confirmRef} type="submit" className={`w-full ${secondaryButton}`}>
            {text.revokeYes}
          </button>
          <button type="button" onClick={cancel} className={`w-full ${secondaryButton}`}>
            {text.revokeCancel}
          </button>
        </form>
      ) : active ? (
        <button
          ref={actionRef}
          type="button"
          disabled={pending}
          onClick={() => setConfirming(true)}
          className={`w-full ${secondaryButton}`}
        >
          {pending ? text.saving : text.revoke}
        </button>
      ) : (
        <form action={formAction}>
          <input type="hidden" name="status" value="active" />
          <button
            ref={actionRef}
            type="submit"
            disabled={pending}
            className={`w-full ${secondaryButton}`}
          >
            {pending ? text.saving : text.restore}
          </button>
        </form>
      )}
      <p aria-live="polite" className="text-sm">
        {state?.error
          ? text.errors.unavailable
          : state?.status === 'revoked'
            ? text.revokedDone
            : state?.status === 'active'
              ? text.restoredDone
              : null}
      </p>
    </div>
  );
}
