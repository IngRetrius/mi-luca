'use client';

import { useActionState, useEffect, useId, useState } from 'react';

import type { Messages } from '@miluca/i18n';

import { FormSubmitActions } from '@/components/form-actions';
import { describedBy, Field } from '@/components/form-field';
import { textField } from '@/components/ui-classes';
import { useUnsavedWarning } from '@/components/use-unsaved-warning';

import type { LifeState } from './actions';
import type { LifeField, LifeValues } from './validation';

const FIELD_ORDER: readonly LifeField[] = ['supportYears', 'annualToCover'];

/** Supuestos de seguros del caso: años de apoyo, gasto a cubrir y bolsillo de las primas. */
export function LifeSettingsForm({
  text,
  baseCurrency,
  initial,
  pockets,
  action,
  cancelHref,
}: {
  text: Messages['insurance']['settingsForm'];
  baseCurrency: string;
  initial: LifeValues;
  pockets: readonly { readonly id: string; readonly name: string }[];
  action: (previous: LifeState | null, formData: FormData) => Promise<LifeState>;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const values = state?.values ?? initial;
  const errors = state?.errors ?? {};
  const formId = useId();
  const fieldId = (field: LifeField | 'pocket') => `${formId}-${field}`;
  const [dirty, setDirty] = useState(false);
  useUnsavedWarning(dirty, pending);

  useEffect(() => {
    if (!state) return;
    const first = FIELD_ORDER.find((field) => state.errors[field]);
    if (first) document.getElementById(`${formId}-${first}`)?.focus();
  }, [state, formId]);

  const numeric = (field: LifeField, label: string, hint: string) => {
    const error = errors[field];
    return (
      <Field
        id={fieldId(field)}
        label={label}
        hint={hint}
        error={error ? text.errors[error] : null}
      >
        <input
          id={fieldId(field)}
          name={field}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          defaultValue={values[field]}
          aria-invalid={error ? true : false}
          aria-describedby={describedBy(fieldId(field), true)}
          className={`${textField} text-right tabular-nums`}
        />
      </Field>
    );
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
      {numeric('supportYears', text.supportYears, text.supportYearsHint)}
      {numeric(
        'annualToCover',
        text.annualToCover.replace('{currency}', baseCurrency),
        text.annualToCoverHint,
      )}
      <p className="-mt-2 text-sm text-text-muted">{text.nativeOnly}</p>
      <Field id={fieldId('pocket')} label={text.pocket} hint={text.pocketHint}>
        <select
          id={fieldId('pocket')}
          name="pocketId"
          defaultValue={values.pocketId}
          aria-describedby={describedBy(fieldId('pocket'), true)}
          className={textField}
        >
          <option value="">{text.pocketNone}</option>
          {pockets.map((pocket) => (
            <option key={pocket.id} value={pocket.id}>
              {pocket.name}
            </option>
          ))}
        </select>
      </Field>
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
