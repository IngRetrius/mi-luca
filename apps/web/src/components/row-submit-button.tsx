'use client';

import { useFormStatus } from 'react-dom';

import { secondaryButton } from '@/components/ui-classes';

/**
 * Botón de envío dentro de una fila de una lista ("Marcar pagada", "Marcar hecha"): se desactiva
 * mientras la acción corre, para que un segundo toque no la repita.
 */
export function RowSubmitButton({
  label,
  pendingLabel,
  describedBy,
}: {
  label: string;
  pendingLabel: string;
  /** Id del texto de la fila, para que el lector de pantalla diga sobre cuál actúa. */
  describedBy: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-describedby={describedBy}
      className={`${secondaryButton} shrink-0 disabled:opacity-70`}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
