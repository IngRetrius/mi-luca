'use client';

import Link from 'next/link';
import { useActionState, useEffect, useId, useRef } from 'react';

import type { Messages } from '@miluca/i18n';

import { dangerButton, linkButton, textButton, textField } from '@/components/ui-classes';

import type { DeleteClientState } from './actions';
import { DISPLAY_NAME_MAX } from './validation';

type DeleteText = Messages['clientProfile']['delete'];

/**
 * P-A27: escribir el nombre del perfil y borrarlo para siempre. Sin JavaScript también funciona; con
 * él, el error se anuncia y el foco vuelve al campo. Los botones van en el contenido y no en la
 * barra fija: en una pantalla tan corta, la barra queda sobre el espacio del asistente y este la
 * tapaba.
 */
export function DeleteClientForm({
  displayName,
  cancelHref,
  text,
  action,
}: {
  displayName: string;
  cancelHref: string;
  text: DeleteText;
  /** `deleteUnclaimedClient` con el perfil ya fijado. */
  action: (previous: DeleteClientState | null, formData: FormData) => Promise<DeleteClientState>;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const nameId = useId();
  const hintId = useId();
  const errorId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const error = state?.error ?? null;
  const [hintBefore, hintAfter = ''] = text.nameHint.split('{name}');

  // Tras un error, el foco vuelve al nombre para corregirlo o reintentar.
  useEffect(() => {
    if (state?.error) nameRef.current?.focus();
  }, [state]);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <label htmlFor={nameId} className="font-medium">
          {text.nameLabel}
        </label>
        <p id={hintId} className="text-sm text-text-muted">
          {hintBefore}
          <span translate="no" className="font-medium wrap-anywhere text-text">
            {displayName}
          </span>
          {hintAfter}
        </p>
        <input
          ref={nameRef}
          id={nameId}
          name="name"
          type="text"
          autoComplete="off"
          autoCapitalize="words"
          spellCheck={false}
          maxLength={DISPLAY_NAME_MAX}
          required
          defaultValue={state?.typed ?? ''}
          aria-invalid={error === 'nameMismatch' ? true : false}
          aria-describedby={`${hintId} ${errorId}`}
          className={textField}
        />
        {/* Siempre presente y vacía hasta que haya un error: así los lectores de pantalla lo anuncian. */}
        <p id={errorId} aria-live="polite" className="text-sm text-status-alert">
          {error ? text.errors[error] : null}
        </p>
      </div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <button type="submit" disabled={pending} className={`w-full md:w-auto ${dangerButton}`}>
          {pending ? text.submitting : text.submit}
        </button>
        <Link href={cancelHref} className={`w-full md:w-auto ${textButton} ${linkButton}`}>
          {text.cancel}
        </Link>
      </div>
    </form>
  );
}
