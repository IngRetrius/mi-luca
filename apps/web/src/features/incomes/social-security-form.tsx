'use client';

import { useActionState, useState } from 'react';

import type { Messages } from '@miluca/i18n';

import { FormSubmitActions } from '@/components/form-actions';
import { useUnsavedWarning } from '@/components/use-unsaved-warning';

import type { SocialSecurityState } from './actions';

/** Meses con seguridad social (RN-021): una casilla por mes. */
export function SocialSecurityForm({
  text,
  months,
  initial,
  action,
  cancelHref,
}: {
  text: Messages['incomes']['socialSecurity'];
  months: { readonly long: readonly string[] };
  initial: readonly number[];
  action: (
    previous: SocialSecurityState | null,
    formData: FormData,
  ) => Promise<SocialSecurityState>;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [dirty, setDirty] = useState(false);
  useUnsavedWarning(dirty, pending);
  const checked = state?.months ?? initial;

  return (
    <form
      action={formAction}
      onChange={() => setDirty(true)}
      className="flex flex-1 flex-col gap-6"
    >
      {state?.formError ? (
        <p role="alert" className="rounded-xl border border-status-alert p-4">
          {text.errors[state.formError]}
        </p>
      ) : null}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-medium">{text.legend}</legend>
        <div className="grid grid-cols-2 gap-x-4 sm:grid-cols-3">
          {months.long.map((month, index) => (
            <label key={month} className="flex min-h-12 cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                name={`month-${index}`}
                defaultChecked={(checked[index] ?? 0) > 0}
                className="size-5 shrink-0 accent-primary"
              />
              <span className="first-letter:uppercase">{month}</span>
            </label>
          ))}
        </div>
      </fieldset>
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
