'use client';

import { useActionState, useEffect, useId, useState, type FormEvent } from 'react';

import {
  expenseTypeSchema,
  frequencySchema,
  payerSchema,
  type ExpenseType,
  type Frequency,
  type Payer,
} from '@miluca/domain';
import type { CaseInput } from '@miluca/engine';
import type { Messages } from '@miluca/i18n';

import { DeleteDisclosure, FormSubmitActions } from '@/components/form-actions';
import { Checkbox, ChoiceGroup, describedBy, Field } from '@/components/form-field';
import { choiceCard, choiceInput, focusRing, textField } from '@/components/ui-classes';
import { useUnsavedWarning } from '@/components/use-unsaved-warning';
import {
  ImpactPreview,
  previewFigureIds,
  toBudgetItemInput,
  usePreviewFigures,
  type ImpactPreviewText,
  type PreviewCase,
} from '@/features/summary/client';

import type { BudgetItemState } from './actions';
import {
  CATEGORY_MAX,
  CONCEPT_MAX,
  NOTE_MAX,
  PAYER_LABEL_MAX,
  parseBudgetItem,
  type BudgetItemField,
  type BudgetItemRecord,
  type BudgetItemValues,
} from './validation';

type BudgetText = Messages['budget'];

/** Textos del formulario ya resueltos para quien lo usa (asesor, o cliente con su trato). */
export interface BudgetFormText {
  readonly form: BudgetText['form'];
  readonly frequencies: BudgetText['frequencies'];
  readonly expenseTypes: BudgetText['expenseTypes'];
  readonly expenseTypeHints: BudgetText['expenseTypeHints'];
  readonly payers: Readonly<Record<Payer, string>>;
  readonly categories: readonly string[];
  readonly preview: ImpactPreviewText;
}

/** El caso sin la partida que se edita, para recalcular el plan mientras se escribe (P-C07). */
export interface BudgetPreviewData extends PreviewCase {
  /** Nivel básico guardado: el cliente no lo cambia, pero cuenta en el cálculo. */
  readonly keptBasicAmount: number | null;
}

/** Un borrador válido del formulario, con el nivel básico que vale para el cálculo. */
interface BudgetDraft {
  readonly record: BudgetItemRecord;
  readonly basicAmount: number | null;
}

/** El caso con el borrador: una partida de referencia familiar no suma (RN-025). */
function withDraft(input: CaseInput, draft: BudgetDraft): CaseInput {
  if (draft.record.scope !== 'presupuesto') return input;
  const item = toBudgetItemInput({ ...draft.record, basic_amount: draft.basicAmount });
  return { ...input, budgetItems: [...input.budgetItems, item] };
}

export interface BudgetItemFormProps {
  readonly text: BudgetFormText;
  readonly role: 'advisor' | 'client';
  readonly initial: BudgetItemValues;
  readonly currencies: readonly string[];
  /** Bolsillos generales del cliente, para elegir el que financia la partida. */
  readonly pockets: readonly { readonly id: string; readonly name: string }[];
  readonly action: (
    previous: BudgetItemState | null,
    formData: FormData,
  ) => Promise<BudgetItemState>;
  /** Borrar la partida; null en una partida nueva. */
  readonly deleteAction: ((formData: FormData) => Promise<void>) | null;
  readonly cancelHref: string;
  readonly preview: BudgetPreviewData | null;
}

// Orden en que se enfoca el primer campo con error tras enviar.
const FIELD_ORDER: readonly BudgetItemField[] = [
  'category',
  'concept',
  'amount',
  'currency',
  'durationDays',
  'payerLabel',
  'pocket',
  'note',
  'basicAmount',
];

