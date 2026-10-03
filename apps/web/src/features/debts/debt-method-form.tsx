'use client';

import { startTransition, useActionState, useId, useState } from 'react';

import type { DebtMethod } from '@miluca/domain';
import type { Messages } from '@miluca/i18n';

import { secondaryButton, textField } from '@/components/ui-classes';

import type { DebtMethodState } from './actions';

const METHODS: readonly DebtMethod[] = ['avalancha', 'bola_de_nieve', 'manual'];

/** Método de pago de las deudas (RN-091), solo para el asesor. Guarda sin salir de la pantalla. */
export function DebtMethodForm({
  text,
  methods,
  current,
  action,
}: {
  text: Messages['debts']['methodForm'];
  methods: Messages['debts']['plan']['methods'];
  current: DebtMethod;
  action: (previous: DebtMethodState, formData: FormData) => Promise<DebtMethodState>;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const id = useId();
  // Con `action={...}` React reinicia el formulario al terminar y el selector volvería al método
  // con que se abrió la pantalla: se envía desde onSubmit, en una transición, y queda lo elegido.
  const [selected, setSelected] = useState(current);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => formAction(data));
      }}
      className="flex flex-col gap-2"
    >
      <label htmlFor={id} className="font-medium">
        {text.label}
      </label>
      <p id={`${id}-hint`} className="text-sm text-text-muted">
        {text.hint}
      </p>
      <div className="flex flex-wrap gap-3">
        <select
          id={id}
          name="method"
          value={selected}
          onChange={(event) => setSelected(event.target.value as DebtMethod)}
          aria-describedby={`${id}-hint ${id}-status`}
          className={`${textField} flex-1 basis-60`}
        >
          {METHODS.map((method) => (
            <option key={method} value={method}>
              {methods[method]}
            </option>
          ))}
        </select>
        <button type="submit" disabled={pending} className={secondaryButton}>
          {pending ? text.submitting : text.submit}
        </button>
      </div>
      <p
        id={`${id}-status`}
        aria-live="polite"
        className={`text-sm ${state === 'error' ? 'text-status-alert' : 'text-text-muted'}`}
      >
        {state === 'saved' ? text.saved : state === 'error' ? text.error : null}
      </p>
    </form>
  );
}
