'use client';

import { useActionState, useEffect, useId, useState } from 'react';

import type { Messages } from '@miluca/i18n';

import { FormSubmitActions } from '@/components/form-actions';
import { ChoiceGroup, describedBy, Field } from '@/components/form-field';
import { choiceCard, choiceInput, textField } from '@/components/ui-classes';
import { useUnsavedWarning } from '@/components/use-unsaved-warning';

import type { RiskProfileState } from './actions';
import type { CapacityChoice, RiskValues } from './validation';

/** Textos del formulario, ya en el trato de quien lo usa. */
export interface RiskProfileFormText {
  readonly dropReaction: string;
  readonly dropReactions: Readonly<Record<string, string>>;
  readonly experience: string;
  readonly experiences: Readonly<Record<string, string>>;
  readonly horizon: string;
  readonly horizonHint: string;
  readonly horizons: Readonly<Record<string, string>>;
  readonly unanswered: string;
  readonly advisorTitle: string;
  readonly variableIncome: string;
  readonly dependents: string;
  readonly yes: string;
  readonly no: string;
  readonly rangePosition: string;
  readonly rangePositionHint: string;
  readonly submit: string;
  readonly submitting: string;
  readonly cancel: string;
  readonly errors: Messages['investment']['riskForm']['errors'];
}

/** Una pregunta de opción única que se puede dejar sin responder. */
function Question({
  name,
  legend,
  hint,
  options,
  value,
  unanswered,
}: {
  name: string;
  legend: string;
  hint?: string;
  options: Readonly<Record<string, string>>;
  value: string;
  unanswered: string;
}) {
  return (
    <ChoiceGroup legend={legend} {...(hint ? { hint } : {})}>
      {[...Object.entries(options), ['', unanswered] as const].map(([code, label]) => (
        <label key={code || 'none'} className={`${choiceCard} border-border`}>
          <input
            type="radio"
            name={name}
            value={code}
            defaultChecked={value === code}
            className={choiceInput}
          />
          {label}
        </label>
      ))}
    </ChoiceGroup>
  );
}

/**
 * Perfil de riesgo: las tres preguntas del cliente y, para el asesor, dos condiciones de capacidad
 * (vacía es la sugerida) y la posición en el rango.
 */
export function RiskProfileForm({
  text,
  advisor,
  initial,
  action,
  cancelHref,
}: {
  text: RiskProfileFormText;
  /** Lo sugerido de cada condición ("Sí" o "No"); null si quien edita es el cliente. */
  advisor: { readonly variableIncome: string; readonly dependents: string } | null;
  initial: RiskValues;
  action: (previous: RiskProfileState | null, formData: FormData) => Promise<RiskProfileState>;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const values = state?.values ?? initial;
  const errors = state?.errors ?? {};
  const formId = useId();
  const positionId = `${formId}-rangePosition`;
  const [dirty, setDirty] = useState(false);
  useUnsavedWarning(dirty, pending);

  useEffect(() => {
    if (state?.errors.rangePosition) document.getElementById(positionId)?.focus();
  }, [state, positionId]);

  const capacityOptions = (suggested: string): Readonly<Record<CapacityChoice, string>> => ({
    '': suggested,
    si: text.yes,
    no: text.no,
  });

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

      <Question
        name="dropReaction"
        legend={text.dropReaction}
        options={text.dropReactions}
        value={values.dropReaction}
        unanswered={text.unanswered}
      />
      <Question
        name="experience"
        legend={text.experience}
        options={text.experiences}
        value={values.experience}
        unanswered={text.unanswered}
      />
      <Question
        name="horizon"
        legend={text.horizon}
        hint={text.horizonHint}
        options={text.horizons}
        value={values.horizon}
        unanswered={text.unanswered}
      />

      {advisor ? (
        <section aria-labelledby={`${formId}-advisor`} className="flex flex-col gap-6">
          <h2 id={`${formId}-advisor`} className="font-semibold">
            {text.advisorTitle}
          </h2>
          {(
            [
              ['variableIncome', text.variableIncome, advisor.variableIncome],
              ['dependents', text.dependents, advisor.dependents],
            ] as const
          ).map(([name, legend, suggested]) => (
            <ChoiceGroup key={name} legend={legend}>
              {Object.entries(capacityOptions(suggested)).map(([code, label]) => (
                <label key={code || 'none'} className={`${choiceCard} border-border`}>
                  <input
                    type="radio"
                    name={name}
                    value={code}
                    defaultChecked={values[name] === code}
                    className={choiceInput}
                  />
                  {label}
                </label>
              ))}
            </ChoiceGroup>
          ))}
          <Field
            id={positionId}
            label={text.rangePosition}
            hint={text.rangePositionHint}
            error={errors.rangePosition ? text.errors[errors.rangePosition] : null}
          >
            <input
              id={positionId}
              name="rangePosition"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              defaultValue={values.rangePosition}
              aria-invalid={errors.rangePosition ? true : false}
              aria-describedby={describedBy(positionId, true)}
              className={`${textField} text-right tabular-nums`}
            />
          </Field>
        </section>
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
