'use client';

import { useActionState, useEffect, useId, useState } from 'react';

import type { Messages } from '@miluca/i18n';

import { FormSubmitActions } from '@/components/form-actions';
import { describedBy, Field } from '@/components/form-field';
import { choiceCard, choiceInput, textField } from '@/components/ui-classes';
import { useUnsavedWarning } from '@/components/use-unsaved-warning';

import type { InstallmentState } from './actions';
import type { InstallmentField, InstallmentValues } from './installment-validation';

const FIELD_ORDER: readonly InstallmentField[] = [
  'paid',
  'paidOn',
  'customPayment',
  'extraPayment',
];

/** La marca de una cuota (RN-099): pagada con su fecha real, cuota distinta y abono extra. */
export function InstallmentForm({
  text,
  initial,
  action,
  cancelHref,
}: {
  text: Messages['credits']['form'];
  initial: InstallmentValues;
  action: (previous: InstallmentState | null, formData: FormData) => Promise<InstallmentState>;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const values = state?.values ?? initial;
  const errors = state?.errors ?? {};
  const formId = useId();
  const fieldId = (field: InstallmentField) => `${formId}-${field}`;
  const [dirty, setDirty] = useState(false);
  const [paid, setPaid] = useState(values.paid === 'si');
  useUnsavedWarning(dirty, pending);

  useEffect(() => {
    if (!state) return;
    const first = FIELD_ORDER.find((field) => state.errors[field]);
    if (first) document.getElementById(`${formId}-${first}`)?.focus();
  }, [state, formId]);

  const errorText = (field: InstallmentField) => {
    const error = errors[field];
    return error ? text.errors[error] : null;
  };
  const amountField = (field: 'customPayment' | 'extraPayment', label: string, hint: string) => (
    <Field id={fieldId(field)} label={label} hint={hint} error={errorText(field)}>
      <input
        id={fieldId(field)}
        name={field}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        defaultValue={values[field]}
        aria-invalid={errors[field] ? true : false}
        aria-describedby={describedBy(fieldId(field), true)}
        className={`${textField} text-right tabular-nums`}
      />
    </Field>
  );

  return (
    <form
      action={formAction}
      onChange={() => setDirty(true)}
      noValidate
      className="flex flex-1 flex-col gap-6"
    >
      {state?.formError ? (
        <p role="alert" className="rounded-xl border border-status-alert p-4">
          {text.errors[state.formError]}
        </p>
      ) : null}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium">{text.paid}</legend>
        <div className="grid grid-cols-2 gap-3">
          {(['si', 'no'] as const).map((option) => (
            <label key={option} className={choiceCard}>
              <input
                id={option === 'si' ? fieldId('paid') : undefined}
                type="radio"
                name="paid"
                value={option}
                defaultChecked={values.paid === option}
                onChange={() => setPaid(option === 'si')}
                className={choiceInput}
              />
              {option === 'si' ? text.paidYes : text.paidNo}
            </label>
          ))}
        </div>
      </fieldset>

      {paid ? (
        <Field id={fieldId('paidOn')} label={text.paidOn} error={errorText('paidOn')}>
          <input
            id={fieldId('paidOn')}
            name="paidOn"
            type="date"
            defaultValue={values.paidOn}
            aria-invalid={errors.paidOn ? true : false}
            aria-describedby={describedBy(fieldId('paidOn'), false)}
            className={textField}
          />
        </Field>
      ) : null}

      {amountField('customPayment', text.customPayment, text.customPaymentHint)}
      {amountField('extraPayment', text.extraPayment, text.extraPaymentHint)}

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
