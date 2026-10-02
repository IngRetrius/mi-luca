'use client';

import { useActionState, useEffect, useId, useState } from 'react';

import { assetTypeSchema, type AssetType } from '@miluca/domain';
import type { Messages } from '@miluca/i18n';

import { DeleteDisclosure, FormSubmitActions } from '@/components/form-actions';
import { Checkbox, ChoiceGroup, describedBy, Field } from '@/components/form-field';
import { choiceCard, choiceInput, textField } from '@/components/ui-classes';
import { useUnsavedWarning } from '@/components/use-unsaved-warning';

import type { AssetState } from './actions';
import { NAME_MAX, NOTE_MAX, type AssetField, type AssetValues } from './validation';

const FIELD_ORDER: readonly AssetField[] = ['name', 'value', 'currency', 'note'];

/** Patrimonio: crear o editar un activo (cuenta, inmueble, vehículo u otro). */
export function AssetForm({
  text,
  types,
  typeHints,
  initial,
  currencies,
  action,
  deleteAction,
  cancelHref,
}: {
  text: Messages['assets']['form'];
  types: Messages['assets']['types'];
  typeHints: Messages['assets']['typeHints'];
  initial: AssetValues;
  currencies: readonly string[];
  action: (previous: AssetState | null, formData: FormData) => Promise<AssetState>;
  deleteAction: ((formData: FormData) => Promise<void>) | null;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const values = state?.values ?? initial;
  const errors = state?.errors ?? {};
  const formId = useId();
  const fieldId = (field: AssetField) => `${formId}-${field}`;
  const [dirty, setDirty] = useState(false);
  useUnsavedWarning(dirty, pending);

  useEffect(() => {
    if (!state) return;
    const first = FIELD_ORDER.find((field) => state.errors[field]);
    if (first) document.getElementById(`${formId}-${first}`)?.focus();
  }, [state, formId]);

  const errorText = (field: AssetField) => {
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

      <ChoiceGroup legend={text.assetType}>
        {assetTypeSchema.options.map((type: AssetType) => (
          <label key={type} className={`${choiceCard} border-border py-3`}>
            <input
              type="radio"
              name="assetType"
              value={type}
              defaultChecked={values.assetType === type}
              className={choiceInput}
            />
            <span className="flex flex-col">
              {types[type]}
              <span className="text-sm text-text-muted">{typeHints[type]}</span>
            </span>
          </label>
        ))}
      </ChoiceGroup>

      <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
        <Field
          id={fieldId('value')}
          label={text.value}
          hint={text.valueHint}
          error={errorText('value')}
        >
          <input
            id={fieldId('value')}
            name="value"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            required
            defaultValue={values.value}
            aria-invalid={errors.value ? true : false}
            aria-describedby={describedBy(fieldId('value'), true)}
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

      <Checkbox
        name="generatesIncome"
        label={text.generatesIncome}
        hint={text.generatesIncomeHint}
        defaultChecked={values.generatesIncome}
      />

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
