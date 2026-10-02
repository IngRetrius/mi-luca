import Link from 'next/link';

import { ScreenActions } from './screen';
import { focusRing, linkButton, primaryButton, secondaryButton, textButton } from './ui-classes';

/**
 * Borrar con confirmación: el botón queda oculto hasta abrir el bloque. Va dentro del formulario y
 * envía a `action` (`formAction`) sin validar los campos.
 */
export function DeleteDisclosure({
  toggle,
  hint,
  confirm,
  action,
}: {
  toggle: string;
  hint: string;
  confirm: string;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <details className="rounded-xl border border-border">
      <summary
        className={`min-h-12 cursor-pointer rounded-xl px-4 py-3 text-status-alert hover:underline ${focusRing}`}
      >
        {toggle}
      </summary>
      <div className="flex flex-col items-start gap-2 px-4 pb-4">
        <p className="text-sm text-text-muted">{hint}</p>
        <button type="submit" formAction={action} formNoValidate className={secondaryButton}>
          {confirm}
        </button>
      </div>
    </details>
  );
}

/** Guardar y Cancelar, fijos abajo al alcance del pulgar. */
export function FormSubmitActions({
  pending,
  submit,
  submitting,
  cancel,
  cancelHref,
}: {
  pending: boolean;
  submit: string;
  submitting: string;
  cancel: string;
  cancelHref: string;
}) {
  return (
    <ScreenActions>
      <button type="submit" disabled={pending} className={`w-full ${primaryButton}`}>
        {pending ? submitting : submit}
      </button>
      <Link href={cancelHref} className={`w-full ${textButton} ${linkButton}`}>
        {cancel}
      </Link>
    </ScreenActions>
  );
}
