'use client';

import { useActionState, useEffect, useId, useState } from 'react';

import type { Messages } from '@miluca/i18n';

import { DeleteDisclosure, FormSubmitActions } from '@/components/form-actions';
import { ChoiceGroup, describedBy, Field } from '@/components/form-field';
import { choiceCard, choiceInput, textField } from '@/components/ui-classes';
import { useUnsavedWarning } from '@/components/use-unsaved-warning';

import type { ActionItemState } from './actions';
import { NOTE_MAX, TITLE_MAX, type ActionItemField, type ActionItemValues } from './validation';

const FIELD_ORDER: readonly ActionItemField[] = [
  'title',
  'priority',
  'owner',
  'dueDate',
  'status',
  'note',
];

type Text = Messages['actionPlan'];

/**
 * Crear o editar una tarea. El asesor ve todos los campos; el cliente, el título como texto y solo
 * estado y nota.
 */
export function ActionItemForm({
  text,
  initial,
  advisor,
  action,
  deleteAction,
  cancelHref,
}: {
  text: Pick<Text, 'form' | 'priorities' | 'owners' | 'statuses'>;
  initial: ActionItemValues;
  advisor: boolean;
  action: (previous: ActionItemState | null, formData: FormData) => Promise<ActionItemState>;
  deleteAction: ((formData: FormData) => Promise<void>) | null;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const values = state?.values ?? initial;
  const errors = state?.errors ?? {};
  const formId = useId();
  const fieldId = (field: ActionItemField) => `${formId}-${field}`;
  const [dirty, setDirty] = useState(false);
  useUnsavedWarning(dirty, pending);

  useEffect(() => {
    if (!state) return;
    const first = FIELD_ORDER.find((field) => state.errors[field]);
    if (first) document.getElementById(`${formId}-${first}`)?.focus();
  }, [state, formId]);

  const errorText = (field: ActionItemField) => {
    const error = errors[field];
    return error ? text.form.errors[error] : null;
  };
  const select = (field: 'priority' | 'owner', options: Readonly<Record<string, string>>) => (
    <Field id={fieldId(field)} label={text.form[field]} error={errorText(field)}>
      <select
        id={fieldId(field)}
        name={field}
        defaultValue={values[field]}
        aria-invalid={errors[field] ? true : false}
        aria-describedby={describedBy(fieldId(field), false)}
        className={textField}
      >
        {Object.entries(options).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </Field>
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
          {text.form.errors[state.formError]}
        </p>
      ) : null}

      {advisor ? (
        <>
          <Field id={fieldId('title')} label={text.form.title} error={errorText('title')}>
            <textarea
              id={fieldId('title')}
              name="title"
              rows={2}
              maxLength={TITLE_MAX}
              required
              defaultValue={values.title}
              aria-invalid={errors.title ? true : false}
              aria-describedby={describedBy(fieldId('title'), false)}
              className={`${textField} py-3`}
            />
          </Field>
          {select('priority', text.priorities)}
          {select('owner', text.owners)}
          <Field id={fieldId('dueDate')} label={text.form.dueDate} error={errorText('dueDate')}>
            <input
              id={fieldId('dueDate')}
              name="dueDate"
              type="date"
              defaultValue={values.dueDate}
              aria-invalid={errors.dueDate ? true : false}
              aria-describedby={describedBy(fieldId('dueDate'), false)}
              className={textField}
            />
          </Field>
        </>
      ) : null}

      <ChoiceGroup legend={text.form.status}>
        {Object.entries(text.statuses).map(([value, label]) => (
          <label key={value} className={choiceCard}>
            <input
              type="radio"
              name="status"
              value={value}
              defaultChecked={values.status === value}
              className={choiceInput}
            />
            {label}
          </label>
        ))}
      </ChoiceGroup>

      <Field
        id={fieldId('note')}
        label={text.form.note}
        hint={text.form.noteHint}
        error={errorText('note')}
      >
        <textarea
          id={fieldId('note')}
          name="note"
          rows={3}
          maxLength={NOTE_MAX}
          defaultValue={values.note}
          aria-invalid={errors.note ? true : false}
          aria-describedby={describedBy(fieldId('note'), true)}
          className={`${textField} py-3`}
        />
      </Field>

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
