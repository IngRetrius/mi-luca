'use client';

import { useFormStatus } from 'react-dom';

import { secondaryButton } from '@/components/ui-classes';

/** Botón de "Marcar pagada" en la lista de cuotas: se desactiva mientras la acción corre. */
export function MarkPaidButton({
  label,
  pendingLabel,
  describedBy,
}: {
  label: string;
  pendingLabel: string;
  /** Id del texto de la cuota, para que el lector de pantalla diga cuál se marca. */
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
