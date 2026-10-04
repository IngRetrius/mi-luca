'use client';

import { useActionState, useEffect, useId, useState } from 'react';

import { investmentBucketSchema } from '@miluca/domain';
import type { Messages } from '@miluca/i18n';

import { DeleteDisclosure, FormSubmitActions } from '@/components/form-actions';
import { ChoiceGroup, describedBy, Field } from '@/components/form-field';
import { choiceCard, choiceInput, textField } from '@/components/ui-classes';
import { useUnsavedWarning } from '@/components/use-unsaved-warning';

import type { InvestmentState } from './actions';
import { NAME_MAX, NOTE_MAX, type InvestmentField, type InvestmentValues } from './validation';

const FIELD_ORDER: readonly InvestmentField[] = ['name', 'balance', 'currency', 'note'];

/** Crear o editar una inversión actual: plataforma o tipo, tramo, saldo y moneda. */
export function InvestmentForm({
  text,
  buckets,
  bucketHints,
  initial,
  currencies,
  action,
  deleteAction,
  cancelHref,
}: {
  text: Messages['investment']['form'];
  buckets: Messages['investment']['buckets'];
  bucketHints: Messages['investment']['bucketHints'];
  initial: InvestmentValues;
  currencies: readonly string[];
  action: (previous: InvestmentState | null, formData: FormData) => Promise<InvestmentState>;
  deleteAction: ((formData: FormData) => Promise<void>) | null;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const values = state?.values ?? initial;
  const errors = state?.errors ?? {};
  const formId = useId();
  const fieldId = (field: InvestmentField) => `${formId}-${field}`;
  const [dirty, setDirty] = useState(false);
  useUnsavedWarning(dirty, pending);

  useEffect(() => {
    if (!state) return;
    const first = FIELD_ORDER.find((field) => state.errors[field]);
    if (first) document.getElementById(`${formId}-${first}`)?.focus();
  }, [state, formId]);

  const errorText = (field: InvestmentField) => {
    const error = errors[field];
    return error ? text.errors[error] : null;
  };

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
          maxLength={NAME_MAX}
          required
          defaultValue={values.name}
          aria-invalid={errors.name ? true : false}
          aria-describedby={describedBy(fieldId('name'), true)}
          className={textField}
        />
      </Field>

      <ChoiceGroup legend={text.bucket}>
        {investmentBucketSchema.options.map((bucket) => (
          <label key={bucket} className={`${choiceCard} border-border py-3`}>
            <input
              type="radio"
              name="bucket"
              value={bucket}
              defaultChecked={values.bucket === bucket}
              className={choiceInput}
            />
            <span className="flex flex-col">
              {buckets[bucket]}
              <span className="text-sm text-text-muted">{bucketHints[bucket]}</span>
            </span>
          </label>
        ))}
        <label className={`${choiceCard} border-border py-3`}>
          <input
            type="radio"
            name="bucket"
            value=""
            defaultChecked={values.bucket === ''}
            className={choiceInput}
          />
          <span className="flex flex-col">
            {text.bucketNone}
            <span className="text-sm text-text-muted">{text.bucketNoneHint}</span>
          </span>
        </label>
      </ChoiceGroup>

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
            required
            defaultValue={values.balance}
            aria-invalid={errors.balance ? true : false}
            aria-describedby={describedBy(fieldId('balance'), true)}
            className={`${textField} text-right tabular-nums`}
          />
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
      <p id={`${formId}-currency-note`} className="-mt-4 text-sm text-text-muted">
        {text.currencyHint}
      </p>

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
