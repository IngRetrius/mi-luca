'use client';

import { useActionState, useEffect, useId, useState } from 'react';

import type { Messages } from '@miluca/i18n';

import { DeleteDisclosure, FormSubmitActions } from '@/components/form-actions';
import { Checkbox, describedBy, Field } from '@/components/form-field';
import { textField } from '@/components/ui-classes';
import { useUnsavedWarning } from '@/components/use-unsaved-warning';

import type { BankState } from './actions';
import { BANK_NAME_MAX, BANK_NOTE_MAX, type BankField, type BankValues } from './validation';

const FIELD_ORDER: readonly BankField[] = ['name', 'maxPockets', 'note'];

/** Bancos: crear o editar un banco por su nombre, con el límite de bolsillos (RN-073). */
export function BankForm({
  text,
  initial,
  action,
  deleteAction,
  cancelHref,
}: {
  text: Messages['banks']['form'];
  initial: BankValues;
  action: (previous: BankState | null, formData: FormData) => Promise<BankState>;
  deleteAction: ((formData: FormData) => Promise<void>) | null;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const values = state?.values ?? initial;
  const errors = state?.errors ?? {};
  const formId = useId();
  const fieldId = (field: BankField) => `${formId}-${field}`;
  const [dirty, setDirty] = useState(false);
  useUnsavedWarning(dirty, pending);

  useEffect(() => {
    if (!state) return;
    const first = FIELD_ORDER.find((field) => state.errors[field]);
    if (first) document.getElementById(`${formId}-${first}`)?.focus();
  }, [state, formId]);

  const errorText = (field: BankField) => {
    const error = errors[field];
    return error ? text.errors[error] : null;
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

      <Field id={fieldId('name')} label={text.name} hint={text.nameHint} error={errorText('name')}>
        <input
          id={fieldId('name')}
          name="name"
          type="text"
          autoComplete="off"
          maxLength={BANK_NAME_MAX}
          required
          defaultValue={values.name}
          aria-invalid={errors.name ? true : false}
          aria-describedby={describedBy(fieldId('name'), true)}
          className={textField}
        />
      </Field>

      <Field
        id={fieldId('maxPockets')}
        label={text.maxPockets}
        hint={text.maxPocketsHint}
        error={errorText('maxPockets')}
      >
        <input
          id={fieldId('maxPockets')}
          name="maxPockets"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={2}
          defaultValue={values.maxPockets}
          aria-invalid={errors.maxPockets ? true : false}
          aria-describedby={describedBy(fieldId('maxPockets'), true)}
          className={`${textField} max-w-28 text-right tabular-nums`}
        />
      </Field>

      <Checkbox
        name="isRemunerated"
        label={text.isRemunerated}
        hint={text.isRemuneratedHint}
        defaultChecked={values.isRemunerated}
      />

      <Field id={fieldId('note')} label={text.note} error={errorText('note')}>
        <textarea
          id={fieldId('note')}
          name="note"
          rows={2}
          autoComplete="off"
          maxLength={BANK_NOTE_MAX}
          defaultValue={values.note}
          aria-invalid={errors.note ? true : false}
          aria-describedby={describedBy(fieldId('note'), false)}
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
