'use client';

import { useActionState } from 'react';

import type { Messages } from '@miluca/i18n';

import { FormSubmitActions } from '@/components/form-actions';

import type { ApplyState } from './actions';

/** Confirmar "Aplicar lo aceptado": el error, si lo hay, y los botones fijos abajo. */
export function ApplyForm({
  text,
  action,
  cancelHref,
}: {
  text: Pick<Messages['proposal']['applyScreen'], 'submit' | 'submitting' | 'cancel' | 'errors'>;
  action: (previous: ApplyState | null, formData: FormData) => Promise<ApplyState>;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-1 flex-col gap-6">
      {state?.formError ? (
        <p role="alert" className="rounded-xl border border-status-alert p-4">
          {text.errors[state.formError]}
        </p>
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
