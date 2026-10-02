'use client';

import { useActionState, useEffect, useId } from 'react';

import type { QcCode } from '@miluca/engine';
import type { Messages } from '@miluca/i18n';

import { FormSubmitActions } from '@/components/form-actions';
import { describedBy, Field } from '@/components/form-field';
import { textField } from '@/components/ui-classes';

import type { DeliveryState } from './actions';
import { LABEL_MAX, NOTE_MAX } from './validation';

/** Un control que pide (o admite) una nota, con su mensaje ya resuelto en el servidor. */
export interface NoteRequest {
  readonly code: QcCode;
  readonly message: string;
  readonly required: boolean;
}

/** P-A14: nombre de la versión y notas de los puntos que las piden; luego, entregar. */
export function DeliveryForm({
  text,
  defaultLabel,
  notes,
  action,
  cancelHref,
}: {
  text: Messages['delivery']['form'];
  defaultLabel: string;
  notes: readonly NoteRequest[];
  action: (previous: DeliveryState | null, formData: FormData) => Promise<DeliveryState>;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const errors = state?.errors ?? {};
  const formId = useId();
  const labelId = `${formId}-label`;

  useEffect(() => {
    if (!state) return;
    const first = ['label' as const, ...notes.map((note) => note.code)].find(
      (field) => state.errors[field],
    );
    if (first) document.getElementById(`${formId}-${first}`)?.focus();
  }, [state, formId, notes]);

  return (
    <form action={formAction} noValidate className="flex flex-1 flex-col gap-6">
      {state?.formError ? (
        <p role="alert" className="rounded-xl border border-status-alert p-4">
          {text.errors[state.formError]}
        </p>
      ) : null}

      <Field
        id={labelId}
        label={text.label}
        hint={text.labelHint}
        error={errors.label ? text.errors[errors.label] : null}
      >
        <input
          id={labelId}
          name="label"
          type="text"
          autoComplete="off"
          maxLength={LABEL_MAX}
          required
          defaultValue={state?.values.label ?? defaultLabel}
          aria-invalid={errors.label ? true : false}
          aria-describedby={describedBy(labelId, true)}
          className={textField}
        />
      </Field>

      {notes.length > 0 ? (
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-1 font-medium">{text.notesTitle}</legend>
          <p className="-mt-3 text-sm text-text-muted">{text.notesHint}</p>
          {notes.map((note) => {
            const id = `${formId}-${note.code}`;
            const error = errors[note.code];
            return (
              <Field
                key={note.code}
                id={id}
                label={text.noteFor.replace('{check}', note.message)}
                error={error ? text.errors[error] : null}
              >
                <textarea
                  id={id}
                  name={`note-${note.code}`}
                  rows={2}
                  autoComplete="off"
                  maxLength={NOTE_MAX}
                  required={note.required}
                  defaultValue={state?.values.notes[note.code] ?? ''}
                  aria-invalid={error ? true : false}
                  aria-describedby={describedBy(id, false)}
                  className={`${textField} py-3`}
                />
              </Field>
            );
          })}
        </fieldset>
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
