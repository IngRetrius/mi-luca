'use client';

import { useActionState, useEffect, useId, useState } from 'react';

import type { Messages } from '@miluca/i18n';

import { DeleteDisclosure, FormSubmitActions } from '@/components/form-actions';
import { describedBy, Field } from '@/components/form-field';
import { textField } from '@/components/ui-classes';
import { useUnsavedWarning } from '@/components/use-unsaved-warning';

import type { FxRateFormError, FxRateState } from './actions';
import { NOTE_MAX, type FxRateField, type FxRateValues } from './validation';

/** Textos del formulario ya resueltos para quien lo usa (asesor, o cliente con su trato). */
export interface FxRateFormText {
  readonly form: Messages['currencies']['form'];
  readonly commonCurrencies: readonly string[];
}

const FIELD_ORDER: readonly FxRateField[] = ['currency', 'rate', 'asOf', 'note'];

/** P-A19: registrar o cambiar la tasa que recibe el cliente por una moneda. */
export function FxRateForm({
  text,
  baseCurrency,
  initial,
  isNew,
  initialError,
  action,
  deleteAction,
  cancelHref,
}: {
  text: FxRateFormText;
  baseCurrency: string;
  initial: FxRateValues;
  isNew: boolean;
  /** Error que llega por la URL, por ejemplo al intentar borrar una moneda en uso. */
  initialError: FxRateFormError | null;
  action: (previous: FxRateState | null, formData: FormData) => Promise<FxRateState>;
  deleteAction: ((formData: FormData) => Promise<void>) | null;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [dirty, setDirty] = useState(false);
  useUnsavedWarning(dirty, pending);
  const values = state?.values ?? initial;
  const errors = state?.errors ?? {};
  const formError = state ? state.formError : initialError;
  const formId = useId();
  const fieldId = (field: FxRateField) => `${formId}-${field}`;
  const errorText = (field: FxRateField) => {
    const error = errors[field];
    return error ? text.form.errors[error] : null;
  };

  useEffect(() => {
    if (!state) return;
    const first = FIELD_ORDER.find((field) => state.errors[field]);
    if (first) document.getElementById(`${formId}-${first}`)?.focus();
  }, [state, formId]);

  return (
    <form
      action={formAction}
      onChange={() => setDirty(true)}
      noValidate
      className="flex flex-1 flex-col gap-6"
    >
      {formError ? (
        <p role="alert" className="rounded-xl border border-status-alert p-4">
          {text.form.errors[formError]}
        </p>
      ) : null}

      {isNew ? (
        <Field
          id={fieldId('currency')}
          label={text.form.currency}
          hint={text.form.currencyHint}
          error={errorText('currency')}
        >
          <input
            id={fieldId('currency')}
            name="currency"
            type="text"
            list={`${formId}-common`}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={3}
            defaultValue={values.currency}
            aria-invalid={errors.currency ? true : false}
            aria-describedby={describedBy(fieldId('currency'), true)}
            className={`${textField} uppercase`}
          />
          <datalist id={`${formId}-common`}>
            {text.commonCurrencies
              .filter((currency) => currency !== baseCurrency)
              .map((currency) => (
                <option key={currency} value={currency} />
              ))}
          </datalist>
        </Field>
      ) : null}

      <Field
        id={fieldId('rate')}
        label={text.form.rate.replace('{base}', baseCurrency)}
        hint={text.form.rateHint}
        error={errorText('rate')}
      >
        <input
          id={fieldId('rate')}
          name="rate"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          defaultValue={values.rate}
          aria-invalid={errors.rate ? true : false}
          aria-describedby={describedBy(fieldId('rate'), true)}
          className={`${textField} text-right tabular-nums`}
        />
      </Field>

      <Field id={fieldId('asOf')} label={text.form.asOf} error={errorText('asOf')}>
        <input
          id={fieldId('asOf')}
          name="asOf"
          type="date"
          autoComplete="off"
          defaultValue={values.asOf}
          aria-invalid={errors.asOf ? true : false}
          aria-describedby={describedBy(fieldId('asOf'), false)}
          className={textField}
        />
      </Field>

      <Field
        id={fieldId('note')}
        label={text.form.note}
        hint={text.form.noteHint}
        error={errorText('note')}
      >
        <input
          id={fieldId('note')}
          name="note"
          type="text"
          autoComplete="off"
          maxLength={NOTE_MAX}
          defaultValue={values.note}
          aria-invalid={errors.note ? true : false}
          aria-describedby={describedBy(fieldId('note'), true)}
          className={textField}
        />
      </Field>

      {deleteAction ? (
        <DeleteDisclosure
          toggle={text.form.deleteToggle}
          hint={text.form.deleteHint}
          confirm={text.form.deleteConfirm}
          action={deleteAction}
        />
      ) : null}

      <FormSubmitActions
        pending={pending}
        submit={text.form.submit}
        submitting={text.form.submitting}
        cancel={text.form.cancel}
        cancelHref={cancelHref}
      />
    </form>
  );
}
