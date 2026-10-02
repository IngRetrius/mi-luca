'use client';

import Link from 'next/link';
import {
  useActionState,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';

import {
  expenseTypeSchema,
  frequencySchema,
  payerSchema,
  type ExpenseType,
  type Frequency,
  type Payer,
} from '@miluca/domain';
import {
  compute,
  keyFigures,
  type CaseInput,
  type EngineMode,
  type KeyFigureId,
  type KeyFigures,
} from '@miluca/engine';
import type { Messages } from '@miluca/i18n';

import { ScreenActions } from '@/components/screen';
import {
  choiceCard,
  choiceInput,
  focusRing,
  linkButton,
  primaryButton,
  secondaryButton,
  textButton,
  textField,
} from '@/components/ui-classes';
import { toBudgetItemInput } from '@/features/summary/client';

import type { BudgetItemState } from './actions';
import { ImpactPreview, type ImpactPreviewText } from './impact-preview';
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

/** Lo necesario para recalcular el plan en el teléfono mientras se escribe (P-C07). */
export interface BudgetPreviewData {
  /** El caso sin la partida que se edita. */
  readonly baseInput: CaseInput;
  readonly mode: EngineMode;
  readonly before: KeyFigures;
  /** Nivel básico guardado: el cliente no lo cambia, pero cuenta en el cálculo. */
  readonly keptBasicAmount: number | null;
  readonly locale: string;
  readonly baseCurrency: string;
}

export interface BudgetItemFormProps {
  readonly text: BudgetFormText;
  readonly role: 'advisor' | 'client';
  readonly initial: BudgetItemValues;
  readonly currencies: readonly string[];
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
  'note',
  'basicAmount',
];

/** P-A06 (asesor) y P-C07 (cliente): crear o editar un gasto, con el impacto antes de guardar. */
export function BudgetItemForm({
  text,
  role,
  initial,
  currencies,
  action,
  deleteAction,
  cancelHref,
  preview,
}: BudgetItemFormProps) {
  const [state, formAction, pending] = useActionState(action, null);
  const values = state?.values ?? initial;
  const errors = state?.errors ?? {};
  const formId = useId();
  const fieldId = (field: string) => `${formId}-${field}`;
  const [frequency, setFrequency] = useState<Frequency | ''>(values.frequency);
  const [payer, setPayer] = useState<Payer>(values.payer);
  const [draft, setDraft] = useState<BudgetItemRecord | null>(null);
  const [dirty, setDirty] = useState(false);
  const deferredDraft = useDeferredValue(draft);

  // Con cambios sin guardar, el navegador pregunta antes de cerrar o recargar. Cancelar es explícito.
  useEffect(() => {
    if (!dirty || pending) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, pending]);

  // Tras enviar, el foco va al primer campo que hay que corregir.
  useEffect(() => {
    if (!state) return;
    const first = FIELD_ORDER.find((field) => state.errors[field]);
    if (first) document.getElementById(`${formId}-${first}`)?.focus();
  }, [state, formId]);

  const after = useMemo(() => {
    if (!preview || !deferredDraft) return preview?.before ?? null;
    const item = toBudgetItemInput({
      ...deferredDraft,
      basic_amount: role === 'advisor' ? deferredDraft.basic_amount : preview.keptBasicAmount,
    });
    const budgetItems =
      deferredDraft.scope === 'presupuesto'
        ? [...preview.baseInput.budgetItems, item]
        : preview.baseInput.budgetItems;
    return keyFigures(compute({ ...preview.baseInput, budgetItems }, { mode: preview.mode }));
  }, [preview, deferredDraft, role]);

  const previewFigures: readonly KeyFigureId[] =
    preview?.mode === 'native'
      ? ['monthlyExpenses', 'annualSurplus', 'ownSavingsRate']
      : ['monthlyExpenses', 'annualSurplus', 'savingsRate'];

  function handleChange(event: FormEvent<HTMLFormElement>) {
    setDirty(true);
    const data = new FormData(event.currentTarget);
    const parsed = parseBudgetItem(data, { currencies, advisor: role === 'advisor' });
    setDraft(parsed.ok ? parsed.record : null);
  }

  const describe = (field: BudgetItemField, hint: boolean) =>
    [hint ? `${fieldId(field)}-hint` : '', `${fieldId(field)}-error`].filter(Boolean).join(' ');
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
            aria-describedby={`${describe('currency', false)}${currencies.length === 1 ? ` ${fieldId('currency')}-hint` : ''}`}
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
              className={choiceInput}
            />
            <span className="flex flex-col">
              {text.expenseTypes[type]}
              <span className="text-sm text-text-muted">{text.expenseTypeHints[type]}</span>
            </span>
          </label>
        ))}
      </ChoiceGroup>

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
          name="essential"
          label={text.form.essential}
          hint={text.form.essentialHint}
          defaultChecked={values.essential}
        />
        <Checkbox
          name="isTemporary"
          label={text.form.temporary}
          hint={text.form.temporaryHint}
          defaultChecked={values.isTemporary}
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
          figures={previewFigures}
          before={preview.before}
          after={after}
          text={text.preview}
          locale={preview.locale}
          currency={preview.baseCurrency}
        />
      ) : null}

      {deleteAction ? (
        <details className="rounded-xl border border-border">
          <summary
            className={`min-h-12 cursor-pointer rounded-xl px-4 py-3 text-status-alert hover:underline ${focusRing}`}
          >
            {text.form.deleteToggle}
          </summary>
          <div className="flex flex-col items-start gap-2 px-4 pb-4">
            <p className="text-sm text-text-muted">{text.form.deleteHint}</p>
            <button
              type="submit"
              formAction={deleteAction}
              formNoValidate
              className={secondaryButton}
            >
              {text.form.deleteConfirm}
            </button>
          </div>
        </details>
      ) : null}

      <ScreenActions>
        <button type="submit" disabled={pending} className={`w-full ${primaryButton}`}>
          {pending ? text.form.submitting : text.form.submit}
        </button>
        <Link href={cancelHref} className={`w-full ${textButton} ${linkButton}`}>
          {text.form.cancel}
        </Link>
      </ScreenActions>
    </form>
  );
}

/** Etiqueta, ayuda y error de un campo. El error siempre está presente para que se anuncie. */
function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="text-sm text-text-muted">
          {hint}
        </p>
      ) : null}
      {children}
      <p id={`${id}-error`} aria-live="polite" className="text-sm text-status-alert">
        {error}
      </p>
    </div>
  );
}

function ChoiceGroup({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 font-medium">{legend}</legend>
      {children}
    </fieldset>
  );
}

function Checkbox({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex min-h-12 cursor-pointer items-start gap-3 py-2">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 size-5 shrink-0 accent-primary"
      />
      <span className="flex flex-col">
        {label}
        {hint ? <span className="text-sm text-text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}
