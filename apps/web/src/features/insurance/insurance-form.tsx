'use client';

import { useActionState, useEffect, useId, useState } from 'react';

import { insuranceStatusSchema, type InsuranceStatus } from '@miluca/domain';
import type { Messages } from '@miluca/i18n';

import { DeleteDisclosure, FormSubmitActions } from '@/components/form-actions';
import { ChoiceGroup, describedBy, Field } from '@/components/form-field';
import { choiceCard, choiceInput, textField } from '@/components/ui-classes';
import { useUnsavedWarning } from '@/components/use-unsaved-warning';

import type { InsuranceState } from './actions';
import {
  BENEFICIARIES_MAX,
  NAME_MAX,
  NOTE_MAX,
  type InsuranceField,
  type InsuranceValues,
} from './validation';

const STATUS_CHOICES: readonly (InsuranceStatus | '')[] = [...insuranceStatusSchema.options, ''];

const FIELD_ORDER: readonly InsuranceField[] = [
  'customName',
  'premium',
  'currency',
  'beneficiaries',
  'note',
];

/** Crear o editar un seguro: si lo tiene, la prima cotizada y los beneficiarios (RN-102). */
export function InsuranceForm({
  text,
  statuses,
  typeLabel,
  covers,
  initial,
  currencies,
  action,
  deleteAction,
  cancelHref,
}: {
  text: Messages['insurance']['form'];
  statuses: Messages['insurance']['statuses'];
  /** Nombre del seguro del catálogo; null si es "otro" y se escribe. */
  typeLabel: string | null;
  covers: string;
  initial: InsuranceValues;
  currencies: readonly string[];
  action: (previous: InsuranceState | null, formData: FormData) => Promise<InsuranceState>;
  deleteAction: ((formData: FormData) => Promise<void>) | null;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const values = state?.values ?? initial;
  const errors = state?.errors ?? {};
  const formId = useId();
  const fieldId = (field: InsuranceField) => `${formId}-${field}`;
  const [dirty, setDirty] = useState(false);
  useUnsavedWarning(dirty, pending);

  useEffect(() => {
    if (!state) return;
    const first = FIELD_ORDER.find((field) => state.errors[field]);
    if (first) document.getElementById(`${formId}-${first}`)?.focus();
  }, [state, formId]);

  const errorText = (field: InsuranceField) => {
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
      <input type="hidden" name="insuranceType" value={values.insuranceType} />

      {typeLabel === null ? (
        <Field
          id={fieldId('customName')}
          label={text.customName}
          hint={text.customNameHint}
          error={errorText('customName')}
        >
          <input
            id={fieldId('customName')}
            name="customName"
            type="text"
            autoComplete="off"
            maxLength={NAME_MAX}
            required
            defaultValue={values.customName}
            aria-invalid={errors.customName ? true : false}
            aria-describedby={describedBy(fieldId('customName'), true)}
            className={textField}
          />
        </Field>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="font-medium">{typeLabel}</p>
          {covers ? <p className="text-sm text-text-muted">{covers}</p> : null}
        </div>
      )}

      <ChoiceGroup legend={text.status}>
        {STATUS_CHOICES.map((status) => (
          <label key={status || 'none'} className={`${choiceCard} border-border`}>
            <input
              type="radio"
              name="status"
              value={status}
              defaultChecked={values.status === status}
              className={choiceInput}
            />
            {status ? statuses[status] : text.statusUnanswered}
          </label>
        ))}
      </ChoiceGroup>

      <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
        <Field
          id={fieldId('premium')}
          label={text.premium}
          hint={text.premiumHint}
          error={errorText('premium')}
        >
          <input
            id={fieldId('premium')}
            name="premium"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            defaultValue={values.premium}
            aria-invalid={errors.premium ? true : false}
            aria-describedby={describedBy(fieldId('premium'), true)}
            className={`${textField} text-right tabular-nums`}
          />
        </Field>
        <Field id={fieldId('currency')} label={text.currency} error={errorText('currency')}>
          <select
            id={fieldId('currency')}
            name="currency"
            defaultValue={values.currency || currencies[0]}
            aria-invalid={errors.currency ? true : false}
            aria-describedby={describedBy(fieldId('currency'), false)}
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

      <Field
        id={fieldId('beneficiaries')}
        label={text.beneficiaries}
        hint={text.beneficiariesHint}
        error={errorText('beneficiaries')}
      >
        <input
          id={fieldId('beneficiaries')}
          name="beneficiaries"
          type="text"
          autoComplete="off"
          maxLength={BENEFICIARIES_MAX}
          defaultValue={values.beneficiaries}
          aria-invalid={errors.beneficiaries ? true : false}
          aria-describedby={describedBy(fieldId('beneficiaries'), true)}
          className={textField}
        />
      </Field>

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