/** P-A06 (asesor) y P-C07 (cliente): crear o editar un gasto, con el impacto antes de guardar. */
export function BudgetItemForm({
  text,
  role,
  initial,
  currencies,
  pockets,
  action,
  deleteAction,
  cancelHref,
  preview,
}: BudgetItemFormProps) {
  const pocketIds = pockets.map((pocket) => pocket.id);
  const [state, formAction, pending] = useActionState(action, null);
  const values = state?.values ?? initial;
  const errors = state?.errors ?? {};
  const formId = useId();
  const fieldId = (field: string) => `${formId}-${field}`;
  const [frequency, setFrequency] = useState<Frequency | ''>(values.frequency);
  const [payer, setPayer] = useState<Payer>(values.payer);
  const [expenseType, setExpenseType] = useState<ExpenseType>(values.expenseType || 'directo');
  const [draft, setDraft] = useState<BudgetDraft | null>(null);
  const [dirty, setDirty] = useState(false);
  useUnsavedWarning(dirty, pending);

  // Tras enviar, el foco va al primer campo que hay que corregir.
  useEffect(() => {
    if (!state) return;
    const first = FIELD_ORDER.find((field) => state.errors[field]);
    if (first) document.getElementById(`${formId}-${first}`)?.focus();
  }, [state, formId]);

  const after = usePreviewFigures(preview, draft, withDraft);

  function handleChange(event: FormEvent<HTMLFormElement>) {
    setDirty(true);
    const data = new FormData(event.currentTarget);
    const parsed = parseBudgetItem(data, {
      currencies,
      advisor: role === 'advisor',
      pocketIds,
    });
    if (!parsed.ok) return setDraft(null);
    const basicAmount =
      role === 'advisor' ? parsed.record.basic_amount : (preview?.keptBasicAmount ?? null);
    setDraft({ record: parsed.record, basicAmount });
  }

  const describe = (field: BudgetItemField, hint: boolean) => describedBy(fieldId(field), hint);
  const errorText = (field: BudgetItemField) => {
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
        id={fieldId('category')}
        label={text.form.category}
        hint={text.form.categoryHint}
        error={errorText('category')}
      >
        <input
          id={fieldId('category')}
          name="category"
          type="text"
          list={`${formId}-categories`}
          autoComplete="off"
          maxLength={CATEGORY_MAX}
          required
          defaultValue={values.category}
          aria-invalid={errors.category ? true : false}
          aria-describedby={describe('category', true)}
          className={textField}
        />
        <datalist id={`${formId}-categories`}>
          {text.categories.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>
      </Field>

      <Field
        id={fieldId('concept')}
        label={text.form.concept}
        hint={text.form.conceptHint}
        error={errorText('concept')}
      >
        <input
          id={fieldId('concept')}
          name="concept"
          type="text"
          autoComplete="off"
          maxLength={CONCEPT_MAX}
          required
          defaultValue={values.concept}
          aria-invalid={errors.concept ? true : false}
          aria-describedby={describe('concept', true)}
          className={textField}
        />
      </Field>

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
            defaultValue={values.amount}
            aria-invalid={errors.amount ? true : false}
            aria-describedby={describe('amount', true)}
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

      <Field id={fieldId('frequency')} label={text.form.frequency}>
        <select
          id={fieldId('frequency')}
          name="frequency"
          defaultValue={values.frequency}
          onChange={(event) => setFrequency(event.currentTarget.value as Frequency | '')}
          className={textField}
        >
          {frequencySchema.options.map((option) => (
            <option key={option} value={option}>
              {text.frequencies[option]}
            </option>
          ))}
        </select>
      </Field>

      {frequency === 'por_duracion' ? (
        <Field
          id={fieldId('durationDays')}
          label={text.form.durationDays}
          hint={text.form.durationDaysHint}
          error={errorText('durationDays')}
        >
          <input
            id={fieldId('durationDays')}
            name="durationDays"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            defaultValue={values.durationDays}
            aria-invalid={errors.durationDays ? true : false}
            aria-describedby={describe('durationDays', true)}
            className={`${textField} text-right tabular-nums`}
          />
        </Field>
      ) : null}

      <ChoiceGroup legend={text.form.expenseType}>
        {expenseTypeSchema.options.map((type: ExpenseType) => (
          <label key={type} className={`${choiceCard} border-border py-3`}>
            <input
              type="radio"
              name="expenseType"
              value={type}
              defaultChecked={(values.expenseType || 'directo') === type}
              onChange={() => setExpenseType(type)}
              className={choiceInput}
            />
            <span className="flex flex-col">
              {text.expenseTypes[type]}
              <span className="text-sm text-text-muted">{text.expenseTypeHints[type]}</span>
            </span>
          </label>
        ))}
      </ChoiceGroup>

      {/* El bolsillo solo cuenta en los gastos tipo bolsillo; en los demás se conserva lo guardado. */}
      {expenseType === 'bolsillo' ? (
        <Field
          id={fieldId('pocket')}
          label={text.form.pocket}
          hint={pockets.length === 0 ? text.form.pocketNone : text.form.pocketHint}
          error={errors.pocket ? text.form.errors[errors.pocket] : null}
        >
          <select
            id={fieldId('pocket')}
            name="pocket"
            defaultValue={values.pocket}
            aria-invalid={errors.pocket ? true : false}
            aria-describedby={describe('pocket', true)}
            className={textField}
          >
            <option value="">{text.form.noPocket}</option>
            {pockets.map((pocket) => (
              <option key={pocket.id} value={pocket.id}>
                {pocket.name}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <input type="hidden" name="pocket" value={values.pocket} />
      )}

      <Checkbox
        name="essential"
        label={text.form.essential}
        hint={text.form.essentialHint}
        defaultChecked={values.essential}
      />

      <details
        open={
          values.payer !== 'cliente' ||
          values.isTemporary ||
          values.isHealth ||
          values.familyReference ||
          values.note !== '' ||
          Boolean(errors.payerLabel || errors.note)
        }
        className="group rounded-xl border border-border"
      >
        <summary
          className={`flex min-h-12 cursor-pointer flex-col justify-center rounded-xl px-4 py-2 hover:bg-surface ${focusRing}`}
        >
          <span className="font-medium">{text.form.moreDetails}</span>
          <span className="text-sm text-text-muted">{text.form.moreDetailsHint}</span>
        </summary>
        <div className="flex flex-col gap-6 px-4 pt-2 pb-4">
          <ChoiceGroup legend={text.form.payer}>
            {payerSchema.options.map((option: Payer) => (
              <label key={option} className={`${choiceCard} border-border`}>
                <input
                  type="radio"
                  name="payer"
                  value={option}
                  defaultChecked={values.payer === option}
                  onChange={() => setPayer(option)}
                  className={choiceInput}
                />
                {text.payers[option]}
              </label>
            ))}
          </ChoiceGroup>

          {payer === 'cliente' ? null : (
            <Field
              id={fieldId('payerLabel')}
              label={text.form.payerLabel}
              hint={text.form.payerLabelHint}
              error={errorText('payerLabel')}
            >
              <input
                id={fieldId('payerLabel')}
                name="payerLabel"
                type="text"
                autoComplete="off"
                maxLength={PAYER_LABEL_MAX}
                defaultValue={values.payerLabel}
                aria-invalid={errors.payerLabel ? true : false}
                aria-describedby={describe('payerLabel', true)}
                className={textField}
              />
            </Field>
          )}

          <div className="flex flex-col gap-2">
            <Checkbox
              name="isTemporary"
              label={text.form.temporary}
              hint={text.form.temporaryHint}
              defaultChecked={values.isTemporary}
            />
            <Checkbox
              name="isHealth"
              label={text.form.health}
              hint={text.form.healthHint}
              defaultChecked={values.isHealth}
            />
            <Checkbox
              name="familyReference"
              label={text.form.familyReference}
              hint={text.form.familyReferenceHint}
              defaultChecked={values.familyReference}
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
              aria-describedby={describe('note', false)}
              className={`${textField} py-3`}
            />
          </Field>
        </div>
      </details>

      {role === 'advisor' ? (
        <fieldset className="flex flex-col gap-4 rounded-xl border border-border p-4">
          <legend className="px-1 font-semibold">{text.form.advisorTitle}</legend>
          <Field
            id={fieldId('basicAmount')}
            label={text.form.basicAmount}
            hint={text.form.basicAmountHint}
            error={errorText('basicAmount')}
          >
            <input
              id={fieldId('basicAmount')}
              name="basicAmount"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              defaultValue={values.basicAmount}
              aria-invalid={errors.basicAmount ? true : false}
              aria-describedby={describe('basicAmount', true)}
              className={`${textField} text-right tabular-nums`}
            />
          </Field>
          <Checkbox
            name="isProposed"
            label={text.form.proposed}
            defaultChecked={values.isProposed}
          />
        </fieldset>
      ) : null}

      {preview && after ? (
        <ImpactPreview
          figures={previewFigureIds(preview.mode)}
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
