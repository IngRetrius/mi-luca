import Link from 'next/link';

import { focusRing } from '@/components/ui-classes';
import { getMessages } from '@/server/i18n';

import { setStepSkipped } from './actions';
import { StepSkip } from './step-skip';
import { NAV_FORWARD } from '@/components/page-transition';

export interface StepItem {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  /** Hecho con los datos u omitido por el asesor. */
  readonly done: boolean;
  /** Hecho solo porque el asesor lo omitió (ADR 0029). */
  readonly skipped: boolean;
  /** Paso opcional: sin datos, el asesor lo omite o deshace la omisión. */
  readonly skippable: boolean;
}

export const doneIcon = (
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
 * el color (WCAG 1.4.1). Un paso omitido cuenta como hecho; los opcionales llevan al lado el botón
 * de omitir o de deshacer.
 */
export async function StepList({
  clientId,
  steps,
}: {
  clientId: string;
  steps: readonly StepItem[];
}) {
  const text = (await getMessages()).stages;
  return (
    <ol className="flex flex-col divide-y divide-border rounded-xl border border-border">
      {steps.map((step) => (
        <li key={step.id} className="flex items-center">
          <Link
            href={step.href}
            transitionTypes={NAV_FORWARD}
            className={`flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-xl px-4 py-3 hover:bg-surface ${focusRing}`}
          >
            {step.done ? doneIcon : pendingIcon}
            {/* En 320 px, con el botón de omitir al lado, el estado baja debajo del paso. */}
            <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3">
              <span className="min-w-0 grow basis-32">{step.label}</span>
              <span className="text-sm text-text-muted">
                {step.skipped ? text.stepSkipped : step.done ? text.stepDone : text.stepPending}
              </span>
            </span>
          </Link>
          {step.skippable && (!step.done || step.skipped) ? (
            <StepSkip
              action={setStepSkipped.bind(null, clientId, step.id, !step.skipped)}
              label={step.skipped ? text.undoSkip : text.skip}
              stepLabel={step.label}
              pendingLabel={text.skipping}
              errorText={text.skipError}
            />
          ) : null}
        </li>
      ))}
    </ol>
  );
}
