'use client';

import { useActionState, useEffect, useId, useState } from 'react';

import type { Messages } from '@miluca/i18n';

import { DeleteDisclosure, FormSubmitActions } from '@/components/form-actions';
import { describedBy, Field } from '@/components/form-field';
import { textField } from '@/components/ui-classes';
import { useUnsavedWarning } from '@/components/use-unsaved-warning';

import type { GoalState } from './actions';
import {
  NAME_MAX,
  NEW_POCKET,
  NOTE_MAX,
  TRIP_CONCEPTS,
  type GoalField,
  type GoalValues,
} from './validation';

const FIELD_ORDER: readonly GoalField[] = [
  'name',
  'amount',
  'currency',
  'alreadySaved',
  'targetDate',
  'repeatEveryYears',
  'tripCurrency',
  ...TRIP_CONCEPTS.flatMap(({ key }) => [`trip_${key}_unit`, `trip_${key}_quantity`] as const),
  'tripLodgingTax',
  'tripCushion',
  'tripBaseCosts',
  'note',
];

const numberField = `${textField} text-right tabular-nums`;

/** Crear o editar una meta, con su calculadora de viaje (RN-100, RN-101). */
export function GoalForm({
  text,
  concepts,
  baseCurrency,
  initial,
  currencies,
  pockets,
  action,
  deleteAction,
  cancelHref,
}: {
  text: Messages['goals']['form'];
  concepts: Messages['goals']['concepts'];
  baseCurrency: string;
  initial: GoalValues;
  currencies: readonly string[];
  /** Bolsillos generales del cliente: id y nombre. */
  pockets: readonly { readonly id: string; readonly name: string }[];
  action: (previous: GoalState | null, formData: FormData) => Promise<GoalState>;
  deleteAction: ((formData: FormData) => Promise<void>) | null;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const values = state?.values ?? initial;
  const errors = state?.errors ?? {};
  const formId = useId();
  const fieldId = (field: GoalField) => `${formId}-${field}`;
  const [dirty, setDirty] = useState(false);
  const [usesTrip, setUsesTrip] = useState(initial.usesTrip);
  useUnsavedWarning(dirty, pending);

  useEffect(() => {
    if (!state) return;
    const first = FIELD_ORDER.find((field) => state.errors[field]);
    if (first) document.getElementById(`${formId}-${first}`)?.focus();
  }, [state, formId]);

  const errorText = (field: GoalField) => {
    const error = errors[field];
    return error ? text.errors[error] : null;
  };
  const input = (field: GoalField, value: string, numeric: boolean, hint: boolean) => (
    <input
      id={fieldId(field)}
      name={field}
      type="text"
      inputMode={numeric ? 'decimal' : 'text'}
      autoComplete="off"
      defaultValue={value}
      aria-invalid={errors[field] ? true : false}
      aria-describedby={describedBy(fieldId(field), hint)}
      className={numeric ? numberField : textField}
    />
  );
  const currencySelect = (field: 'currency' | 'tripCurrency', value: string) => (
    <select
      id={fieldId(field)}
      name={field}
      defaultValue={value || currencies[0]}
      aria-invalid={errors[field] ? true : false}
      aria-describedby={describedBy(fieldId(field), false)}
      className={textField}
    >
      {currencies.map((currency) => (
        <option key={currency} value={currency}>
          {currency}
        </option>
      ))}
    </select>
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

      <Field id={`${formId}-pocket`} label={text.pocket} hint={text.pocketHint}>
        <select
          id={`${formId}-pocket`}
          name="pocketId"
          defaultValue={values.pocketId}
          aria-describedby={describedBy(`${formId}-pocket`, true)}
          className={textField}
        >
          <option value="">{text.pocketNone}</option>
          <option value={NEW_POCKET}>{text.pocketNew}</option>
          {pockets.map((pocket) => (
            <option key={pocket.id} value={pocket.id}>
              {pocket.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
        <Field
          id={fieldId('amount')}
          label={text.amount}
          hint={text.amountHint}
          error={errorText('amount')}
        >
          {input('amount', values.amount, true, true)}
        </Field>
        <Field id={fieldId('currency')} label={text.currency} error={errorText('currency')}>
          {currencySelect('currency', values.currency)}
        </Field>
      </div>

      <Field
        id={fieldId('alreadySaved')}
        label={text.alreadySaved}
        error={errorText('alreadySaved')}
      >
        {input('alreadySaved', values.alreadySaved, true, false)}
      </Field>

      <Field
        id={fieldId('targetDate')}
        label={text.targetDate}
        hint={text.targetDateHint}
        error={errorText('targetDate')}
      >
        <input
          id={fieldId('targetDate')}
          name="targetDate"
          type="date"
          autoComplete="off"
          defaultValue={values.targetDate}
          aria-invalid={errors.targetDate ? true : false}
          aria-describedby={describedBy(fieldId('targetDate'), true)}
          className={textField}
        />
      </Field>

      <Field
        id={fieldId('repeatEveryYears')}
        label={text.repeatEveryYears}
        hint={text.repeatEveryYearsHint}
        error={errorText('repeatEveryYears')}
      >
        {input('repeatEveryYears', values.repeatEveryYears, true, true)}
      </Field>

      <label className="flex min-h-12 cursor-pointer items-start gap-3 py-2">
        <input
          type="checkbox"
          name="usesTrip"
          checked={usesTrip}
          onChange={(event) => setUsesTrip(event.target.checked)}
          className="mt-0.5 size-5 shrink-0 accent-primary"
        />
        <span className="flex flex-col">
          {text.usesTrip}
          <span className="text-sm text-text-muted">{text.usesTripHint}</span>
        </span>
      </label>

      {usesTrip ? (
        <fieldset className="flex flex-col gap-4 rounded-xl border border-border p-4">
          <legend className="px-1 font-semibold">{text.tripTitle}</legend>
          <p className="text-sm text-text-muted">{text.tripNote}</p>
          <Field
            id={fieldId('tripCurrency')}
            label={text.tripCurrency}
            error={errorText('tripCurrency')}
          >
            {currencySelect('tripCurrency', values.tripCurrency)}
          </Field>
          {TRIP_CONCEPTS.map(({ key }) => {
            const unit = `trip_${key}_unit` as const;
            const quantity = `trip_${key}_quantity` as const;
            return (
              <fieldset key={key} className="flex flex-col gap-2">
                <legend className="font-medium">{concepts[key]}</legend>
                <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3">
                  <Field id={fieldId(unit)} label={text.unitValue} error={errorText(unit)}>
                    {input(unit, values.tripItems[key].unit, true, false)}
                  </Field>
                  <Field id={fieldId(quantity)} label={text.quantity} error={errorText(quantity)}>
                    {input(quantity, values.tripItems[key].quantity, true, false)}
                  </Field>
                </div>
              </fieldset>
            );
          })}
          <Field
            id={fieldId('tripLodgingTax')}
            label={text.tripLodgingTax}
            error={errorText('tripLodgingTax')}
          >
            {input('tripLodgingTax', values.tripLodgingTax, true, false)}
          </Field>
          <Field
            id={fieldId('tripCushion')}
            label={text.tripCushion}
            hint={text.tripCushionHint}
            error={errorText('tripCushion')}
          >
            {input('tripCushion', values.tripCushion, true, true)}
          </Field>
          <Field
            id={fieldId('tripBaseCosts')}
            label={text.tripBaseCosts.replace('{currency}', baseCurrency)}
            hint={text.tripBaseCostsHint}
            error={errorText('tripBaseCosts')}
          >
            {input('tripBaseCosts', values.tripBaseCosts, true, true)}
          </Field>
        </fieldset>
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
