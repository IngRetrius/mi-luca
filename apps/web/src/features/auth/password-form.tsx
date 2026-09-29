'use client';

import { useActionState, useEffect, useId, useRef, useState } from 'react';

import { primaryButton, textButton, textField } from '@/components/ui-classes';

import { signInWithPassword, type SignInField } from './actions';
import type { AuthText } from './text';

/** Correo y contraseña. Se puede pegar y usar gestores de contraseñas (ADR 0009). */
export function PasswordForm({ next, text }: { next: string; text: AuthText }) {
  const [state, formAction, pending] = useActionState(signInWithPassword, null);
  const [visible, setVisible] = useState(false);
  const errorId = useId();
  const emailId = useId();
  const passwordId = useId();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const isInvalid = (field: SignInField) => state?.invalidFields.includes(field) ?? false;

  // El resultado llega del servidor después del envío, así que el foco se mueve cuando se muestra:
  // al primer campo marcado que esté vacío (la contraseña se borra al reenviar), o al primero marcado.
  useEffect(() => {
    if (!state) return;
    const refs = { email: emailRef, password: passwordRef };
    const fields = state.invalidFields.map((field) => refs[field].current);
    const target = fields.find((input) => input && !input.value) ?? fields[0];
    target?.focus();
  }, [state]);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <div className="flex flex-col gap-1">
        <label htmlFor={emailId} className="font-medium">
          {text.email}
        </label>
        <input
          ref={emailRef}
          id={emailId}
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          defaultValue={state?.email}
          aria-invalid={isInvalid('email')}
          aria-describedby={errorId}
          className={textField}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={passwordId} className="font-medium">
          {text.password}
        </label>
        <div className="flex gap-2">
          <input
            ref={passwordRef}
            id={passwordId}
            name="password"
            type={visible ? 'text' : 'password'}
            autoComplete="current-password"
            required
            aria-invalid={isInvalid('password')}
            aria-describedby={errorId}
            className={textField}
          />
          <button
            type="button"
            onClick={() => setVisible((value) => !value)}
            aria-label={visible ? text.hidePasswordLabel : text.showPasswordLabel}
            aria-controls={passwordId}
            className={`shrink-0 ${textButton}`}
          >
            {visible ? text.hidePassword : text.showPassword}
          </button>
        </div>
        {/* Siempre presente y vacía hasta que haya un error: así los lectores de pantalla lo anuncian. */}
        <p id={errorId} aria-live="polite" className="text-sm text-status-alert">
          {state ? text.errors[state.error] : null}
        </p>
      </div>
      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? text.submitting : text.submit}
      </button>
    </form>
  );
}
