'use client';

import { useFormStatus } from 'react-dom';

import { primaryButton } from '@/components/ui-classes';

/**
 * Botón de envío de un formulario de servidor sin estado propio: se desactiva y cambia el texto
 * mientras la acción corre, para que un segundo toque no la repita.
 */
export function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`w-full ${primaryButton}`}>
      {pending ? pendingLabel : label}
    </button>
  );
}
