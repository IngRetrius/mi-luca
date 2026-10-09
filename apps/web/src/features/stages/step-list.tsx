import Link from 'next/link';

import { focusRing } from '@/components/ui-classes';

export interface StepItem {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly done: boolean;
}

const doneIcon = (
  <svg
    aria-hidden="true"
    viewBox="0 0 20 20"
    className="size-5 shrink-0 text-status-ok"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="10" cy="10" r="7.5" />
    <path d="m6.5 10.25 2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const pendingIcon = (
  <svg
    aria-hidden="true"
    viewBox="0 0 20 20"
    className="size-5 shrink-0 text-text-muted"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="10" cy="10" r="7.5" />
  </svg>
);

/**
 * Pasos de una etapa en orden, cada uno con su pantalla. El estado va en texto además del icono y
 * el color (WCAG 1.4.1).
 */
export function StepList({
  steps,
  doneLabel,
  pendingLabel,
}: {
  steps: readonly StepItem[];
  doneLabel: string;
  pendingLabel: string;
}) {
  return (
    <ol className="flex flex-col divide-y divide-border rounded-xl border border-border">
      {steps.map((step) => (
        <li key={step.id}>
          <Link
            href={step.href}
            className={`flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 hover:bg-surface ${focusRing}`}
          >
            {step.done ? doneIcon : pendingIcon}
            <span className="min-w-0 flex-1">{step.label}</span>
            <span className="shrink-0 text-sm text-text-muted">
              {step.done ? doneLabel : pendingLabel}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
