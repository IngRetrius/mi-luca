'use client';

import { useFormStatus } from 'react-dom';

import { focusRing } from '@/components/ui-classes';

import type { Decision } from './scenario';

/**
 * La decisión del cliente sobre un ajuste: tres botones que se envían con el formulario de la fila.
 * El que está activo lleva `aria-pressed`; mientras se guarda, ninguno responde a un segundo toque.
 */
export function DecisionButtons({
  current,
  labels,
  label,
  describedBy,
}: {
  current: Decision;
  labels: Readonly<Record<Decision, string>>;
  /** Nombre del grupo, para el lector de pantalla ("Decisión del cliente"). */
  label: string;
  /** Id del texto de la fila: dice sobre qué ajuste se decide. */
  describedBy: string;
}) {
  const { pending } = useFormStatus();
  return (
    <div
      role="group"
      aria-label={label}
      aria-describedby={describedBy}
      className="flex flex-wrap gap-2"
    >
      {(Object.keys(labels) as Decision[]).map((decision) => {
        const active = decision === current;
        return (
          <button
            key={decision}
            type="submit"
            name="decision"
            value={decision}
            disabled={pending}
            aria-pressed={active}
            className={`min-h-12 rounded-xl border px-4 transition-colors disabled:opacity-70 ${
              active
                ? 'border-primary bg-surface font-medium'
                : 'border-border hover:border-text-muted active:border-text'
            } ${focusRing}`}
          >
            {labels[decision]}
          </button>
        );
      })}
    </div>
  );
}
