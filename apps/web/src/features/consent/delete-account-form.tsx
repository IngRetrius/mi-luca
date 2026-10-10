'use client';

import Link from 'next/link';
import { useActionState, useEffect, useId, useRef } from 'react';

import type { Messages } from '@miluca/i18n';

import { ScreenActions } from '@/components/screen';
import { dangerButton, linkButton, textButton } from '@/components/ui-classes';
import type { Addressed } from '@/lib/address';

import type { DeleteAccountState } from './actions';

type DeleteText = Addressed<Messages['privacy']['deleteAccount']>;

/**
 * P-C14: la casilla "Entiendo que se borra todo" y el botón para borrar la cuenta. Sin JavaScript
 * también funciona; con él, el error se anuncia y el foco vuelve a la casilla.
 */
export function DeleteAccountForm({
  text,
  action,
  cancelHref,
}: {
  text: DeleteText;
  action: (previous: DeleteAccountState | null, formData: FormData) => Promise<DeleteAccountState>;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const confirmId = useId();
  const errorId = useId();
  const confirmRef = useRef<HTMLInputElement>(null);
  const error = state?.error ?? null;

  useEffect(() => {
    if (state?.error) confirmRef.current?.focus();
  }, [state]);

  return (
    <form action={formAction} noValidate className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-1">
        <label
          htmlFor={confirmId}
          className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary ${error === 'unconfirmed' ? 'border-status-alert' : 'border-border'}`}
        >
          <input
            ref={confirmRef}
            id={confirmId}
            name="confirm"
            type="checkbox"
            value="yes"
            required
            aria-invalid={error === 'unconfirmed' ? true : false}
            aria-describedby={errorId}
            className="mt-0.5 size-5 shrink-0 accent-primary"
          />
          {text.confirm}
        </label>
        {/* Siempre presente y vacía hasta que haya un error: así los lectores de pantalla lo anuncian. */}
        <p id={errorId} aria-live="polite" className="text-sm text-status-alert">
          {error ? text.errors[error] : null}
        </p>
      </div>
      <ScreenActions>
        <button type="submit" disabled={pending} className={`w-full ${dangerButton}`}>
          {pending ? text.submitting : text.submit}
        </button>
        <Link href={cancelHref} className={`w-full ${textButton} ${linkButton}`}>
          {text.cancel}
        </Link>
      </ScreenActions>
    </form>
  );
}
