'use client';

import Link from 'next/link';
import { useActionState, useEffect, useId, useRef, useState } from 'react';

import type { Messages } from '@miluca/i18n';

import { primaryButton, textButton, textField } from '@/components/ui-classes';
import type { Addressed } from '@/lib/address';

import { createPasswordAccess } from './client-actions';
import { PASSWORD_MIN } from './validation';

type AccessText = Addressed<Messages['invitation']['access']>;
type ToggleText = Pick<
  Messages['auth'],
  'showPassword' | 'hidePassword' | 'showPasswordLabel' | 'hidePasswordLabel'
>;

/**
 * P-C12, crear contraseña: el correo es el de la invitación y no se cambia (ADR 0009). Se puede
 * pegar y usar gestores de contraseñas; el indicador dice cuántos caracteres faltan.
 */
export function NewPasswordForm({
  email,
  text,
  toggleText,
}: {
  email: string;
  text: AccessText;
  toggleText: ToggleText;
}) {
  const [state, formAction, pending] = useActionState(createPasswordAccess, null);
  const [visible, setVisible] = useState(false);
  const [length, setLength] = useState(0);
  const emailId = useId();
  const emailHintId = useId();
  const passwordId = useId();
  const hintId = useId();
  const lengthId = useId();
  const errorId = useId();
  const passwordRef = useRef<HTMLInputElement>(null);

  const passwordInvalid =
    state !== null && state.error !== 'emailExists' && state.error !== 'unavailable';

  // El resultado llega del servidor después del envío: el foco vuelve a la contraseña si hay que
  // cambiarla.
  useEffect(() => {
    if (!state) return;
    if (state.error !== 'emailExists' && state.error !== 'unavailable')
      passwordRef.current?.focus();
  }, [state]);

  const missing = PASSWORD_MIN - length;
  const lengthText =
    missing <= 0
      ? text.lengthOk
      : missing === 1
        ? text.missingChar
        : text.missingChars.replace('{count}', String(missing));

  return (
    // React vacía el formulario al terminar la acción: el contador vuelve a cero con él.
    <form
      action={formAction}
      onSubmit={() => setLength(0)}
      noValidate
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor={emailId} className="font-medium">
          {text.email}
        </label>
        {/* Visible y de solo lectura: los gestores de contraseñas lo guardan como usuario. */}
        <input
          id={emailId}
          type="email"
          name="email"
          autoComplete="username"
          readOnly
          value={email}
          aria-describedby={emailHintId}
          className={`${textField} bg-surface`}
        />
        <p id={emailHintId} className="text-sm text-text-muted">
          {text.emailHint}
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={passwordId} className="font-medium">
          {text.password}
        </label>
        <p id={hintId} className="text-sm text-text-muted">
          {text.passwordHint}
        </p>
        <div className="flex gap-2">
          <input
            ref={passwordRef}
            id={passwordId}
            name="password"
            type={visible ? 'text' : 'password'}
            autoComplete="new-password"
            minLength={PASSWORD_MIN}
            required
            onChange={(event) => setLength(event.currentTarget.value.length)}
            aria-invalid={passwordInvalid}
            aria-describedby={`${hintId} ${lengthId} ${errorId}`}
            className={textField}
          />
          <button
            type="button"
            onClick={() => setVisible((value) => !value)}
            aria-label={visible ? toggleText.hidePasswordLabel : toggleText.showPasswordLabel}
            aria-controls={passwordId}
            className={`shrink-0 ${textButton}`}
          >
            {visible ? toggleText.hidePassword : toggleText.showPassword}
          </button>
        </div>
        <p id={lengthId} className="text-sm text-text-muted tabular-nums">
          {lengthText}
        </p>
        {/* Siempre presente y vacía hasta que haya un error: así los lectores de pantalla lo anuncian. */}
        <p id={errorId} aria-live="polite" className="text-sm text-status-alert">
          {state ? text.errors[state.error] : null}
        </p>
        {state?.error === 'emailExists' ? (
          <Link
            href={`/entrar?next=${encodeURIComponent('/invitacion/aceptar')}`}
            className={`self-start ${textButton} -ml-3 inline-flex items-center`}
          >
            {text.signInInstead}
          </Link>
        ) : null}
      </div>

      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? text.submitting : text.submit}
      </button>
    </form>
  );
}
