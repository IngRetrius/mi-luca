'use client';

import { useActionState, useEffect, useId, useState } from 'react';

import type { Messages } from '@miluca/i18n';

import { DeleteDisclosure, FormSubmitActions } from '@/components/form-actions';
import { describedBy, Field } from '@/components/form-field';
import { choiceCard, choiceInput, focusRing, textField } from '@/components/ui-classes';
import { useUnsavedWarning } from '@/components/use-unsaved-warning';

import type { DebtState } from './actions';
import {
  DEBT_TYPES,
  LENDER_MAX,
  NAME_MAX,
  NOTE_MAX,
  TRACKING_FIELDS,
  type DebtField,
  type DebtValues,
} from './validation';

const FIELD_ORDER: readonly DebtField[] = [
  'name',
  'debtType',
  'lender',
  'balance',
  'currency',
  'rate',
  'minPayment',
  'acceptsExtra',
  'extraFrom',
  'manualOrder',
  ...TRACKING_FIELDS,
  'note',
];

type DebtText = Messages['debts'];

/** Inventario de deudas: crear o editar una deuda; el lugar en el orden manual, solo el asesor. */
export function DebtForm({
  text,
  minPaymentTrackingHint,
  types,
  initial,
  currencies,
  advisor,
  action,
  deleteAction,
  cancelHref,
}: {
  text: DebtText['form'];
  /** Ayuda de la cuota cuando la deuda tiene seguimiento cuota a cuota. */
  minPaymentTrackingHint: string;
  types: DebtText['types'];
  initial: DebtValues;
  currencies: readonly string[];
  advisor: boolean;
  action: (previous: DebtState | null, formData: FormData) => Promise<DebtState>;
  deleteAction: ((formData: FormData) => Promise<void>) | null;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const values = state?.values ?? initial;
  const errors = state?.errors ?? {};
  const formId = useId();
  const fieldId = (field: DebtField) => `${formId}-${field}`;
  const [dirty, setDirty] = useState(false);
  const [acceptsExtra, setAcceptsExtra] = useState(values.acceptsExtra !== 'no');
  const [tracked, setTracked] = useState(values.firstInstallmentDate !== '');
  // Abierto si la deuda ya tiene seguimiento; no se cierra solo al borrar la fecha.
  const [trackingOpen] = useState(values.firstInstallmentDate !== '');
  const trackingError = TRACKING_FIELDS.some((field) => errors[field]);
  useUnsavedWarning(dirty, pending);

  useEffect(() => {
    if (!state) return;
    const first = FIELD_ORDER.find((field) => state.errors[field]);
    if (first) document.getElementById(`${formId}-${first}`)?.focus();
  }, [state, formId]);

  const errorText = (field: DebtField) => {
    const error = errors[field];
    return error ? text.errors[error] : null;
  };
  const decimalInput = (field: 'balance' | 'minPayment' | 'rate', hasHint: boolean) => (
    <input
      id={fieldId(field)}
      name={field}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      required
      defaultValue={values[field]}
      aria-invalid={errors[field] ? true : false}
      aria-describedby={describedBy(fieldId(field), hasHint)}
      className={`${textField} text-right tabular-nums`}
    />
  );

  const numberField = (
    field: 'firstInstallmentNumber' | 'totalInstallments' | 'extraFromInstallment' | 'frechUntil',
    label: string,
    hint: string | null,
  ) => (
    <Field
      id={fieldId(field)}
      label={label}
      {...(hint === null ? {} : { hint })}
      error={errorText(field)}
    >
      <input
        id={fieldId(field)}
        name={field}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        defaultValue={values[field]}
        aria-invalid={errors[field] ? true : false}
        aria-describedby={describedBy(fieldId(field), hint !== null)}
        className={`${textField} max-w-28 text-right tabular-nums`}
      />
    </Field>
  );
  const amountField = (field: 'insurance' | 'originalAmount', label: string) => (
    <Field id={fieldId(field)} label={label} error={errorText(field)}>
      <input
        id={fieldId(field)}
        name={field}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        defaultValue={values[field]}
        aria-invalid={errors[field] ? true : false}
        aria-describedby={describedBy(fieldId(field), false)}
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

      <Field id={fieldId('debtType')} label={text.type} error={errorText('debtType')}>
        <select
          id={fieldId('debtType')}
          name="debtType"
          defaultValue={values.debtType || DEBT_TYPES[0]}
          aria-invalid={errors.debtType ? true : false}
          aria-describedby={describedBy(fieldId('debtType'), false)}
          className={textField}
        >
          {DEBT_TYPES.map((type) => (
            <option key={type} value={type}>
              {types[type]}
            </option>
          ))}
        </select>
      </Field>

      <Field
        id={fieldId('lender')}
        label={text.lender}
        hint={text.lenderHint}
        error={errorText('lender')}
      >
        <input
          id={fieldId('lender')}
          name="lender"
          type="text"
          autoComplete="off"
          maxLength={LENDER_MAX}
          defaultValue={values.lender}
          aria-invalid={errors.lender ? true : false}
          aria-describedby={describedBy(fieldId('lender'), true)}
          className={textField}
        />
      </Field>

      <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
        <Field id={fieldId('balance')} label={text.balance} error={errorText('balance')}>
          {decimalInput('balance', false)}
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

      <Field id={fieldId('rate')} label={text.rate} hint={text.rateHint} error={errorText('rate')}>
        {decimalInput('rate', true)}
      </Field>

      <Field
        id={fieldId('minPayment')}
        label={text.minPayment}
        hint={tracked ? minPaymentTrackingHint : text.minPaymentHint}
        error={errorText('minPayment')}
      >
        {decimalInput('minPayment', true)}
      </Field>

      <fieldset className="flex flex-col gap-2" aria-describedby={`${formId}-accepts-hint`}>
        <legend className="mb-2 font-medium">{text.acceptsExtra}</legend>
        <p id={`${formId}-accepts-hint`} className="-mt-2 text-sm text-text-muted">
          {text.acceptsExtraHint}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {(['si', 'no'] as const).map((option) => (
            <label key={option} className={choiceCard}>
              <input
                id={option === 'si' ? fieldId('acceptsExtra') : undefined}
                type="radio"
                name="acceptsExtra"
                value={option}
                defaultChecked={(values.acceptsExtra || 'si') === option}
                onChange={() => setAcceptsExtra(option === 'si')}
                className={choiceInput}
              />
              {option === 'si' ? text.acceptsExtraYes : text.acceptsExtraNo}
            </label>
          ))}
        </div>
      </fieldset>

      {acceptsExtra ? (
        <Field
          id={fieldId('extraFrom')}
          label={text.extraFrom}
          hint={text.extraFromHint}
          error={errorText('extraFrom')}
        >
          <input
            id={fieldId('extraFrom')}
            name="extraFrom"
            type="date"
            defaultValue={values.extraFrom}
            aria-invalid={errors.extraFrom ? true : false}
            aria-describedby={describedBy(fieldId('extraFrom'), true)}
            className={textField}
          />
        </Field>
      ) : null}

      {advisor ? (
        <Field
          id={fieldId('manualOrder')}
          label={text.manualOrder}
          hint={text.manualOrderHint}
          error={errorText('manualOrder')}
        >
          <input
            id={fieldId('manualOrder')}
            name="manualOrder"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            defaultValue={values.manualOrder}
            aria-invalid={errors.manualOrder ? true : false}
            aria-describedby={describedBy(fieldId('manualOrder'), true)}
            className={`${textField} max-w-28 text-right tabular-nums`}
          />
        </Field>
      ) : null}

      <details
        open={trackingOpen || trackingError}
        className="group rounded-xl border border-border"
      >
        <summary
          className={`flex min-h-12 cursor-pointer items-center rounded-xl px-4 font-medium ${focusRing}`}
        >
          {text.trackingTitle}
        </summary>
        <div className="flex flex-col gap-6 px-4 pt-2 pb-4">
          <p className="text-sm text-text-muted">{text.trackingIntro}</p>
          <Field
            id={fieldId('firstInstallmentDate')}
            label={text.firstInstallmentDate}
            hint={text.firstInstallmentDateHint}
            error={errorText('firstInstallmentDate')}
          >
            <input
              id={fieldId('firstInstallmentDate')}
              name="firstInstallmentDate"
              type="date"
              defaultValue={values.firstInstallmentDate}
              onChange={(event) => setTracked(event.target.value !== '')}
              aria-invalid={errors.firstInstallmentDate ? true : false}
              aria-describedby={describedBy(fieldId('firstInstallmentDate'), true)}
              className={textField}
            />
          </Field>
          {numberField(
            'firstInstallmentNumber',
            text.firstInstallmentNumber,
            text.firstInstallmentNumberHint,
          )}
          {numberField('totalInstallments', text.totalInstallments, text.totalInstallmentsHint)}
          {amountField('insurance', text.insurance)}
          {amountField('originalAmount', text.originalAmount)}
          {acceptsExtra
            ? numberField('extraFromInstallment', text.extraFromInstallment, null)
            : null}
          <Field
            id={fieldId('frechPoints')}
            label={text.frechPoints}
            hint={text.frechPointsHint}
            error={errorText('frechPoints')}
          >
            <input
              id={fieldId('frechPoints')}
              name="frechPoints"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              defaultValue={values.frechPoints}
              aria-invalid={errors.frechPoints ? true : false}
              aria-describedby={describedBy(fieldId('frechPoints'), true)}
              className={`${textField} max-w-28 text-right tabular-nums`}
            />
          </Field>
          {numberField('frechUntil', text.frechUntil, null)}
        </div>
      </details>

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
