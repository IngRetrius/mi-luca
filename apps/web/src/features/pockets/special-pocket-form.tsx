'use client';

import { useActionState, useId } from 'react';

import { FormSubmitActions } from '@/components/form-actions';
import { describedBy, Field } from '@/components/form-field';
import { textField } from '@/components/ui-classes';

import type { SpecialPocketState } from './actions';

export interface SpecialPocketFormText {
  readonly bank: string;
  readonly bankHint: string;
  readonly noBank: string;
  readonly submit: string;
  readonly submitting: string;
  readonly cancel: string;
  readonly errors: Readonly<Record<NonNullable<SpecialPocketState['formError']>, string>>;
}

/** El banco del bolsillo del fondo o de meses sin ingreso. */
export function SpecialPocketForm({
  text,
  initialBank,
  banks,
  action,
  cancelHref,
}: {
  text: SpecialPocketFormText;
  initialBank: string;
  banks: readonly { readonly id: string; readonly name: string }[];
  action: (previous: SpecialPocketState | null, formData: FormData) => Promise<SpecialPocketState>;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const id = `${useId()}-bank`;
  const error = state?.formError === 'invalidBank' ? text.errors.invalidBank : null;
  return (
    <form action={formAction} noValidate className="flex flex-1 flex-col gap-6">
      {state?.formError && state.formError !== 'invalidBank' ? (
        <p role="alert" className="rounded-xl border border-status-alert p-4">
          {text.errors[state.formError]}
        </p>
      ) : null}
      <Field id={id} label={text.bank} hint={text.bankHint} error={error}>
        <select
          id={id}
          name="bank"
          defaultValue={state?.bank ?? initialBank}
          aria-invalid={error ? true : false}
          aria-describedby={describedBy(id, true)}
          className={textField}
        >
          <option value="">{text.noBank}</option>
          {banks.map((bank) => (
            <option key={bank.id} value={bank.id}>
              {bank.name}
            </option>
          ))}
        </select>
      </Field>
      <FormSubmitActions
        pending={pending}
        submit={text.submit}
        submitting={text.submitting}
        cancel={text.cancel}
        cancelHref={cancelHref}
      />
    </form>
  );
}
