'use client';

import { useActionState, useEffect, useId, useRef, useState } from 'react';

import type { Messages } from '@miluca/i18n';

import { FormSubmitActions } from '@/components/form-actions';
import { describedBy, Field } from '@/components/form-field';
import { textButton, textField } from '@/components/ui-classes';
import { useUnsavedWarning } from '@/components/use-unsaved-warning';

import type { RealityState } from './actions';
import type { RealityField, RealityValues } from './validation';

const FIELD_ORDER: readonly RealityField[] = ['savingsAgo', 'months', 'savingsToday', 'currency'];

/**
 * P-A08 Prueba de realidad: los tres datos y la moneda de los saldos. Si ya hay cuentas o
 * inversiones registradas, ofrece su total como ahorro de hoy para no escribirlo dos veces (ADR 0028).
 */
export function RealityForm({
  text,
  initial,
  currencies,
  registeredToday,
  action,
  cancelHref,
}: {
  text: Messages['realityCheck']['form'];
  initial: RealityValues;
  currencies: readonly string[];
  /** Lo registrado hoy en cuentas e inversiones, en moneda base: el texto y el valor del campo. */
  registeredToday: { readonly label: string; readonly value: string } | null;
  action: (previous: RealityState | null, formData: FormData) => Promise<RealityState>;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const values = state?.values ?? initial;
  const errors = state?.errors ?? {};
  const formId = useId();
  const fieldId = (field: RealityField) => `${formId}-${field}`;
  const [dirty, setDirty] = useState(false);
  const todayRef = useRef<HTMLInputElement>(null);
  useUnsavedWarning(dirty, pending);

  useEffect(() => {
    if (!state) return;
    const first = FIELD_ORDER.find((field) => state.errors[field]);
    if (first) document.getElementById(`${formId}-${first}`)?.focus();
  }, [state, formId]);

  const errorText = (field: RealityField) => {
    const error = errors[field];
    return error ? text.errors[error] : null;
  };
  const amount = (field: 'savingsAgo' | 'savingsToday', label: string, hint: string) => (
    <Field id={fieldId(field)} label={label} hint={hint} error={errorText(field)}>
      <input
        ref={field === 'savingsToday' ? todayRef : undefined}
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

      {amount('savingsAgo', text.savingsAgo, text.savingsAgoHint)}

      <Field id={fieldId('months')} label={text.months} error={errorText('months')}>
        <input
          id={fieldId('months')}
          name="months"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={3}
          defaultValue={values.months}
          aria-invalid={errors.months ? true : false}
          aria-describedby={describedBy(fieldId('months'), false)}
          className={`${textField} max-w-28 text-right tabular-nums`}
        />
      </Field>

      <div className="flex flex-col gap-1">
        {amount('savingsToday', text.savingsToday, text.savingsTodayHint)}
        {registeredToday ? (
          <p className="flex flex-wrap items-center gap-x-1 text-sm text-text-muted">
            <span>{registeredToday.label}</span>
            <button
              type="button"
              className={`${textButton} -ml-3 text-sm`}
              onClick={() => {
                if (!todayRef.current) return;
                todayRef.current.value = registeredToday.value;
                todayRef.current.focus();
                setDirty(true);
              }}
            >
              {text.useRegistered}
            </button>
          </p>
        ) : null}
      </div>

      <Field
        id={fieldId('currency')}
        label={text.currency}
        hint={text.currencyHint}
        error={errorText('currency')}
      >
        <select
          id={fieldId('currency')}
          name="currency"
          defaultValue={values.currency || currencies[0]}
          aria-invalid={errors.currency ? true : false}
          aria-describedby={describedBy(fieldId('currency'), true)}
          className={`${textField} max-w-36`}
        >
          {currencies.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
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
