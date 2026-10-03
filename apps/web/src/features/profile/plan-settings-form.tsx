'use client';

import { useActionState, useEffect, useId, useState } from 'react';

import type { Messages } from '@miluca/i18n';

import { FormSubmitActions } from '@/components/form-actions';
import { describedBy, Field } from '@/components/form-field';
import { textField } from '@/components/ui-classes';
import { useUnsavedWarning } from '@/components/use-unsaved-warning';

import type { PlanSettingsState } from './actions';
import {
  PLAN_PERCENTS,
  type PlanField,
  type PlanPercent,
  type PlanValues,
} from './plan-settings-validation';

const FIELD_ORDER: readonly PlanField[] = ['emergencyMonths', ...PLAN_PERCENTS, 'cushion'];

/** Supuestos del plan: cada campo dice el valor de la metodología que vale si queda vacío. */
export function PlanSettingsForm({
  text,
  hints,
  help,
  initial,
  action,
  cancelHref,
}: {
  text: Messages['planSettings']['form'];
  /** Ayuda de cada campo, ya con el valor de la metodología y la moneda. */
  hints: Readonly<Record<PlanField, string>> & { readonly cushionLabel: string };
  /** Qué hace cada supuesto: se abre con el signo de pregunta junto a la etiqueta. */
  help: Readonly<Record<PlanField, { readonly label: string; readonly text: string }>>;
  initial: PlanValues;
  action: (previous: PlanSettingsState | null, formData: FormData) => Promise<PlanSettingsState>;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const values = state?.values ?? initial;
  const errors = state?.errors ?? {};
  const formId = useId();
  const fieldId = (field: PlanField) => `${formId}-${field}`;
  const [dirty, setDirty] = useState(false);
  useUnsavedWarning(dirty, pending);

  useEffect(() => {
    if (!state) return;
    const first = FIELD_ORDER.find((field) => state.errors[field]);
    if (first) document.getElementById(`${formId}-${first}`)?.focus();
  }, [state, formId]);

  const input = (field: PlanField, label: string, wide = false) => (
    <Field
      key={field}
      id={fieldId(field)}
      label={label}
      hint={hints[field]}
      help={help[field]}
      error={errors[field] ? text.errors[errors[field]] : null}
    >
      <input
        id={fieldId(field)}
        name={field}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        defaultValue={values[field]}
        aria-invalid={errors[field] ? true : false}
        aria-describedby={describedBy(fieldId(field), true)}
        className={`${textField} ${wide ? '' : 'max-w-28'} text-right tabular-nums`}
      />
    </Field>
  );
  const percentLabel: Readonly<Record<PlanPercent, string>> = {
    expensiveDebtThreshold: text.expensiveDebtThreshold,
    pctInvestConfirmed: text.pctInvestConfirmed,
    pctInvestPending: text.pctInvestPending,
    pctSurplusToDebt: text.pctSurplusToDebt,
    pctExcessToInvest: text.pctExcessToInvest,
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
      {input('emergencyMonths', text.emergencyMonths)}
      {PLAN_PERCENTS.map((field) => input(field, percentLabel[field]))}
      {input('cushion', hints.cushionLabel, true)}
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
