'use client';

import { useActionState, useEffect, useId, useState } from 'react';

import type { Messages } from '@miluca/i18n';

import { DeleteDisclosure, FormSubmitActions } from '@/components/form-actions';
import { describedBy, Field } from '@/components/form-field';
import { textField } from '@/components/ui-classes';
import { useUnsavedWarning } from '@/components/use-unsaved-warning';

import type { PocketState } from './actions';
import {
  POCKET_NAME_MAX,
  PURPOSE_MAX,
  WHEN_USED_MAX,
  type PocketField,
  type PocketValues,
} from './validation';

const FIELD_ORDER: readonly PocketField[] = [
  'name',
  'purpose',
  'whenUsed',
  'bank',
  'currency',
  'balance',
];

/** Bolsillos (P-A10): crear o editar un bolsillo general con su banco y su saldo de hoy. */
export function PocketForm({
  text,
  initial,
  currencies,
  banks,
  action,
  deleteAction,
  cancelHref,
}: {
  text: Messages['pockets']['form'];
  initial: PocketValues;
  currencies: readonly string[];
  banks: readonly { readonly id: string; readonly name: string }[];
  action: (previous: PocketState | null, formData: FormData) => Promise<PocketState>;
  deleteAction: ((formData: FormData) => Promise<void>) | null;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const values = state?.values ?? initial;
  const errors = state?.errors ?? {};
  const formId = useId();
  const fieldId = (field: PocketField) => `${formId}-${field}`;
  const [dirty, setDirty] = useState(false);
  useUnsavedWarning(dirty, pending);

  useEffect(() => {
    if (!state) return;
    const first = FIELD_ORDER.find((field) => state.errors[field]);
    if (first) document.getElementById(`${formId}-${first}`)?.focus();
  }, [state, formId]);

  const errorText = (field: PocketField) => {
    const error = errors[field];
    return error ? text.errors[error] : null;
  };
  const invalid = (field: PocketField) => (errors[field] ? true : false);

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

      <Field id={fieldId('name')} label={text.name} hint={text.nameHint} error={errorText('name')}>
        <input
          id={fieldId('name')}
          name="name"
          type="text"
          autoComplete="off"
          maxLength={POCKET_NAME_MAX}
          required
          defaultValue={values.name}
          aria-invalid={invalid('name')}
          aria-describedby={describedBy(fieldId('name'), true)}
          className={textField}
        />
      </Field>

      <Field id={fieldId('purpose')} label={text.purpose} error={errorText('purpose')}>
        <input
          id={fieldId('purpose')}
          name="purpose"
          type="text"
          autoComplete="off"
          maxLength={PURPOSE_MAX}
          defaultValue={values.purpose}
          aria-invalid={invalid('purpose')}
          aria-describedby={describedBy(fieldId('purpose'), false)}
          className={textField}
        />
      </Field>

      <Field id={fieldId('whenUsed')} label={text.whenUsed} error={errorText('whenUsed')}>
        <input
          id={fieldId('whenUsed')}
          name="whenUsed"
          type="text"
          autoComplete="off"
          maxLength={WHEN_USED_MAX}
          defaultValue={values.whenUsed}
          aria-invalid={invalid('whenUsed')}
          aria-describedby={describedBy(fieldId('whenUsed'), false)}
          className={textField}
        />
      </Field>

      <Field id={fieldId('bank')} label={text.bank} hint={text.bankHint} error={errorText('bank')}>
        <select
          id={fieldId('bank')}
          name="bank"
          defaultValue={values.bank}
          aria-invalid={invalid('bank')}
          aria-describedby={describedBy(fieldId('bank'), true)}
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

      <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
        <Field
          id={fieldId('balance')}
          label={text.balance}
          hint={text.balanceHint}
          error={errorText('balance')}
        >
          <input
            id={fieldId('balance')}
            name="balance"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            defaultValue={values.balance}
            aria-invalid={invalid('balance')}
            aria-describedby={describedBy(fieldId('balance'), true)}
            className={`${textField} text-right tabular-nums`}
          />
        </Field>
        <Field id={fieldId('currency')} label={text.currency} error={errorText('currency')}>
          <select
            id={fieldId('currency')}
            name="currency"
            defaultValue={values.currency || currencies[0]}
            aria-invalid={invalid('currency')}
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
      <p id={`${formId}-currency-note`} className="-mt-4 text-sm text-text-muted">
        {text.currencyHint}
      </p>

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
