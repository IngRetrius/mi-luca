'use client';

import Link from 'next/link';
import { useActionState, useEffect, useId, useRef, useState } from 'react';

import type { Messages } from '@miluca/i18n';

import {
  focusRing,
  primaryButton,
  secondaryButton,
  textButton,
  textField,
} from '@/components/ui-classes';
import { EMAIL_MAX } from '@/lib/email';
import { PASSWORD_MIN } from '@/lib/password';

import { recoverPassword, type RecoveryStep } from './recovery-actions';

type RecoveryText = Messages['recovery'];
type ToggleText = Pick<
  Messages['auth'],
  'showPassword' | 'hidePassword' | 'showPasswordLabel' | 'hidePasswordLabel'
>;

const STEP_NUMBER: Record<RecoveryStep, number> = { email: 1, code: 2, password: 3 };

/**
 * P-G05 en tres pasos sobre la misma pantalla: no sale de la app instalada (ADR 0009). Al cambiar de
 * paso, el foco va al campo nuevo; con un error, al campo que hay que corregir.
 */
export function RecoveryForm({ text, toggleText }: { text: RecoveryText; toggleText: ToggleText }) {
  const [state, formAction, pending] = useActionState(recoverPassword, null);
  const [visible, setVisible] = useState(false);
  const fieldRef = useRef<HTMLInputElement>(null);
  const fieldId = useId();
  const hintId = useId();
  const messageId = useId();
  const step = state?.step ?? 'email';
  const email = state?.email ?? '';

  useEffect(() => {
    if (state) fieldRef.current?.focus();
  }, [state]);

  const message = state?.error ? text.errors[state.error] : state?.resent ? text.resent : null;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <p className="text-sm text-text-muted">
        {text.step.replace('{n}', String(STEP_NUMBER[step]))}
      </p>

      {step === 'email' ? (
        <>
          <p id={hintId}>{text.emailIntro}</p>
          <div className="flex flex-col gap-1">
            <label htmlFor={fieldId} className="font-medium">
              {text.email}
            </label>
            <input
              ref={fieldRef}
              id={fieldId}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={EMAIL_MAX}
              required
              defaultValue={email}
              aria-invalid={state?.error === 'missingEmail' || state?.error === 'invalidEmail'}
              aria-describedby={`${hintId} ${messageId}`}
              className={textField}
            />
          </div>
        </>
      ) : null}

      {step === 'code' ? (
        <>
          <input type="hidden" name="email" value={email} />
          <p id={hintId} className="wrap-anywhere">
            {text.codeIntro.replace('{email}', email)}
          </p>
          <div className="flex flex-col gap-1">
            <label htmlFor={fieldId} className="font-medium">
              {text.code}
            </label>
            <input
              ref={fieldRef}
              id={fieldId}
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              required
              aria-invalid={state?.error === 'invalidCode'}
              aria-describedby={`${hintId} ${messageId}`}
              className={`${textField} tabular-nums tracking-[0.3em]`}
            />
          </div>
        </>
      ) : null}

      {step === 'password' ? (
        <>
          {/* Para que el gestor de contraseñas guarde la nueva con su cuenta. */}
          <input type="hidden" name="username" autoComplete="username" value={email} />
          <p id={hintId}>{text.passwordIntro}</p>
          <div className="flex flex-col gap-1">
            <label htmlFor={fieldId} className="font-medium">
              {text.newPassword}
            </label>
            <p className="text-sm text-text-muted">{text.passwordHint}</p>
            <div className="flex gap-2">
              <input
                ref={fieldRef}
                id={fieldId}
                name="password"
                type={visible ? 'text' : 'password'}
                autoComplete="new-password"
                minLength={PASSWORD_MIN}
                required
                aria-invalid={state?.error !== null && state?.error !== 'unavailable'}
                aria-describedby={`${hintId} ${messageId}`}
                className={textField}
              />
              <button
                type="button"
                onClick={() => setVisible((value) => !value)}
                aria-label={visible ? toggleText.hidePasswordLabel : toggleText.showPasswordLabel}
                aria-controls={fieldId}
                className={`shrink-0 ${textButton}`}
              >
                {visible ? toggleText.hidePassword : toggleText.showPassword}
              </button>
            </div>
          </div>
        </>
      ) : null}

      {/* Siempre presente y vacía hasta que haya algo que decir: así los lectores de pantalla lo anuncian. */}
      <p
        id={messageId}
        aria-live="polite"
        className={`text-sm ${state?.error ? 'text-status-alert' : ''}`}
      >
        {message}
      </p>

      {/* El botón que envía dice qué paso se ejecuta; Enter usa el primero, que es el principal. */}
      <button type="submit" name="step" value={step} disabled={pending} className={primaryButton}>
        {step === 'email'
          ? pending
            ? text.sending
            : text.sendCode
          : step === 'code'
            ? pending
              ? text.verifying
              : text.verify
            : pending
              ? text.saving
              : text.save}
      </button>
      {step === 'code' ? (
        <>
          <button
            type="submit"
            name="step"
            value="resend"
            formNoValidate
            disabled={pending}
            className={secondaryButton}
          >
            {text.resend}
          </button>
          <button
            type="submit"
            name="step"
            value="restart"
            formNoValidate
            disabled={pending}
            className={`self-start ${textButton}`}
          >
            {text.otherEmail}
          </button>
        </>
      ) : null}
      <Link
        href="/entrar"
        className={`self-start rounded text-link underline hover:no-underline active:opacity-80 ${focusRing}`}
      >
        {text.backToSignIn}
      </Link>
    </form>
  );
}
