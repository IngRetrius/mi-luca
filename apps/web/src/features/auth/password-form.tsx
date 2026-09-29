'use client';

import { useActionState, useId, useState } from 'react';

import { messages } from '@miluca/i18n';

import { signInWithPassword } from './actions';

const t = messages.es.auth;

const fieldClass =
  'min-h-12 w-full rounded-xl border border-border bg-bg px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

/** Correo y contraseña. Se puede pegar y usar gestores de contraseñas (ADR 0009). */
export function PasswordForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signInWithPassword, null);
  const [visible, setVisible] = useState(false);
  const errorId = useId();
  const passwordId = useId();

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <label className="flex flex-col gap-1">
        <span className="font-medium">{t.email}</span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          defaultValue={state?.email}
          aria-describedby={state ? errorId : undefined}
          className={fieldClass}
        />
      </label>
      <div className="flex flex-col gap-1">
        <label htmlFor={passwordId} className="font-medium">
          {t.password}
        </label>
        <div className="flex gap-2">
          <input
            id={passwordId}
            name="password"
            type={visible ? 'text' : 'password'}
            autoComplete="current-password"
            required
            aria-describedby={state ? errorId : undefined}
            className={fieldClass}
          />
          <button
            type="button"
            onClick={() => setVisible((value) => !value)}
            aria-pressed={visible}
            aria-controls={passwordId}
            className="min-h-12 shrink-0 rounded-xl px-3 text-link focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {visible ? t.hidePassword : t.showPassword}
          </button>
        </div>
      </div>
      {state && (
        <p id={errorId} role="alert" className="text-sm text-status-alert">
          {t.errors[state.error]}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="min-h-12 rounded-xl bg-primary px-4 font-medium text-on-primary disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {pending ? t.submitting : t.submit}
      </button>
    </form>
  );
}
