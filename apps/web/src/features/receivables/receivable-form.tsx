'use client';

import { useActionState, useEffect, useId, useState } from 'react';

import type { Messages } from '@miluca/i18n';

import { DeleteDisclosure, FormSubmitActions } from '@/components/form-actions';
import { describedBy, Field } from '@/components/form-field';
import { textField } from '@/components/ui-classes';
import { useUnsavedWarning } from '@/components/use-unsaved-warning';

import type { ReceivableState } from './actions';
import { DEBTOR_MAX, NOTE_MAX, type ReceivableField, type ReceivableValues } from './validation';

const FIELD_ORDER: readonly ReceivableField[] = [
  'debtor',
  'balance',
  'payment',
  'currency',
  'firstPayment',
  'pctToInvestment',
  'note',
];

/** Cuentas por cobrar: crear o editar un cobro; el % a inversión, solo el asesor. */
export function ReceivableForm({
  text,
  initial,
  currencies,
  advisor,
  action,
  deleteAction,
  cancelHref,
}: {
  text: Messages['receivables']['form'];
  initial: ReceivableValues;
  currencies: readonly string[];
  advisor: boolean;
  action: (previous: ReceivableState | null, formData: FormData) => Promise<ReceivableState>;
  deleteAction: ((formData: FormData) => Promise<void>) | null;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const values = state?.values ?? initial;
  const errors = state?.errors ?? {};
  const formId = useId();
  const fieldId = (field: ReceivableField) => `${formId}-${field}`;
  const [dirty, setDirty] = useState(false);
  useUnsavedWarning(dirty, pending);

  useEffect(() => {
    if (!state) return;
    const first = FIELD_ORDER.find((field) => state.errors[field]);
    if (first) document.getElementById(`${formId}-${first}`)?.focus();
  }, [state, formId]);

  const errorText = (field: ReceivableField) => {
    const error = errors[field];
    return error ? text.errors[error] : null;
  };
  const amountInput = (field: 'balance' | 'payment') => (
    <input
      id={fieldId(field)}
      name={field}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      required
      defaultValue={values[field]}
      aria-invalid={errors[field] ? true : false}
      aria-describedby={describedBy(fieldId(field), field === 'balance')}
      className={`${textField} text-right tabular-nums`}
    />
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

      <Field
        id={fieldId('debtor')}
        label={text.debtor}
        hint={text.debtorHint}
        error={errorText('debtor')}
      >
        <input
          id={fieldId('debtor')}
          name="debtor"
          type="text"
          autoComplete="off"
          maxLength={DEBTOR_MAX}
          required
          defaultValue={values.debtor}
          aria-invalid={errors.debtor ? true : false}
          aria-describedby={describedBy(fieldId('debtor'), true)}
          className={textField}
        />
      </Field>

      <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
        <Field id={fieldId('balance')} label={text.balance} error={errorText('balance')}>
          {amountInput('balance')}
        </Field>
        <Field id={fieldId('currency')} label={text.currency} error={errorText('currency')}>
          <select
            id={fieldId('currency')}
            name="currency"
            defaultValue={values.currency || currencies[0]}
            aria-invalid={errors.currency ? true : false}
            aria-describedby={describedBy(fieldId('currency'), false, `${formId}-currency-note`)}
            className={textField}
          >
            {currencies.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <p id={`${fieldId('balance')}-hint`} className="-mt-4 text-sm text-text-muted">
        {text.balanceHint}
      </p>
      <p id={`${formId}-currency-note`} className="-mt-4 text-sm text-text-muted">
        {text.currencyHint}
      </p>

      <Field id={fieldId('payment')} label={text.payment} error={errorText('payment')}>
        {amountInput('payment')}
      </Field>

      <Field
        id={fieldId('firstPayment')}
        label={text.firstPayment}
        error={errorText('firstPayment')}
      >
        <input
          id={fieldId('firstPayment')}
          name="firstPayment"
          type="date"
          defaultValue={values.firstPayment}
          aria-invalid={errors.firstPayment ? true : false}
          aria-describedby={describedBy(fieldId('firstPayment'), false)}
          className={textField}
        />
      </Field>

      {advisor ? (
        <Field
          id={fieldId('pctToInvestment')}
          label={text.pctToInvestment}
          hint={text.pctToInvestmentHint}
          error={errorText('pctToInvestment')}
        >
          <input
            id={fieldId('pctToInvestment')}
            name="pctToInvestment"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            defaultValue={values.pctToInvestment}
            aria-invalid={errors.pctToInvestment ? true : false}
            aria-describedby={describedBy(fieldId('pctToInvestment'), true)}
            className={`${textField} max-w-28 text-right tabular-nums`}
          />
        </Field>
      ) : null}

      <Field id={fieldId('note')} label={text.note} error={errorText('note')}>
        <textarea
          id={fieldId('note')}
          name="note"
          rows={2}
          autoComplete="off"
          maxLength={NOTE_MAX}
          defaultValue={values.note}
          aria-invalid={errors.note ? true : false}
          aria-describedby={describedBy(fieldId('note'), false)}
          className={`${textField} py-3`}
        />
      </Field>

      {deleteAction ? (
        <DeleteDisclosure
          toggle={text.deleteToggle}
          hint={text.deleteHint}
          confirm={text.deleteConfirm}
          action={deleteAction}
        />
      ) : null}

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
