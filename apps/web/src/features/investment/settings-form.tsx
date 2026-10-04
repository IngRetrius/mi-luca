'use client';

import { useActionState, useEffect, useId, useState } from 'react';

import type { Messages } from '@miluca/i18n';

import { FormSubmitActions } from '@/components/form-actions';
import { describedBy, Field } from '@/components/form-field';
import { textField } from '@/components/ui-classes';
import { useUnsavedWarning } from '@/components/use-unsaved-warning';

import type { InvestmentSettingsState } from './actions';
import type { InvestmentSettingsField, InvestmentSettingsValues } from './validation';

const FIELD_ORDER: readonly InvestmentSettingsField[] = [
  'retirementAge',
  'realReturnGrowth',
  'realReturnStability',
  'glideStep',
  'growthFloor',
];

/** Supuestos de inversión del caso: edad de retiro y supuestos de la proyección. */
export function InvestmentSettingsForm({
  text,
  hints,
  initial,
  action,
  cancelHref,
}: {
  text: Messages['investment']['settingsForm'];
  /** Ayuda de cada campo con el valor de la metodología. */
  hints: Readonly<Record<InvestmentSettingsField, string>>;
  initial: InvestmentSettingsValues;
  action: (
    previous: InvestmentSettingsState | null,
    formData: FormData,
  ) => Promise<InvestmentSettingsState>;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const values = state?.values ?? initial;
  const errors = state?.errors ?? {};
  const formId = useId();
  const fieldId = (field: InvestmentSettingsField) => `${formId}-${field}`;
  const [dirty, setDirty] = useState(false);
  useUnsavedWarning(dirty, pending);

  useEffect(() => {
    if (!state) return;
    const first = FIELD_ORDER.find((field) => state.errors[field]);
    if (first) document.getElementById(`${formId}-${first}`)?.focus();
  }, [state, formId]);

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
      {FIELD_ORDER.map((field) => {
        const error = errors[field];
        return (
          <Field
            key={field}
            id={fieldId(field)}
            label={text[field]}
            hint={hints[field]}
            error={error ? text.errors[error] : null}
          >
            <input
              id={fieldId(field)}
              name={field}
              type="text"
              inputMode={field === 'retirementAge' ? 'numeric' : 'decimal'}
              autoComplete="off"
              defaultValue={values[field]}
              aria-invalid={error ? true : false}
              aria-describedby={describedBy(fieldId(field), true)}
              className={`${textField} text-right tabular-nums`}
            />
          </Field>
        );
      })}
      <p className="text-sm text-text-muted">{text.returnsNote}</p>
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
