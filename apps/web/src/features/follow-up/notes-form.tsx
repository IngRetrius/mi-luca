'use client';

import { useActionState, useEffect, useId, useState } from 'react';

import type { Messages } from '@miluca/i18n';

import { FormSubmitActions } from '@/components/form-actions';
import { ChoiceGroup, describedBy, Field } from '@/components/form-field';
import { choiceCard, choiceInput, textField } from '@/components/ui-classes';
import { useUnsavedWarning } from '@/components/use-unsaved-warning';

import type { NotesState } from './actions';
import { ANSWERS, DECISIONS_MAX, type NotesValues } from './notes';

/** Sucesión y decisiones de la ficha de continuidad (P-A16). */
export function ContinuityNotesForm({
  text,
  initial,
  action,
  cancelHref,
}: {
  text: Messages['followUp']['notesForm'];
  initial: NotesValues;
  action: (previous: NotesState | null, formData: FormData) => Promise<NotesState>;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const values = state?.values ?? initial;
  const formId = useId();
  const decisionsId = `${formId}-decisions`;
  const [dirty, setDirty] = useState(false);
  useUnsavedWarning(dirty, pending);

  useEffect(() => {
    if (state?.errors.decisions) document.getElementById(`${formId}-decisions`)?.focus();
  }, [state, formId]);

  const question = (name: 'hasWill' | 'beneficiariesReviewed', legend: string) => (
    <ChoiceGroup legend={legend}>
      {ANSWERS.map((answer) => (
        <label key={answer} className={choiceCard}>
          <input
            type="radio"
            name={name}
            value={answer}
            defaultChecked={values[name] === answer}
            className={choiceInput}
          />
          {text.options[answer]}
        </label>
      ))}
    </ChoiceGroup>
  );

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

      {question('hasWill', text.will)}
      {question('beneficiariesReviewed', text.beneficiaries)}

      <Field
        id={decisionsId}
        label={text.decisions}
        hint={text.decisionsHint}
        error={state?.errors.decisions ? text.errors.tooLong : null}
      >
        <textarea
          id={decisionsId}
          name="decisions"
          rows={6}
          maxLength={DECISIONS_MAX}
          autoComplete="off"
          defaultValue={values.decisions}
          aria-invalid={state?.errors.decisions ? true : false}
          aria-describedby={describedBy(decisionsId, true)}
          className={`${textField} py-3`}
        />
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
