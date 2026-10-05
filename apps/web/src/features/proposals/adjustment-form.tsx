'use client';

import { useActionState, useEffect, useId, useState } from 'react';

import type { Messages } from '@miluca/i18n';

import { DeleteDisclosure, FormSubmitActions } from '@/components/form-actions';
import { ChoiceGroup, describedBy, Field } from '@/components/form-field';
import { choiceCard, choiceInput, textField } from '@/components/ui-classes';
import { useUnsavedWarning } from '@/components/use-unsaved-warning';

import type { AdjustmentState } from './actions';
import { REASON_MAX, type AdjustmentField, type AdjustmentValues } from './validation';

const FIELD_ORDER: readonly AdjustmentField[] = ['item', 'amount', 'reason'];

/** Un gasto que se puede ajustar, con su texto ya armado en el servidor. */
export interface AdjustmentItemOption {
  readonly id: string;
  /** "Salidas · 200.000 $ · Mensual" */
  readonly label: string;
  /** "Hoy: 200.000 $ · Mensual" */
  readonly current: string;
}

export interface AdjustmentItemGroup {
  readonly category: string;
  readonly items: readonly AdjustmentItemOption[];
}

type Text = Messages['proposal']['form'];

/**
 * Crear o editar un ajuste de la propuesta (P-A25). Al crear se elige el gasto; al editar queda fijo
 * (`fixedItem`). Quitar el gasto no lleva valor nuevo.
 */
export function AdjustmentForm({
  text,
  groups,
  fixedItem,
  initial,
  action,
  deleteAction,
  cancelHref,
}: {
  text: Text;
  groups: readonly AdjustmentItemGroup[];
  /** El gasto del ajuste al editar; null al crear. `current` null si el gasto ya no existe. */
  fixedItem: { readonly concept: string; readonly current: string | null } | null;
  initial: AdjustmentValues;
  action: (previous: AdjustmentState | null, formData: FormData) => Promise<AdjustmentState>;
  deleteAction: ((formData: FormData) => Promise<void>) | null;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const values = state?.values ?? initial;
  const errors = state?.errors ?? {};
  const formId = useId();
  const fieldId = (field: AdjustmentField) => `${formId}-${field}`;
  const [dirty, setDirty] = useState(false);
  const [itemId, setItemId] = useState(values.item);
  const [kind, setKind] = useState(values.kind || 'ajustar');
  useUnsavedWarning(dirty, pending);

  useEffect(() => {
    if (!state) return;
    const first = FIELD_ORDER.find((field) => state.errors[field]);
    if (first) document.getElementById(`${formId}-${first}`)?.focus();
  }, [state, formId]);

  const errorText = (field: AdjustmentField) => {
    const error = errors[field];
    return error ? text.errors[error] : null;
  };
  const selected = groups.flatMap((group) => group.items).find((item) => item.id === itemId);

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

      {fixedItem ? (
        <div className="flex flex-col gap-1">
          <p className="font-medium">{text.item}</p>
          <p className="text-lg wrap-anywhere">{fixedItem.concept}</p>
          {fixedItem.current ? (
            <p className="text-sm text-text-muted">{fixedItem.current}</p>
          ) : null}
        </div>
      ) : (
        <Field
          id={fieldId('item')}
          label={text.item}
          hint={selected?.current ?? text.itemHint}
          error={errorText('item')}
        >
          <select
            id={fieldId('item')}
            name="item"
            value={itemId}
            onChange={(event) => setItemId(event.target.value)}
            required
            aria-invalid={errors.item ? true : false}
            aria-describedby={describedBy(fieldId('item'), true)}
            className={textField}
          >
            <option value="">{text.itemPlaceholder}</option>
            {groups.map((group) => (
              <optgroup key={group.category} label={group.category}>
                {group.items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
      )}

      <ChoiceGroup legend={text.kind}>
        {(['ajustar', 'quitar'] as const).map((option) => (
          <label key={option} className={choiceCard}>
            <input
              type="radio"
              name="kind"
              value={option}
              checked={kind === option}
              onChange={() => setKind(option)}
              className={choiceInput}
            />
            {text.kinds[option]}
          </label>
        ))}
      </ChoiceGroup>
      <p aria-live="polite" className="-mt-4 text-sm text-status-alert">
        {errorText('kind')}
      </p>

      {kind === 'ajustar' ? (
        <Field
          id={fieldId('amount')}
          label={text.amount}
          hint={text.amountHint}
          error={errorText('amount')}
        >
          <input
            id={fieldId('amount')}
            name="amount"
            inputMode="decimal"
            autoComplete="off"
            defaultValue={values.amount}
            aria-invalid={errors.amount ? true : false}
            aria-describedby={describedBy(fieldId('amount'), true)}
            className={textField}
          />
        </Field>
      ) : null}

      <Field
        id={fieldId('reason')}
        label={text.reason}
        hint={text.reasonHint}
        error={errorText('reason')}
      >
        <textarea
          id={fieldId('reason')}
          name="reason"
          rows={3}
          maxLength={REASON_MAX}
          defaultValue={values.reason}
          aria-invalid={errors.reason ? true : false}
          aria-describedby={describedBy(fieldId('reason'), true)}
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
