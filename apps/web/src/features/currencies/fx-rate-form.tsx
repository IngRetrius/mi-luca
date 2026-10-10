'use client';

import { Suspense, useActionState, useEffect, useId, useRef, useState } from 'react';

import type { Messages } from '@miluca/i18n';

import { DeleteDisclosure, FormSubmitActions } from '@/components/form-actions';
import { describedBy, Field } from '@/components/form-field';
import { textField } from '@/components/ui-classes';
import { useUnsavedWarning } from '@/components/use-unsaved-warning';

import type { FxRateFormError, FxRateState } from './actions';
import type { CurrencyOption } from './currency-options';
import { CurrencyPicker } from './currency-picker';
import { OfficialRateHint } from './official-rate-hint';
import type { OfficialRateView, OfficialRateViews } from './official-rate-views';
import { NOTE_MAX, type FxRateField, type FxRateValues } from './validation';

/** Textos del formulario ya resueltos para quien lo usa (asesor, o cliente con su trato). */
export interface FxRateFormText {
  readonly form: Messages['currencies']['form'];
  readonly useOfficialRate: string;
}

const FIELD_ORDER: readonly FxRateField[] = ['currency', 'rate', 'asOf', 'note'];

/**
 * P-A19: registrar o cambiar la tasa que recibe el cliente por una moneda. Al elegir la moneda
 * aparece su tasa oficial, que se copia con un botón y se ajusta a la que recibe (ADR 0032).
 */
export function FxRateForm({
  text,
  baseCurrency,
  currencyOptions,
  officialRates,
  initial,
  isNew,
  initialError,
  action,
  deleteAction,
  cancelHref,
}: {
  text: FxRateFormText;
  baseCurrency: string;
  /** Las monedas del menú al registrar una nueva. */
  currencyOptions: readonly CurrencyOption[];
  /** Llegan después del formulario: no lo frenan. */
  officialRates: Promise<OfficialRateViews>;
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
  const [currency, setCurrency] = useState(values.currency);
  const rateRef = useRef<HTMLInputElement>(null);
  const asOfRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLInputElement>(null);
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

  // Copia la tasa oficial a los campos y deja el foco en la tasa, para ajustarla a la que recibe.
  function applyOfficialRate(view: OfficialRateView) {
    if (rateRef.current) rateRef.current.value = view.rate;
    if (asOfRef.current) asOfRef.current.value = view.asOf;
    if (noteRef.current) noteRef.current.value = view.note;
    setDirty(true);
    rateRef.current?.focus();
  }

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
        <CurrencyPicker
          id={fieldId('currency')}
          options={currencyOptions}
          defaultValue={values.currency}
          error={errorText('currency')}
          text={{
            label: text.form.currency,
            placeholder: text.form.currencyPlaceholder,
            other: text.form.otherCurrency,
            otherCode: text.form.otherCurrencyCode,
            otherHint: text.form.currencyHint,
          }}
          onCurrencyChange={setCurrency}
        />
      ) : null}

      {/* Se anuncia al cambiar de moneda. Vacía, el margen negativo quita el espacio que le daría
          el formulario, sin sacarla del árbol de accesibilidad como lo haría `hidden`. */}
      <div aria-live="polite" className="empty:-mb-6">
        <Suspense fallback={null}>
          <OfficialRateHint
            rates={officialRates}
            currency={currency}
            useLabel={text.useOfficialRate}
            onUse={applyOfficialRate}
          />
        </Suspense>
      </div>

      <Field
        id={fieldId('rate')}
        label={text.form.rate.replace('{base}', baseCurrency)}
        hint={text.form.rateHint}
        error={errorText('rate')}
      >
        <input
          ref={rateRef}
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
          ref={asOfRef}
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
          ref={noteRef}
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
