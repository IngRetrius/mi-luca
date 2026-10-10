'use client';

import { useActionState, useEffect, useId, useState } from 'react';

import type { Messages } from '@miluca/i18n';

import { FormSubmitActions } from '@/components/form-actions';
import { ChoiceGroup, describedBy, Field } from '@/components/form-field';
import { choiceCard, choiceInput, textField } from '@/components/ui-classes';
import { useUnsavedWarning } from '@/components/use-unsaved-warning';

import type { ProfileState } from './actions';
import { CLIENT_TYPES, type ClientType, type ProfileField, type ProfileValues } from './validation';

const FIELD_ORDER: readonly ProfileField[] = ['birthDate', 'dependents', 'cutoffDate', 'flowYear'];

/** P-A04 bloque A y P-A05: perfil, tipo de cliente con sus reglas y supuestos del caso. */
export function ProfileForm({
  text,
  initial,
  emergencyMonths,
  action,
  cancelHref,
}: {
  text: Messages['profile'];
  initial: ProfileValues;
  emergencyMonths: Readonly<Record<string, number>>;
  action: (previous: ProfileState | null, formData: FormData) => Promise<ProfileState>;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const values = state?.values ?? initial;
  const errors = state?.errors ?? {};
  const [clientType, setClientType] = useState<ClientType | ''>(values.clientType);
  const [dirty, setDirty] = useState(false);
  useUnsavedWarning(dirty, pending);
  const formId = useId();
  const fieldId = (field: string) => `${formId}-${field}`;
  const errorText = (field: ProfileField) => {
    const error = errors[field];
    return error ? text.errors[error] : null;
  };

  useEffect(() => {
    if (!state) return;
    const first = FIELD_ORDER.find((field) => state.errors[field]);
    if (first) document.getElementById(`${formId}-${first}`)?.focus();
  }, [state, formId]);

  const months = clientType ? emergencyMonths[clientType] : undefined;

  return (
    <form
      action={formAction}
      onChange={() => setDirty(true)}
      noValidate
      className="flex flex-1 flex-col gap-8"
    >
      {state?.formError ? (
        <p role="alert" className="rounded-xl border border-status-alert p-4">
          {text.errors[state.formError]}
        </p>
      ) : null}

      <section aria-labelledby={fieldId('profile')} className="flex flex-col gap-6">
        <h2 id={fieldId('profile')} className="text-lg font-semibold">
          {text.profileTitle}
        </h2>
        <Field
          id={fieldId('birthDate')}
          label={text.birthDate}
          hint={text.birthDateHint}
          error={errorText('birthDate')}
        >
          <input
            id={fieldId('birthDate')}
            name="birthDate"
            type="date"
            autoComplete="off"
            defaultValue={values.birthDate}
            aria-invalid={errors.birthDate ? true : false}
            aria-describedby={describedBy(fieldId('birthDate'), true)}
            className={textField}
          />
        </Field>
        <ChoiceGroup legend={text.sex} hint={text.sexHint}>
          <div className="grid grid-cols-3 gap-2">
            {(['mujer', 'hombre', ''] as const).map((option) => (
              <label key={option || 'none'} className={`${choiceCard} border-border`}>
                <input
                  type="radio"
                  name="sex"
                  value={option}
                  defaultChecked={values.sex === option}
                  className={choiceInput}
                />
                {text.sexes[option || 'none']}
              </label>
            ))}
          </div>
        </ChoiceGroup>
        <Field
          id={fieldId('dependents')}
          label={text.dependents}
          hint={text.dependentsHint}
          error={errorText('dependents')}
        >
          <div className="w-24">
            <input
              id={fieldId('dependents')}
              name="dependents"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={2}
              defaultValue={values.dependents}
              aria-invalid={errors.dependents ? true : false}
              aria-describedby={describedBy(fieldId('dependents'), true)}
              className={`${textField} text-right tabular-nums`}
            />
          </div>
        </Field>
      </section>

      <div className="flex flex-col gap-4">
        <ChoiceGroup legend={text.typeTitle} hint={text.typeHint}>
          {[...CLIENT_TYPES, ''].map((option) => (
            <label key={option || 'none'} className={`${choiceCard} border-border`}>
              <input
                type="radio"
                name="clientType"
                value={option}
                defaultChecked={values.clientType === option}
                onChange={() => setClientType(option as ClientType | '')}
                className={choiceInput}
              />
              {text.types[(option || 'none') as keyof typeof text.types]}
            </label>
          ))}
        </ChoiceGroup>
        {clientType ? (
          <div aria-live="polite" className="flex flex-col gap-1 rounded-xl bg-surface p-4">
            <p>{text.rules[clientType]}</p>
            {months === undefined ? null : (
              <p className="font-medium">
                {text.emergencyMonths.replace('{months}', String(months))}
              </p>
            )}
          </div>
        ) : null}
      </div>

      <section aria-labelledby={fieldId('settings')} className="flex flex-col gap-6">
        <h2 id={fieldId('settings')} className="text-lg font-semibold">
          {text.settingsTitle}
        </h2>
        <Field
          id={fieldId('cutoffDate')}
          label={text.cutoffDate}
          hint={text.cutoffDateHint}
          error={errorText('cutoffDate')}
        >
          <input
            id={fieldId('cutoffDate')}
            name="cutoffDate"
            type="date"
            autoComplete="off"
            defaultValue={values.cutoffDate}
            aria-invalid={errors.cutoffDate ? true : false}
            aria-describedby={describedBy(fieldId('cutoffDate'), true)}
            className={textField}
          />
        </Field>
        <Field
          id={fieldId('flowYear')}
          label={text.flowYear}
          hint={text.flowYearHint}
          error={errorText('flowYear')}
        >
          <div className="w-28">
            <input
              id={fieldId('flowYear')}
              name="flowYear"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              defaultValue={values.flowYear}
              aria-invalid={errors.flowYear ? true : false}
              aria-describedby={describedBy(fieldId('flowYear'), true)}
              className={`${textField} tabular-nums`}
            />
          </div>
        </Field>
        <ChoiceGroup legend={text.mode}>
          {(['native', 'compatible'] as const).map((mode) => (
            <label key={mode} className={`${choiceCard} border-border py-3`}>
              <input
                type="radio"
                name="mode"
                value={mode}
                defaultChecked={values.mode === mode}
                className={choiceInput}
              />
              <span className="flex flex-col">
                {text.modes[mode]}
                <span className="text-sm text-text-muted">{text.modeHints[mode]}</span>
              </span>
            </label>
          ))}
        </ChoiceGroup>
      </section>

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
