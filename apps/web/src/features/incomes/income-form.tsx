'use client';

import { useActionState, useEffect, useId, useState, type FormEvent } from 'react';

import { incomeKindSchema } from '@miluca/domain';
import type { CaseInput } from '@miluca/engine';
import type { Messages } from '@miluca/i18n';

import { DeleteDisclosure, FormSubmitActions } from '@/components/form-actions';
import { Checkbox, ChoiceGroup, describedBy, Field } from '@/components/form-field';
import { choiceCard, choiceInput, textField } from '@/components/ui-classes';
import { useUnsavedWarning } from '@/components/use-unsaved-warning';
import {
  ImpactPreview,
  previewFigureIds,
  toIncomeInput,
  usePreviewFigures,
  type ImpactPreviewText,
  type PreviewCase,
} from '@/features/summary/client';

import type { IncomeState } from './actions';
import {
  NAME_MAX,
  NOTE_MAX,
  parseIncome,
  type IncomeField,
  type IncomeRecord,
  type IncomeValues,
} from './validation';

/** Textos del formulario ya resueltos para quien lo usa (asesor, o cliente con su trato). */
export interface IncomeFormText {
  readonly form: Messages['incomes']['form'];
  readonly kinds: Messages['incomes']['kinds'];
  readonly months: { readonly short: readonly string[]; readonly long: readonly string[] };
  readonly preview: ImpactPreviewText;
}

const FIELD_ORDER: readonly IncomeField[] = ['name', 'amount', 'currency', 'payments', 'note'];

/** El caso con el ingreso del formulario. */
function withDraft(input: CaseInput, draft: IncomeRecord): CaseInput {
  return { ...input, incomes: [...input.incomes, toIncomeInput(draft)] };
}

/** P-A04 bloque B y Mis ingresos: crear o editar un ingreso, con el impacto antes de guardar. */
export function IncomeForm({
  text,
  initial,
  currencies,
  action,
  deleteAction,
  cancelHref,
  preview,
}: {
  text: IncomeFormText;
  initial: IncomeValues;
  currencies: readonly string[];
  action: (previous: IncomeState | null, formData: FormData) => Promise<IncomeState>;
  deleteAction: ((formData: FormData) => Promise<void>) | null;
  cancelHref: string;
  preview: PreviewCase | null;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const values = state?.values ?? initial;
  const errors = state?.errors ?? {};
  const formId = useId();
  const fieldId = (field: string) => `${formId}-${field}`;
  const [draft, setDraft] = useState<IncomeRecord | null>(null);
  const [dirty, setDirty] = useState(false);
  useUnsavedWarning(dirty, pending);
  const after = usePreviewFigures(preview, draft, withDraft);

  useEffect(() => {
    if (!state) return;
    const first = FIELD_ORDER.find((field) => state.errors[field]);
    if (!first) return;
    const target = first === 'payments' ? `${formId}-payment-0` : `${formId}-${first}`;
    document.getElementById(target)?.focus();
  }, [state, formId]);

  function handleChange(event: FormEvent<HTMLFormElement>) {
    setDirty(true);
    const parsed = parseIncome(new FormData(event.currentTarget), { currencies });
    setDraft(parsed.ok ? parsed.record : null);
  }

  const errorText = (field: IncomeField) => {
    const error = errors[field];
    return error ? text.form.errors[error] : null;
  };

  return (
    <form
      action={formAction}
      onChange={handleChange}
      noValidate
      className="flex flex-1 flex-col gap-6"
    >
      {state?.formError ? (
        <p role="alert" className="rounded-xl border border-status-alert p-4">
          {text.form.errors[state.formError]}
        </p>
      ) : null}

      <Field
        id={fieldId('name')}
        label={text.form.name}
        hint={text.form.nameHint}
        error={errorText('name')}
      >
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

      <ChoiceGroup legend={text.form.kind}>
        <div className="grid grid-cols-2 gap-2">
          {incomeKindSchema.options.map((kind) => (
            <label key={kind} className={`${choiceCard} border-border`}>
              <input
                type="radio"
                name="kind"
                value={kind}
                defaultChecked={values.kind === kind}
                className={choiceInput}
              />
              {text.kinds[kind]}
            </label>
          ))}
        </div>
      </ChoiceGroup>

      <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
        <Field
          id={fieldId('amount')}
          label={text.form.amount}
          hint={text.form.amountHint}
          error={errorText('amount')}
        >
          <input
            id={fieldId('amount')}
            name="amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            required
            defaultValue={values.amount}
            aria-invalid={errors.amount ? true : false}
            aria-describedby={describedBy(fieldId('amount'), true)}
            className={`${textField} text-right tabular-nums`}
          />
        </Field>
        <Field id={fieldId('currency')} label={text.form.currency} error={errorText('currency')}>
          <select
            id={fieldId('currency')}
            name="currency"
            defaultValue={values.currency || currencies[0]}
            aria-invalid={errors.currency ? true : false}
            aria-describedby={describedBy(
              fieldId('currency'),
              false,
              currencies.length === 1 ? `${fieldId('currency')}-hint` : '',
            )}
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
      {currencies.length === 1 ? (
        <p id={`${fieldId('currency')}-hint`} className="-mt-4 text-sm text-text-muted">
          {text.form.currencyHint}
        </p>
      ) : null}

      <fieldset
        aria-describedby={describedBy(fieldId('payments'), true)}
        className="flex flex-col gap-2"
      >
        <legend className="mb-1 font-medium">{text.form.payments}</legend>
        <p id={`${fieldId('payments')}-hint`} className="-mt-1 text-sm text-text-muted">
          {text.form.paymentsHint}
        </p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {text.months.short.map((month, index) => (
            <label key={month} className="flex flex-col gap-1 text-center text-sm">
              <span aria-hidden="true">{month}</span>
              <input
                id={`${formId}-payment-${index}`}
                name={`payment-${index}`}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={1}
                aria-label={text.months.long[index]}
                defaultValue={values.payments[index] ?? '1'}
                aria-invalid={errors.payments ? true : false}
                className={`${textField} px-0 text-center tabular-nums`}
              />
            </label>
          ))}
        </div>
        <p
          id={`${fieldId('payments')}-error`}
          aria-live="polite"
          className="text-sm text-status-alert"
        >
          {errorText('payments')}
        </p>
      </fieldset>

      <div className="flex flex-col gap-2">
        <Checkbox
          name="isNet"
          label={text.form.isNet}
          hint={text.form.isNetHint}
          defaultChecked={values.isNet}
        />
        <Checkbox
          name="savingsOnly"
          label={text.form.savingsOnly}
          hint={text.form.savingsOnlyHint}
          defaultChecked={values.savingsOnly}
        />
      </div>

      <Field id={fieldId('note')} label={text.form.note} error={errorText('note')}>
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

      {preview && after ? (
        <ImpactPreview
          figures={['annualIncome', ...previewFigureIds(preview.mode).slice(1)]}
          before={preview.before}
          after={after}
          text={text.preview}
          locale={preview.locale}
          currency={preview.baseCurrency}
        />
      ) : null}

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
